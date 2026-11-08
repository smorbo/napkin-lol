-- Lock down non-API SECURITY DEFINER / helper functions: only the five room RPCs stay callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.is_admitted(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_napkins() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- canvas_objects: members can remove their own drawings
GRANT DELETE ON public.canvas_objects TO authenticated;
CREATE POLICY "Members can delete own canvas objects"
ON public.canvas_objects FOR DELETE TO authenticated
USING (private.is_admitted(room_id) AND user_id = auth.uid());

-- messages: authors can remove their own messages (append-only otherwise)
GRANT DELETE ON public.messages TO authenticated;
CREATE POLICY "Members can delete own messages"
ON public.messages FOR DELETE TO authenticated
USING (private.is_admitted(room_id) AND user_id = auth.uid());

-- room_knocks: visitors can withdraw their own knock
GRANT DELETE ON public.room_knocks TO authenticated;
CREATE POLICY "Visitors can delete own knock"
ON public.room_knocks FOR DELETE TO authenticated
USING (user_id = auth.uid());