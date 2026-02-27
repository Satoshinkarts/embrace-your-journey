
-- Add channel_type to chat_channels
ALTER TABLE public.chat_channels 
  ADD COLUMN IF NOT EXISTS channel_type text NOT NULL DEFAULT 'support',
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS icon text;

-- Make rider_id nullable for shared channels
ALTER TABLE public.chat_channels ALTER COLUMN rider_id DROP NOT NULL;

-- Seed the 4 shared channels (idempotent)
INSERT INTO public.chat_channels (id, rider_id, channel_type, name, description, icon)
VALUES 
  ('00000000-0000-0000-0000-000000000001', NULL, 'shoutouts', 'Shoutouts', 'Public praise and achievements', 'megaphone'),
  ('00000000-0000-0000-0000-000000000002', NULL, 'general', 'General', 'Open chat for all riders and operators', 'message-circle'),
  ('00000000-0000-0000-0000-000000000003', NULL, 'support', 'Support', 'Get help from operators', 'headphones'),
  ('00000000-0000-0000-0000-000000000004', NULL, 'system_logs', 'System Logs', 'Ranking changes and audit events', 'scroll-text')
ON CONFLICT (id) DO NOTHING;

-- Drop existing restrictive policies on chat_channels
DROP POLICY IF EXISTS "Riders can view own channel" ON public.chat_channels;
DROP POLICY IF EXISTS "Riders can create own channel" ON public.chat_channels;
DROP POLICY IF EXISTS "Operators can view all channels" ON public.chat_channels;
DROP POLICY IF EXISTS "Admins full access on channels" ON public.chat_channels;

-- New policies: riders can view shared channels + own support channel
CREATE POLICY "Riders can view shared channels"
  ON public.chat_channels FOR SELECT
  USING (
    has_role(auth.uid(), 'rider'::app_role) 
    AND (rider_id IS NULL OR rider_id = auth.uid())
  );

CREATE POLICY "Operators can view all channels"
  ON public.chat_channels FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins full access on channels"
  ON public.chat_channels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop existing restrictive policies on chat_messages
DROP POLICY IF EXISTS "Riders can view own channel messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Riders can send messages in own channel" ON public.chat_messages;
DROP POLICY IF EXISTS "Riders can edit own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Operators can view all messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Operators can send messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Operators can moderate messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Operators can delete messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins full access on messages" ON public.chat_messages;

-- Riders can view messages in channels they have access to (shared or own)
CREATE POLICY "Riders can view accessible messages"
  ON public.chat_messages FOR SELECT
  USING (
    has_role(auth.uid(), 'rider'::app_role) AND
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND (c.rider_id IS NULL OR c.rider_id = auth.uid())
    )
  );

-- Riders can send messages in shared channels (except system_logs) and own support channel
CREATE POLICY "Riders can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    has_role(auth.uid(), 'rider'::app_role) AND
    EXISTS (
      SELECT 1 FROM chat_channels c
      WHERE c.id = chat_messages.channel_id
        AND (c.rider_id IS NULL OR c.rider_id = auth.uid())
        AND c.channel_type != 'system_logs'
    )
  );

-- Riders can edit own messages
CREATE POLICY "Riders can edit own messages"
  ON public.chat_messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- Operators can view all messages
CREATE POLICY "Operators can view all messages"
  ON public.chat_messages FOR SELECT
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Operators can send messages (including system_logs)
CREATE POLICY "Operators can send messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'operator'::app_role) AND auth.uid() = sender_id
  );

-- Operators can moderate
CREATE POLICY "Operators can moderate messages"
  ON public.chat_messages FOR UPDATE
  USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Operators can delete messages"
  ON public.chat_messages FOR DELETE
  USING (has_role(auth.uid(), 'operator'::app_role));

-- Admins full access
CREATE POLICY "Admins full access on messages"
  ON public.chat_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
