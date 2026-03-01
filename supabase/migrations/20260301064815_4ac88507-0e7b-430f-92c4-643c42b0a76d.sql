
-- 1. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, created_at DESC) WHERE read_at IS NULL;

-- Enable realtime for notifications and rides (rider_locations already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- 2. ACCEPT_RIDE FUNCTION WITH ROW-LEVEL LOCKING
CREATE OR REPLACE FUNCTION public.accept_ride(_ride_id uuid, _rider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _distance_km numeric;
  _fare numeric;
BEGIN
  IF auth.uid() != _rider_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF NOT has_role(_rider_id, 'rider') THEN
    RAISE EXCEPTION 'Not a rider';
  END IF;

  PERFORM id FROM rides
    WHERE id = _ride_id AND status = 'requested' AND rider_id IS NULL
    FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT r.distance_km INTO _distance_km FROM rides r WHERE r.id = _ride_id;
  _fare := 40 + COALESCE(_distance_km, 3) * 10;

  UPDATE rides
  SET rider_id = _rider_id, status = 'accepted', fare = ROUND(_fare, 2), updated_at = now()
  WHERE id = _ride_id;

  INSERT INTO notifications (user_id, type, title, body, metadata)
  SELECT customer_id, 'ride_accepted', 'Rider found!', 'A rider has accepted your ride request.',
    jsonb_build_object('ride_id', _ride_id, 'rider_id', _rider_id)
  FROM rides WHERE id = _ride_id;

  RETURN true;
END;
$$;

-- 3. CUSTOMER CAN VIEW RIDER PROFILE DURING ACTIVE RIDE
CREATE POLICY "Customers can view rider profile during ride"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.customer_id = auth.uid()
      AND rides.rider_id = profiles.user_id
      AND rides.status IN ('accepted', 'en_route', 'picked_up')
  )
);

-- 4. CALCULATE DISTANCE ON RIDE CREATION
CREATE OR REPLACE FUNCTION public.calculate_ride_distance()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.pickup_lat IS NOT NULL AND NEW.pickup_lng IS NOT NULL
     AND NEW.dropoff_lat IS NOT NULL AND NEW.dropoff_lng IS NOT NULL THEN
    NEW.distance_km := ROUND(
      (6371 * acos(
        cos(radians(NEW.pickup_lat)) * cos(radians(NEW.dropoff_lat)) *
        cos(radians(NEW.dropoff_lng) - radians(NEW.pickup_lng)) +
        sin(radians(NEW.pickup_lat)) * sin(radians(NEW.dropoff_lat))
      ))::numeric, 2
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER calculate_distance_on_insert
BEFORE INSERT ON public.rides
FOR EACH ROW
EXECUTE FUNCTION public.calculate_ride_distance();
