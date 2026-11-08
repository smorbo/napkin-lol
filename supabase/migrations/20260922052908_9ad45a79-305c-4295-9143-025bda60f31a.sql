-- Prevent members from tampering with the 24h self-destruct timer or force-closing a room
REVOKE UPDATE ON public.rooms FROM authenticated;
GRANT UPDATE (board_theme, is_locked, shred_round, close_round) ON public.rooms TO authenticated;

-- Server-validated close: requires admission and a unanimous close vote
CREATE OR REPLACE FUNCTION public.close_napkin(_room_id text, _round uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE member_count integer; yes_count integer; no_count integer;
BEGIN
  IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM 1 FROM public.rooms WHERE id = _room_id AND close_round = _round AND NOT is_closed FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO member_count FROM public.room_members WHERE room_id = _room_id AND admitted;
  SELECT count(*) FILTER (WHERE agree), count(*) FILTER (WHERE NOT agree) INTO yes_count, no_count
    FROM public.close_votes WHERE room_id = _room_id AND round = _round;
  IF no_count > 0 OR yes_count < GREATEST(member_count, 1) THEN RETURN false; END IF;
  DELETE FROM public.close_votes WHERE room_id = _room_id;
  UPDATE public.rooms SET is_closed = true, close_round = NULL WHERE id = _room_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.close_napkin(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_napkin(text, uuid) TO authenticated;