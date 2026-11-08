ALTER TABLE public.rooms
  ADD COLUMN is_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN is_closed boolean NOT NULL DEFAULT false,
  ADD COLUMN close_round uuid;

CREATE TABLE public.room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  display_name text NOT NULL,
  color text NOT NULL,
  admitted boolean NOT NULL DEFAULT true,
  muted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, visitor_id)
);
GRANT SELECT, INSERT, UPDATE ON public.room_members TO anon, authenticated;
GRANT ALL ON public.room_members TO service_role;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members of live rooms" ON public.room_members FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_members.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can join live rooms" ON public.room_members FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_members.room_id AND r.expires_at > now() AND NOT r.is_closed));
CREATE POLICY "Anyone can update members of live rooms" ON public.room_members FOR UPDATE TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_members.room_id AND r.expires_at > now())) WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_members.room_id AND r.expires_at > now()));

CREATE TABLE public.room_knocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  visitor_id text NOT NULL,
  visitor_name text NOT NULL,
  visitor_color text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'admitted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, visitor_id)
);
GRANT SELECT, INSERT, UPDATE ON public.room_knocks TO anon, authenticated;
GRANT ALL ON public.room_knocks TO service_role;
ALTER TABLE public.room_knocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view knocks on live rooms" ON public.room_knocks FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_knocks.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can knock on locked live rooms" ON public.room_knocks FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_knocks.room_id AND r.expires_at > now() AND r.is_locked AND NOT r.is_closed));
CREATE POLICY "Anyone inside can answer knocks" ON public.room_knocks FOR UPDATE TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_knocks.room_id AND r.expires_at > now())) WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_knocks.room_id AND r.expires_at > now()));

CREATE TABLE public.close_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round uuid NOT NULL,
  voter_id text NOT NULL,
  voter_name text NOT NULL,
  agree boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round, voter_id)
);
GRANT SELECT, INSERT, DELETE ON public.close_votes TO anon, authenticated;
GRANT ALL ON public.close_votes TO service_role;
ALTER TABLE public.close_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view close votes in live rooms" ON public.close_votes FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = close_votes.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can vote to close live rooms" ON public.close_votes FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = close_votes.room_id AND r.expires_at > now() AND NOT r.is_closed));
CREATE POLICY "Anyone can clear close votes in live rooms" ON public.close_votes FOR DELETE TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = close_votes.room_id AND r.expires_at > now()));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER room_members_updated_at BEFORE UPDATE ON public.room_members FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER room_knocks_updated_at BEFORE UPDATE ON public.room_knocks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_knocks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.close_votes;