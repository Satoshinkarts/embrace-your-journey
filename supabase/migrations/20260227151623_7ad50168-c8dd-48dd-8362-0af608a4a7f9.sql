-- Allow users to update read_at on DM messages in their channels
CREATE POLICY "Users can mark DM messages as read"
ON public.dm_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM dm_channels dc
    WHERE dc.id = dm_messages.dm_channel_id
    AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM dm_channels dc
    WHERE dc.id = dm_messages.dm_channel_id
    AND (dc.user1_id = auth.uid() OR dc.user2_id = auth.uid())
  )
);