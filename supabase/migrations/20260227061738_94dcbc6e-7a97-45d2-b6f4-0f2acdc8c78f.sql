
-- Shoutouts table: Admin/Operator can create shoutouts assigned to riders
CREATE TABLE public.shoutouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  title text NOT NULL,
  message text,
  category text NOT NULL DEFAULT 'recognition',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shoutouts ENABLE ROW LEVEL SECURITY;

-- Only operators/admins can create shoutouts
CREATE POLICY "Operators can create shoutouts"
  ON public.shoutouts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'admin'))
  );

-- Operators/admins can view all shoutouts
CREATE POLICY "Operators can view all shoutouts"
  ON public.shoutouts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'admin'));

-- Riders can view shoutouts assigned to them
CREATE POLICY "Riders can view own shoutouts"
  ON public.shoutouts FOR SELECT TO authenticated
  USING (auth.uid() = assigned_to);

-- Operators/admins can delete shoutouts
CREATE POLICY "Operators can delete shoutouts"
  ON public.shoutouts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'admin'));

-- Allow operators/admins to create new channels
CREATE POLICY "Operators can create channels"
  ON public.chat_channels FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'admin'));

-- Allow operators/admins to delete channels they created (non-default)
CREATE POLICY "Operators can delete channels"
  ON public.chat_channels FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'operator') OR has_role(auth.uid(), 'admin'));

-- Enable realtime for shoutouts
ALTER PUBLICATION supabase_realtime ADD TABLE public.shoutouts;
