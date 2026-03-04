-- Allow customers to view their assigned rider's location during an active ride
CREATE POLICY "Customers can view rider location during active ride"
ON public.rider_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM rides
    WHERE rides.customer_id = auth.uid()
      AND rides.rider_id = rider_locations.rider_id
      AND rides.status IN ('accepted', 'en_route', 'picked_up')
  )
);