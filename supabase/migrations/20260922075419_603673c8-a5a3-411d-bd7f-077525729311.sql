-- Fix shred votes hanging: the public shred wrappers are SECURITY INVOKER, so
-- members also need permission to run the private helpers they call. The private
-- schema is not exposed through the API, and the helpers still verify membership,
-- so this only restores the intended path through the public wrappers.
GRANT EXECUTE ON FUNCTION private.schedule_room_shred(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.execute_room_shred(text, uuid) TO authenticated;

-- Cancelling a shred vote must clear the scheduled shred time, which members
-- cannot edit directly. Do it in one membership-checked helper instead.
CREATE OR REPLACE FUNCTION private.cancel_room_shred(_room_id text, _round uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.rooms
     SET shred_round = NULL, shred_execute_at = NULL
   WHERE id = _room_id AND shred_round = _round;
  DELETE FROM public.shred_votes WHERE room_id = _room_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_room_shred(_room_id text, _round uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public', 'private'
AS $function$
BEGIN
  PERFORM private.cancel_room_shred(_room_id, _round);
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_room_shred(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_room_shred(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.cancel_room_shred(text, uuid) TO authenticated;