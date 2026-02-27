
-- Allow operators to view all ratings (needed for ranking channel review moderation)
CREATE POLICY "Operators can view all ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Allow admins to view all ratings
CREATE POLICY "Admins can view all ratings"
ON public.ratings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
