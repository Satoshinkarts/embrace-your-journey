
-- Wallets table: one per user
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Users can view own wallet
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert own wallet (auto-creation)
CREATE POLICY "Users can insert own wallet"
  ON public.wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins full access
CREATE POLICY "Admins full access on wallets"
  ON public.wallets FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Operators can view all wallets
CREATE POLICY "Operators can view all wallets"
  ON public.wallets FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Wallet transactions ledger
CREATE TABLE public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'credit',
  category text NOT NULL DEFAULT 'general',
  description text,
  reference_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view own transactions
CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Admins full access on transactions
CREATE POLICY "Admins full access on transactions"
  ON public.wallet_transactions FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Operators can view all transactions
CREATE POLICY "Operators can view all transactions"
  ON public.wallet_transactions FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- System can insert transactions (for triggers)
CREATE POLICY "System can insert transactions"
  ON public.wallet_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() = created_by);

-- Updated_at trigger for wallets
CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create wallet on profile creation
CREATE OR REPLACE FUNCTION public.auto_create_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_wallet_on_profile
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_wallet();

-- Auto-credit rider on ride completion
CREATE OR REPLACE FUNCTION public.credit_rider_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id uuid;
  _fare numeric;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.rider_id IS NOT NULL THEN
    _fare := COALESCE(NEW.fare, 0);
    
    -- Get or create wallet
    SELECT id INTO _wallet_id FROM wallets WHERE user_id = NEW.rider_id;
    IF _wallet_id IS NULL THEN
      INSERT INTO wallets (user_id) VALUES (NEW.rider_id) RETURNING id INTO _wallet_id;
    END IF;
    
    -- Credit the rider
    UPDATE wallets SET balance = balance + _fare WHERE id = _wallet_id;
    
    -- Log the transaction
    INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, category, description, reference_id)
    VALUES (_wallet_id, NEW.rider_id, _fare, 'credit', 'ride_earning', 'Ride completion earning', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER credit_rider_on_ride_completion
  AFTER UPDATE ON public.rides
  FOR EACH ROW
  EXECUTE FUNCTION public.credit_rider_on_completion();

-- Admin credit/debit function
CREATE OR REPLACE FUNCTION public.admin_wallet_adjust(
  _target_user_id uuid,
  _amount numeric,
  _type text,
  _category text,
  _description text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet_id uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO _wallet_id FROM wallets WHERE user_id = _target_user_id;
  IF _wallet_id IS NULL THEN
    INSERT INTO wallets (user_id) VALUES (_target_user_id) RETURNING id INTO _wallet_id;
  END IF;

  IF _type = 'credit' THEN
    UPDATE wallets SET balance = balance + _amount WHERE id = _wallet_id;
  ELSIF _type = 'debit' THEN
    UPDATE wallets SET balance = balance - _amount WHERE id = _wallet_id;
  ELSE
    RAISE EXCEPTION 'Invalid type: must be credit or debit';
  END IF;

  INSERT INTO wallet_transactions (wallet_id, user_id, amount, type, category, description, created_by)
  VALUES (_wallet_id, _target_user_id, _amount, _type, _category, COALESCE(_description, _type || ' by admin'), auth.uid());

  RETURN true;
END;
$$;
