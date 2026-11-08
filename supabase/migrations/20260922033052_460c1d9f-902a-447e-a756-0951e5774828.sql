CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
CREATE OR REPLACE FUNCTION private.is_admitted(_room_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members m JOIN public.rooms r ON r.id = m.room_id
    WHERE m.room_id = _room_id AND m.user_id = auth.uid() AND m.admitted
      AND NOT r.is_closed AND r.expires_at > now()
  );
$$;
REVOKE ALL ON FUNCTION private.is_admitted(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_admitted(text) TO authenticated, service_role;

DROP POLICY "Members can read active rooms" ON public.rooms;
DROP POLICY "Members can update active rooms" ON public.rooms;
CREATE POLICY "Members can read active rooms" ON public.rooms FOR SELECT TO authenticated USING (private.is_admitted(id));
CREATE POLICY "Members can update active rooms" ON public.rooms FOR UPDATE TO authenticated USING (private.is_admitted(id)) WITH CHECK (private.is_admitted(id));
DROP POLICY "Members can read messages" ON public.messages;
DROP POLICY "Members can post own messages" ON public.messages;
CREATE POLICY "Members can read messages" ON public.messages FOR SELECT TO authenticated USING (private.is_admitted(room_id));
CREATE POLICY "Members can post own messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (private.is_admitted(room_id) AND user_id=auth.uid() AND author_id=auth.uid()::text);
DROP POLICY "Members can read canvas" ON public.canvas_objects;
DROP POLICY "Members can draw" ON public.canvas_objects;
DROP POLICY "Members can edit shared canvas" ON public.canvas_objects;
CREATE POLICY "Members can read canvas" ON public.canvas_objects FOR SELECT TO authenticated USING (private.is_admitted(room_id));
CREATE POLICY "Members can draw" ON public.canvas_objects FOR INSERT TO authenticated WITH CHECK (private.is_admitted(room_id) AND user_id=auth.uid() AND author_id=auth.uid()::text);
CREATE POLICY "Members can edit shared canvas" ON public.canvas_objects FOR UPDATE TO authenticated USING (private.is_admitted(room_id)) WITH CHECK (private.is_admitted(room_id));
DROP POLICY "Members can view room members" ON public.room_members;
CREATE POLICY "Members can view room members" ON public.room_members FOR SELECT TO authenticated USING (private.is_admitted(room_id) OR user_id=auth.uid());
DROP POLICY "Visitors and members can view knocks" ON public.room_knocks;
CREATE POLICY "Visitors and members can view knocks" ON public.room_knocks FOR SELECT TO authenticated USING (user_id=auth.uid() OR private.is_admitted(room_id));
DROP POLICY "Members can read shred votes" ON public.shred_votes;
DROP POLICY "Members can cast own shred vote" ON public.shred_votes;
DROP POLICY "Members can remove own shred vote" ON public.shred_votes;
CREATE POLICY "Members can read shred votes" ON public.shred_votes FOR SELECT TO authenticated USING (private.is_admitted(room_id));
CREATE POLICY "Members can cast own shred vote" ON public.shred_votes FOR INSERT TO authenticated WITH CHECK (private.is_admitted(room_id) AND user_id=auth.uid() AND voter_id=auth.uid()::text);
CREATE POLICY "Members can remove own shred vote" ON public.shred_votes FOR DELETE TO authenticated USING (private.is_admitted(room_id) AND user_id=auth.uid());
DROP POLICY "Members can read close votes" ON public.close_votes;
DROP POLICY "Members can cast own close vote" ON public.close_votes;
DROP POLICY "Members can remove own close vote" ON public.close_votes;
CREATE POLICY "Members can read close votes" ON public.close_votes FOR SELECT TO authenticated USING (private.is_admitted(room_id));
CREATE POLICY "Members can cast own close vote" ON public.close_votes FOR INSERT TO authenticated WITH CHECK (private.is_admitted(room_id) AND user_id=auth.uid() AND voter_id=auth.uid()::text);
CREATE POLICY "Members can remove own close vote" ON public.close_votes FOR DELETE TO authenticated USING (private.is_admitted(room_id) AND user_id=auth.uid());
DROP POLICY "Members can view room images" ON storage.objects;
DROP POLICY "Members can upload room images" ON storage.objects;
DROP POLICY "Upload owners can update room images" ON storage.objects;
CREATE POLICY "Members can view room images" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='room-uploads' AND private.is_admitted((storage.foldername(name))[1]));
CREATE POLICY "Members can upload room images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='room-uploads' AND private.is_admitted((storage.foldername(name))[1]) AND owner_id=auth.uid()::text);
CREATE POLICY "Upload owners can update room images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='room-uploads' AND owner_id=auth.uid()::text AND private.is_admitted((storage.foldername(name))[1])) WITH CHECK (bucket_id='room-uploads' AND owner_id=auth.uid()::text);

CREATE OR REPLACE FUNCTION public.answer_room_knock(_room_id text, _user_id uuid, _admit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,private AS $$ BEGIN IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF; UPDATE public.room_knocks SET status=CASE WHEN _admit THEN 'admitted' ELSE 'declined' END WHERE room_id=_room_id AND user_id=_user_id; IF _admit THEN UPDATE public.room_members SET admitted=true WHERE room_id=_room_id AND user_id=_user_id; END IF; END; $$;
CREATE OR REPLACE FUNCTION public.set_member_muted(_room_id text, _user_id uuid, _muted boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,private AS $$ BEGIN IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF; UPDATE public.room_members SET muted=_muted WHERE room_id=_room_id AND user_id=_user_id; END; $$;
CREATE OR REPLACE FUNCTION public.execute_room_shred(_room_id text, _round uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public,private AS $$ DECLARE member_count integer; yes_count integer; no_count integer; BEGIN IF NOT private.is_admitted(_room_id) THEN RAISE EXCEPTION 'Forbidden'; END IF; PERFORM 1 FROM public.rooms WHERE id=_room_id AND shred_round=_round FOR UPDATE; IF NOT FOUND THEN RETURN false; END IF; SELECT count(*) INTO member_count FROM public.room_members WHERE room_id=_room_id AND admitted; SELECT count(*) FILTER (WHERE agree),count(*) FILTER (WHERE NOT agree) INTO yes_count,no_count FROM public.shred_votes WHERE room_id=_room_id AND round=_round; IF no_count>0 OR yes_count<GREATEST(member_count,1) THEN RETURN false; END IF; DELETE FROM public.canvas_objects WHERE room_id=_room_id; DELETE FROM public.shred_votes WHERE room_id=_room_id; UPDATE public.rooms SET shred_round=NULL WHERE id=_room_id; RETURN true; END; $$;

REVOKE ALL ON public.rooms, public.messages, public.canvas_objects, public.room_members, public.room_knocks, public.shred_votes, public.close_votes FROM anon;
REVOKE ALL ON FUNCTION public.is_admitted(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_napkin(text,text,text), public.enter_napkin(text,text,text), public.answer_room_knock(text,uuid,boolean), public.set_member_muted(text,uuid,boolean), public.execute_room_shred(text,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cleanup_expired_napkins() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_napkin(text,text,text), public.enter_napkin(text,text,text), public.answer_room_knock(text,uuid,boolean), public.set_member_muted(text,uuid,boolean), public.execute_room_shred(text,uuid) TO authenticated;