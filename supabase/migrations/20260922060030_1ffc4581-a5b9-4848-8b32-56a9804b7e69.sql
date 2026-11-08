CREATE OR REPLACE FUNCTION private.room_knockable(_room_id text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms r
    WHERE r.id = _room_id AND r.is_locked AND NOT r.is_closed AND r.expires_at > now()
  );
$$;

REVOKE ALL ON FUNCTION private.room_knockable(text) FROM public;
GRANT EXECUTE ON FUNCTION private.room_knockable(text) TO authenticated;

DROP POLICY IF EXISTS "Visitors can create own knock" ON public.room_knocks;
CREATE POLICY "Visitors can create own knock" ON public.room_knocks
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND visitor_id = (auth.uid())::text
    AND private.room_knockable(room_id)
  );