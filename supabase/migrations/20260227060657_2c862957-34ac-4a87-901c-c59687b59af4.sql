
-- Rider location tracking
CREATE TABLE public.rider_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL UNIQUE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

-- Riders can upsert their own location
CREATE POLICY "Riders can upsert own location"
  ON public.rider_locations FOR ALL
  USING (auth.uid() = rider_id)
  WITH CHECK (auth.uid() = rider_id);

-- Operators can view all rider locations
CREATE POLICY "Operators can view all locations"
  ON public.rider_locations FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Dispatchers can view all rider locations
CREATE POLICY "Dispatchers can view all locations"
  ON public.rider_locations FOR SELECT
  USING (has_role(auth.uid(), 'dispatcher'::app_role));

-- Admins full access
CREATE POLICY "Admins full access on locations"
  ON public.rider_locations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for rider_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.rider_locations;

-- Dispatch directives (operator sends rider to a location)
CREATE TABLE public.dispatch_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL,
  operator_id uuid NOT NULL,
  destination_address text NOT NULL,
  destination_lat double precision,
  destination_lng double precision,
  instructions text,
  status text NOT NULL DEFAULT 'pending', -- pending, acknowledged, completed, cancelled
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz
);

ALTER TABLE public.dispatch_directives ENABLE ROW LEVEL SECURITY;

-- Riders can view their own directives
CREATE POLICY "Riders can view own directives"
  ON public.dispatch_directives FOR SELECT
  USING (auth.uid() = rider_id);

-- Riders can update own directives (acknowledge/complete)
CREATE POLICY "Riders can update own directives"
  ON public.dispatch_directives FOR UPDATE
  USING (auth.uid() = rider_id);

-- Operators can create directives
CREATE POLICY "Operators can create directives"
  ON public.dispatch_directives FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'operator'::app_role) AND auth.uid() = operator_id);

-- Operators can view all directives
CREATE POLICY "Operators can view all directives"
  ON public.dispatch_directives FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Operators can update directives (cancel)
CREATE POLICY "Operators can update directives"
  ON public.dispatch_directives FOR UPDATE
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Admins full access
CREATE POLICY "Admins full access on directives"
  ON public.dispatch_directives FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for dispatch_directives
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_directives;

-- Trigger to auto-update updated_at on rider_locations
CREATE TRIGGER update_rider_locations_updated_at
  BEFORE UPDATE ON public.rider_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
