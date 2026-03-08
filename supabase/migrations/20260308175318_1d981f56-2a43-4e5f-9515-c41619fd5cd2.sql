
-- Fix: The "Customers can cancel own rides" policy has no WITH CHECK,
-- so it defaults to USING (status = 'requested'), which rejects the update to 'cancelled'.
-- Drop and recreate with explicit WITH CHECK allowing cancelled status.

DROP POLICY IF EXISTS "Customers can cancel own rides" ON public.rides;

CREATE POLICY "Customers can cancel own rides"
ON public.rides
FOR UPDATE
TO authenticated
USING (auth.uid() = customer_id AND status = 'requested'::ride_status)
WITH CHECK (auth.uid() = customer_id AND status = 'cancelled'::ride_status);
