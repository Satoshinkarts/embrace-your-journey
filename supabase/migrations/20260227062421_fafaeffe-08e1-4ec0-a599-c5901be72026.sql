
-- Add profile customization columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS status_text text,
ADD COLUMN IF NOT EXISTS status_type text NOT NULL DEFAULT 'online';

-- Create avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view avatars
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create DM channels table for direct messages
CREATE TABLE IF NOT EXISTS public.dm_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL,
  user2_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

ALTER TABLE public.dm_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DMs"
ON public.dm_channels FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Authenticated users can create DMs"
ON public.dm_channels FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- DM messages table
CREATE TABLE IF NOT EXISTS public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dm_channel_id uuid NOT NULL REFERENCES public.dm_channels(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own DM messages"
ON public.dm_messages FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.dm_channels dc
  WHERE dc.id = dm_messages.dm_channel_id
  AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
));

CREATE POLICY "Users can send DM messages"
ON public.dm_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.dm_channels dc
    WHERE dc.id = dm_messages.dm_channel_id
    AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
  )
);

-- Enable realtime for DM messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
