
-- ═══════════════════════════════════════════════════════
-- Chat Channels: one private channel per rider
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rider_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Rider sees only their own channel
CREATE POLICY "Riders can view own channel"
ON public.chat_channels FOR SELECT TO authenticated
USING (auth.uid() = rider_id);

-- Rider can create their own channel
CREATE POLICY "Riders can create own channel"
ON public.chat_channels FOR INSERT TO authenticated
WITH CHECK (auth.uid() = rider_id AND has_role(auth.uid(), 'rider'::app_role));

-- Operators can view all channels
CREATE POLICY "Operators can view all channels"
ON public.chat_channels FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Admins can do everything on channels
CREATE POLICY "Admins full access on channels"
ON public.chat_channels FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ═══════════════════════════════════════════════════════
-- Chat Messages
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL DEFAULT 'rider',
  message_type text NOT NULL DEFAULT 'text',
  content text,
  image_url text,
  image_metadata jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX idx_chat_messages_channel_id ON public.chat_messages(channel_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_sender_id ON public.chat_messages(sender_id);

-- Rider can view messages in their own channel only
CREATE POLICY "Riders can view own channel messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.chat_channels
    WHERE id = chat_messages.channel_id AND rider_id = auth.uid()
  )
);

-- Rider can insert messages into their own channel
CREATE POLICY "Riders can send messages in own channel"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND sender_role = 'rider'
  AND EXISTS (
    SELECT 1 FROM public.chat_channels
    WHERE id = chat_messages.channel_id AND rider_id = auth.uid()
  )
);

-- Rider can soft-delete own messages (update deleted_at)
CREATE POLICY "Riders can edit own messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (auth.uid() = sender_id);

-- Operators can view all messages
CREATE POLICY "Operators can view all messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Operators can send messages to any channel
CREATE POLICY "Operators can send messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'operator'::app_role)
  AND auth.uid() = sender_id
  AND sender_role = 'operator'
);

-- Operators can moderate (update) any message
CREATE POLICY "Operators can moderate messages"
ON public.chat_messages FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Operators can delete messages
CREATE POLICY "Operators can delete messages"
ON public.chat_messages FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

-- Admins full access on messages
CREATE POLICY "Admins full access on messages"
ON public.chat_messages FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- ═══════════════════════════════════════════════════════
-- Audit Logs
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.channel_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.channel_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_audit_logs_actor ON public.channel_audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.channel_audit_logs(created_at DESC);

-- Only operators and admins can view audit logs
CREATE POLICY "Operators can view audit logs"
ON public.channel_audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'operator'::app_role));

CREATE POLICY "Admins can view audit logs"
ON public.channel_audit_logs FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- System inserts (via trigger) - allow authenticated to insert for triggers
CREATE POLICY "System can insert audit logs"
ON public.channel_audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id);

-- ═══════════════════════════════════════════════════════
-- Audit trigger: log message edits and deletions
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_chat_message_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      INSERT INTO public.channel_audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
      VALUES (auth.uid(), 'unknown', 'message_deleted', 'chat_message', NEW.id,
        jsonb_build_object('channel_id', NEW.channel_id, 'original_content', OLD.content));
    ELSIF NEW.edited_at IS NOT NULL AND OLD.edited_at IS NULL THEN
      INSERT INTO public.channel_audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
      VALUES (auth.uid(), 'unknown', 'message_edited', 'chat_message', NEW.id,
        jsonb_build_object('channel_id', NEW.channel_id, 'old_content', OLD.content, 'new_content', NEW.content));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.channel_audit_logs (actor_id, actor_role, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'unknown', 'message_hard_deleted', 'chat_message', OLD.id,
      jsonb_build_object('channel_id', OLD.channel_id, 'content', OLD.content));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_chat_messages
AFTER UPDATE OR DELETE ON public.chat_messages
FOR EACH ROW EXECUTE FUNCTION public.audit_chat_message_changes();

-- ═══════════════════════════════════════════════════════
-- Auto-create channel for rider function
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_or_create_rider_channel(_rider_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _channel_id uuid;
BEGIN
  -- RBAC: caller must be the rider, operator, or admin
  IF auth.uid() != _rider_id
     AND NOT has_role(auth.uid(), 'operator')
     AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT id INTO _channel_id FROM public.chat_channels WHERE rider_id = _rider_id;
  
  IF _channel_id IS NULL THEN
    INSERT INTO public.chat_channels (rider_id) VALUES (_rider_id)
    RETURNING id INTO _channel_id;
  END IF;
  
  RETURN _channel_id;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- Enable realtime for chat messages
-- ═══════════════════════════════════════════════════════
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ═══════════════════════════════════════════════════════
-- Storage bucket for chat images
-- ═══════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false);

-- Storage RLS: riders can upload to their channel folder
CREATE POLICY "Riders can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Riders can view their own images
CREATE POLICY "Riders can view own chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Operators can view all chat images
CREATE POLICY "Operators can view all chat images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-images'
  AND has_role(auth.uid(), 'operator'::app_role)
);

-- Admins can do everything on chat images
CREATE POLICY "Admins full access chat images"
ON storage.objects FOR ALL TO authenticated
USING (
  bucket_id = 'chat-images'
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Operators can upload to any folder
CREATE POLICY "Operators can upload chat images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-images'
  AND has_role(auth.uid(), 'operator'::app_role)
);
