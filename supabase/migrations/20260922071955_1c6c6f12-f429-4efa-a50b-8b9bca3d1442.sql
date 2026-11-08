ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS shred_execute_at timestamptz;

CREATE OR REPLACE FUNCTION public.schedule_room_shred(_room_id text, _round uuid)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE
  member_count integer;
  yes_count integer;
  no_count integer;
  execute_at timestamptz;
BEGIN
  IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT shred_execute_at INTO execute_at
  FROM public.rooms
  WHERE id = _room_id AND shred_round = _round AND NOT is_closed AND expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF execute_at IS NOT NULL THEN RETURN execute_at; END IF;

  SELECT count(*) INTO member_count
  FROM public.room_members
  WHERE room_id = _room_id AND admitted AND last_seen_at > now() - interval '2 minutes';

  SELECT count(*) FILTER (WHERE agree), count(*) FILTER (WHERE NOT agree)
  INTO yes_count, no_count
  FROM public.shred_votes
  WHERE room_id = _room_id AND round = _round;

  IF no_count > 0 OR yes_count < GREATEST(member_count, 1) THEN RETURN NULL; END IF;

  execute_at := now() + interval '30 seconds';
  UPDATE public.rooms SET shred_execute_at = execute_at WHERE id = _room_id;
  RETURN execute_at;
END;
$function$;

CREATE OR REPLACE FUNCTION public.execute_room_shred(_room_id text, _round uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM 1 FROM public.rooms
  WHERE id = _room_id
    AND shred_round = _round
    AND shred_execute_at IS NOT NULL
    AND shred_execute_at <= now()
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  DELETE FROM public.canvas_objects WHERE room_id = _room_id;
  DELETE FROM public.shred_votes WHERE room_id = _room_id;
  UPDATE public.rooms
  SET shred_round = NULL, shred_execute_at = NULL
  WHERE id = _room_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.schedule_room_shred(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.schedule_room_shred(text, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.execute_room_shred(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_room_shred(text, uuid) TO authenticated;