ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.heartbeat_member(_room_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  UPDATE public.room_members SET last_seen_at = now()
  WHERE room_id = _room_id AND user_id = auth.uid();
END;
$function$;

REVOKE ALL ON FUNCTION public.heartbeat_member(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.heartbeat_member(text) TO authenticated;

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
  SELECT count(*) INTO member_count FROM public.room_members
    WHERE room_id = _room_id AND admitted AND last_seen_at > now() - interval '2 minutes';
  SELECT count(*) FILTER (WHERE agree), count(*) FILTER (WHERE NOT agree) INTO yes_count, no_count
    FROM public.close_votes WHERE room_id = _room_id AND round = _round;
  IF no_count > 0 OR yes_count < GREATEST(member_count, 1) THEN RETURN false; END IF;
  DELETE FROM public.close_votes WHERE room_id = _room_id;
  UPDATE public.rooms SET is_closed = true, close_round = NULL WHERE id = _room_id;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.execute_room_shred(_room_id text, _round uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
DECLARE member_count integer; yes_count integer; no_count integer;
BEGIN
  IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM 1 FROM public.rooms WHERE id = _room_id AND shred_round = _round FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO member_count FROM public.room_members
    WHERE room_id = _room_id AND admitted AND last_seen_at > now() - interval '2 minutes';
  SELECT count(*) FILTER (WHERE agree), count(*) FILTER (WHERE NOT agree) INTO yes_count, no_count
    FROM public.shred_votes WHERE room_id = _room_id AND round = _round;
  IF no_count > 0 OR yes_count < GREATEST(member_count, 1) THEN RETURN false; END IF;
  DELETE FROM public.canvas_objects WHERE room_id = _room_id;
  DELETE FROM public.shred_votes WHERE room_id = _room_id;
  UPDATE public.rooms SET shred_round = NULL WHERE id = _room_id;
  RETURN true;
END;
$function$;