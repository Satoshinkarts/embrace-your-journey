
-- Fix notifications INSERT policy to only allow from security definer functions
-- Drop the permissive policy and replace with one that requires authenticated context
DROP POLICY "System can insert notifications" ON public.notifications;

-- Notifications are only inserted by SECURITY DEFINER functions (accept_ride, etc.)
-- so we restrict direct inserts while allowing the definer functions to work
CREATE POLICY "Authenticated users can insert own notifications"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() = user_id);
