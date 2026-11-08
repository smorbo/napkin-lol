-- lovable-cron-fallback-reviewed: exact 24-hour deletion requires a minute-level SQL cleanup because no delayed per-room workflow is available
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.room_members ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.room_knocks ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.canvas_objects ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.shred_votes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.close_votes ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.room_members ADD CONSTRAINT room_members_name_length CHECK (char_length(display_name) BETWEEN 1 AND 40) NOT VALID;
ALTER TABLE public.room_knocks ADD CONSTRAINT room_knocks_name_length CHECK (char_length(visitor_name) BETWEEN 1 AND 40) NOT VALID;
ALTER TABLE public.messages ADD CONSTRAINT messages_body_length CHECK (char_length(body) BETWEEN 1 AND 4000) NOT VALID;
ALTER TABLE public.canvas_objects ADD CONSTRAINT canvas_payload_size CHECK (pg_column_size(payload) <= 262144) NOT VALID;
CREATE UNIQUE INDEX IF NOT EXISTS room_members_room_user_unique ON public.room_members(room_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS room_knocks_room_user_unique ON public.room_knocks(room_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS shred_votes_room_round_user_unique ON public.shred_votes(room_id, round, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS close_votes_room_round_user_unique ON public.close_votes(room_id, round, user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.is_admitted(_room_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members m JOIN public.rooms r ON r.id = m.room_id
    WHERE m.room_id = _room_id AND m.user_id = auth.uid() AND m.admitted
      AND NOT r.is_closed AND r.expires_at > now()
  );
$$;
REVOKE ALL ON FUNCTION public.is_admitted(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admitted(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_napkin(_room_id text, _name text, _color text)
RETURNS public.rooms LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE created public.rooms;
BEGIN
  IF auth.uid() IS NULL OR _room_id !~ '^[A-Z]{4}[0-9]{3}$' OR char_length(trim(_name)) NOT BETWEEN 1 AND 40 THEN
    RAISE EXCEPTION 'Invalid room request';
  END IF;
  INSERT INTO public.rooms(id) VALUES (_room_id) RETURNING * INTO created;
  INSERT INTO public.room_members(room_id, visitor_id, user_id, display_name, color, admitted)
  VALUES (_room_id, auth.uid()::text, auth.uid(), trim(_name), _color, true);
  RETURN created;
END;
$$;
REVOKE ALL ON FUNCTION public.create_napkin(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_napkin(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.enter_napkin(_room_id text, _name text, _color text)
RETURNS TABLE(id text, expires_at timestamptz, board_theme text, shred_round uuid, is_locked boolean, is_closed boolean, close_round uuid, admitted boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target public.rooms; allowed boolean;
BEGIN
  IF auth.uid() IS NULL OR char_length(trim(_name)) NOT BETWEEN 1 AND 40 THEN RAISE EXCEPTION 'Invalid visitor'; END IF;
  SELECT * INTO target FROM public.rooms r WHERE r.id = upper(_room_id) AND r.expires_at > now();
  IF target.id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(m.admitted, NOT target.is_locked) INTO allowed FROM public.room_members m
    WHERE m.room_id = target.id AND m.user_id = auth.uid();
  allowed := COALESCE(allowed, NOT target.is_locked);
  INSERT INTO public.room_members(room_id, visitor_id, user_id, display_name, color, admitted)
    VALUES(target.id, auth.uid()::text, auth.uid(), trim(_name), _color, allowed)
    ON CONFLICT (room_id, user_id) WHERE user_id IS NOT NULL DO UPDATE
      SET display_name = EXCLUDED.display_name, color = EXCLUDED.color, updated_at = now();
  RETURN QUERY SELECT target.id, target.expires_at, target.board_theme, target.shred_round, target.is_locked, target.is_closed, target.close_round, allowed;
END;
$$;
REVOKE ALL ON FUNCTION public.enter_napkin(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enter_napkin(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_room_knock(_room_id text, _user_id uuid, _admit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.room_knocks SET status = CASE WHEN _admit THEN 'admitted' ELSE 'declined' END WHERE room_id=_room_id AND user_id=_user_id;
  IF _admit THEN UPDATE public.room_members SET admitted=true WHERE room_id=_room_id AND user_id=_user_id; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.answer_room_knock(text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.answer_room_knock(text,uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_member_muted(_room_id text, _user_id uuid, _muted boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE public.room_members SET muted=_muted WHERE room_id=_room_id AND user_id=_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.set_member_muted(text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_member_muted(text,uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.execute_room_shred(_room_id text, _round uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE member_count integer; yes_count integer; no_count integer;
BEGIN
  IF NOT public.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF;
  PERFORM 1 FROM public.rooms WHERE id=_room_id AND shred_round=_round FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT count(*) INTO member_count FROM public.room_members WHERE room_id=_room_id AND admitted;
  SELECT count(*) FILTER (WHERE agree), count(*) FILTER (WHERE NOT agree) INTO yes_count,no_count FROM public.shred_votes WHERE room_id=_room_id AND round=_round;
  IF no_count > 0 OR yes_count < GREATEST(member_count,1) THEN RETURN false; END IF;
  DELETE FROM public.canvas_objects WHERE room_id=_room_id;
  DELETE FROM public.shred_votes WHERE room_id=_room_id;
  UPDATE public.rooms SET shred_round=NULL WHERE id=_room_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.execute_room_shred(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.execute_room_shred(text,uuid) TO authenticated;

DROP POLICY IF EXISTS "Anyone can read live rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can update live rooms" ON public.rooms;
CREATE POLICY "Members can read active rooms" ON public.rooms FOR SELECT TO authenticated USING (public.is_admitted(id));
CREATE POLICY "Members can update active rooms" ON public.rooms FOR UPDATE TO authenticated USING (public.is_admitted(id)) WITH CHECK (public.is_admitted(id));

DROP POLICY IF EXISTS "Anyone can read messages of live rooms" ON public.messages;
DROP POLICY IF EXISTS "Anyone can post messages to live rooms" ON public.messages;
CREATE POLICY "Members can read messages" ON public.messages FOR SELECT TO authenticated USING (public.is_admitted(room_id));
CREATE POLICY "Members can post own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (public.is_admitted(room_id) AND user_id=auth.uid() AND author_id=auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read canvas of live rooms" ON public.canvas_objects;
DROP POLICY IF EXISTS "Anyone can draw in live rooms" ON public.canvas_objects;
DROP POLICY IF EXISTS "Anyone can edit canvas of live rooms" ON public.canvas_objects;
DROP POLICY IF EXISTS "Anyone can clear canvas of live rooms" ON public.canvas_objects;
CREATE POLICY "Members can read canvas" ON public.canvas_objects FOR SELECT TO authenticated USING (public.is_admitted(room_id));
CREATE POLICY "Members can draw" ON public.canvas_objects FOR INSERT TO authenticated WITH CHECK (public.is_admitted(room_id) AND user_id=auth.uid() AND author_id=auth.uid()::text);
CREATE POLICY "Members can edit shared canvas" ON public.canvas_objects FOR UPDATE TO authenticated USING (public.is_admitted(room_id)) WITH CHECK (public.is_admitted(room_id));

DROP POLICY IF EXISTS "Anyone can join live rooms" ON public.room_members;
DROP POLICY IF EXISTS "Anyone can update members of live rooms" ON public.room_members;
DROP POLICY IF EXISTS "Anyone can view members of live rooms" ON public.room_members;
CREATE POLICY "Members can view room members" ON public.room_members FOR SELECT TO authenticated USING (public.is_admitted(room_id) OR user_id=auth.uid());
CREATE POLICY "Visitors can update own identity" ON public.room_members FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

DROP POLICY IF EXISTS "Anyone can knock on locked live rooms" ON public.room_knocks;
DROP POLICY IF EXISTS "Anyone can view knocks on live rooms" ON public.room_knocks;
DROP POLICY IF EXISTS "Anyone inside can answer knocks" ON public.room_knocks;
CREATE POLICY "Visitors can create own knock" ON public.room_knocks FOR INSERT TO authenticated WITH CHECK (user_id=auth.uid() AND visitor_id=auth.uid()::text AND EXISTS(SELECT 1 FROM public.rooms r WHERE r.id=room_id AND r.is_locked AND NOT r.is_closed AND r.expires_at>now()));
CREATE POLICY "Visitors and members can view knocks" ON public.room_knocks FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_admitted(room_id));
CREATE POLICY "Visitors can refresh own knock" ON public.room_knocks FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid() AND status='pending');

DROP POLICY IF EXISTS "Anyone can read votes of live rooms" ON public.shred_votes;
DROP POLICY IF EXISTS "Anyone can vote in live rooms" ON public.shred_votes;
DROP POLICY IF EXISTS "Anyone can clear votes of live rooms" ON public.shred_votes;
CREATE POLICY "Members can read shred votes" ON public.shred_votes FOR SELECT TO authenticated USING (public.is_admitted(room_id));
CREATE POLICY "Members can cast own shred vote" ON public.shred_votes FOR INSERT TO authenticated WITH CHECK (public.is_admitted(room_id) AND user_id=auth.uid() AND voter_id=auth.uid()::text);
CREATE POLICY "Members can remove own shred vote" ON public.shred_votes FOR DELETE TO authenticated USING (public.is_admitted(room_id) AND user_id=auth.uid());

DROP POLICY IF EXISTS "Anyone can view close votes in live rooms" ON public.close_votes;
DROP POLICY IF EXISTS "Anyone can vote to close live rooms" ON public.close_votes;
DROP POLICY IF EXISTS "Anyone can clear close votes in live rooms" ON public.close_votes;
CREATE POLICY "Members can read close votes" ON public.close_votes FOR SELECT TO authenticated USING (public.is_admitted(room_id));
CREATE POLICY "Members can cast own close vote" ON public.close_votes FOR INSERT TO authenticated WITH CHECK (public.is_admitted(room_id) AND user_id=auth.uid() AND voter_id=auth.uid()::text);
CREATE POLICY "Members can remove own close vote" ON public.close_votes FOR DELETE TO authenticated USING (public.is_admitted(room_id) AND user_id=auth.uid());

DROP POLICY IF EXISTS "Anyone can view room images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload room images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update room images" ON storage.objects;
CREATE POLICY "Members can view room images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='room-uploads' AND public.is_admitted((storage.foldername(name))[1]));
CREATE POLICY "Members can upload room images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='room-uploads' AND public.is_admitted((storage.foldername(name))[1]) AND owner_id=auth.uid()::text);
CREATE POLICY "Upload owners can update room images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='room-uploads' AND owner_id=auth.uid()::text AND public.is_admitted((storage.foldername(name))[1])) WITH CHECK (bucket_id='room-uploads' AND owner_id=auth.uid()::text);

CREATE OR REPLACE FUNCTION public.cleanup_expired_napkins()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,storage AS $$
BEGIN
  DELETE FROM storage.objects o USING public.rooms r WHERE o.bucket_id='room-uploads' AND (storage.foldername(o.name))[1]=r.id AND r.expires_at<=now();
  DELETE FROM public.rooms WHERE expires_at<=now();
END;
$$;
REVOKE ALL ON FUNCTION public.cleanup_expired_napkins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_napkins() TO service_role;
DO $$ BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='napkin-delete-expired-rooms';
EXCEPTION WHEN undefined_table THEN NULL; END $$;
SELECT cron.schedule('napkin-delete-expired-rooms','* * * * *','SELECT public.cleanup_expired_napkins()');