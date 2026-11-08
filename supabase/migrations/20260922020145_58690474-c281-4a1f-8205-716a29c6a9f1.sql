ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS board_theme text NOT NULL DEFAULT 'dark';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS shred_round uuid;

CREATE POLICY "Anyone can update live rooms" ON public.rooms
  FOR UPDATE TO anon, authenticated
  USING (expires_at > now())
  WITH CHECK (expires_at > now());
GRANT UPDATE ON public.rooms TO anon, authenticated;

CREATE POLICY "Anyone can edit canvas of live rooms" ON public.canvas_objects
  FOR UPDATE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = canvas_objects.room_id AND r.expires_at > now()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = canvas_objects.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can clear canvas of live rooms" ON public.canvas_objects
  FOR DELETE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = canvas_objects.room_id AND r.expires_at > now()));
GRANT UPDATE, DELETE ON public.canvas_objects TO anon, authenticated;

CREATE TABLE IF NOT EXISTS public.shred_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  round uuid NOT NULL,
  voter_id text NOT NULL,
  voter_name text NOT NULL,
  agree boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, round, voter_id)
);
GRANT SELECT, INSERT, DELETE ON public.shred_votes TO anon, authenticated;
GRANT ALL ON public.shred_votes TO service_role;
ALTER TABLE public.shred_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read votes of live rooms" ON public.shred_votes
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = shred_votes.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can vote in live rooms" ON public.shred_votes
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = shred_votes.room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can clear votes of live rooms" ON public.shred_votes
  FOR DELETE TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = shred_votes.room_id AND r.expires_at > now()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.shred_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;