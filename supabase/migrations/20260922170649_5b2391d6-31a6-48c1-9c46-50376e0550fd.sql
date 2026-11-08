CREATE OR REPLACE FUNCTION public.enter_napkin(_room_id text, _name text, _color text)
 RETURNS TABLE(id text, expires_at timestamp with time zone, board_theme text, shred_round uuid, is_locked boolean, is_closed boolean, close_round uuid, admitted boolean)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE target public.rooms; allowed boolean;
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(_name)) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Invalid visitor'; END IF;
  SELECT * INTO target FROM public.rooms r WHERE r.id = upper(_room_id) AND r.expires_at > now();
  IF target.id IS NULL THEN RETURN; END IF;
  IF target.is_closed THEN
    UPDATE public.rooms r SET is_closed = false, close_round = NULL WHERE r.id = target.id;
    DELETE FROM public.close_votes cv WHERE cv.room_id = target.id;
    target.is_closed := false;
    target.close_round := NULL;
  END IF;
  -- Open door always lets you in, even if you were declined earlier.
  SELECT (m.admitted OR NOT target.is_locked) INTO allowed FROM public.room_members m
    WHERE m.room_id = target.id AND m.user_id = auth.uid();
  allowed := COALESCE(allowed, NOT target.is_locked);
  INSERT INTO public.room_members(room_id, visitor_id, user_id, display_name, color, admitted)
    VALUES(target.id, auth.uid()::text, auth.uid(), trim(_name), _color, allowed)
    ON CONFLICT (room_id, user_id) WHERE user_id IS NOT NULL DO UPDATE
      SET display_name = EXCLUDED.display_name, color = EXCLUDED.color, updated_at = now(), last_seen_at = now(),
          admitted = room_members.admitted OR EXCLUDED.admitted;
  IF allowed THEN
    DELETE FROM public.room_knocks k WHERE k.room_id = target.id AND k.user_id = auth.uid();
  END IF;
  RETURN QUERY SELECT target.id, target.expires_at, target.board_theme, target.shred_round, target.is_locked, target.is_closed, target.close_round, allowed;
END;
$function$;