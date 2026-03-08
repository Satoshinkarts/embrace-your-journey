
-- Allow riders to view customer profile during active ride (for chat name display)
CREATE POLICY "Riders can view customer profile during ride"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.rider_id = auth.uid()
      AND rides.customer_id = profiles.user_id
      AND rides.status IN ('accepted', 'en_route', 'picked_up')
  )
);
