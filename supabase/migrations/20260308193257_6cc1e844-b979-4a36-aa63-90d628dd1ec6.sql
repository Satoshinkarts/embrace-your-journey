
-- Allow operators to update rides (for assigning riders)
CREATE POLICY "Operators can update rides"
ON public.rides
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role))
WITH CHECK (has_role(auth.uid(), 'operator'::app_role));

-- RPC for operator to assign a rider to a ride (with notification)
CREATE OR REPLACE FUNCTION public.operator_assign_ride(_ride_id uuid, _rider_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _distance_km numeric;
  _fare numeric;
BEGIN
  -- Must be operator or admin
  IF NOT has_role(auth.uid(), 'operator') AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Lock the ride row
  PERFORM id FROM rides
    WHERE id = _ride_id AND status = 'requested' AND rider_id IS NULL
    FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calculate fare
  SELECT r.distance_km INTO _distance_km FROM rides r WHERE r.id = _ride_id;
  _fare := 40 + COALESCE(_distance_km, 3) * 10;

  -- Assign rider
  UPDATE rides
  SET rider_id = _rider_id, status = 'accepted', fare = ROUND(_fare, 2), updated_at = now()
  WHERE id = _ride_id;

  -- Notify the rider
  INSERT INTO notifications (user_id, type, title, body, metadata)
  VALUES (_rider_id, 'ride_assigned', 'New ride assigned!', 'An operator has assigned you a ride.',
    jsonb_build_object('ride_id', _ride_id));

  -- Notify the customer
  INSERT INTO notifications (user_id, type, title, body, metadata)
  SELECT customer_id, 'ride_accepted', 'Rider found!', 'A rider has been assigned to your ride.',
    jsonb_build_object('ride_id', _ride_id, 'rider_id', _rider_id)
  FROM rides WHERE id = _ride_id;

  RETURN true;
END;
$$;
