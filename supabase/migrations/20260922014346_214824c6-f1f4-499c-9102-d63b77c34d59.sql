CREATE TABLE public.rooms (
  id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_room_idx ON public.messages(room_id, created_at);

CREATE TABLE public.canvas_objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  author text NOT NULL,
  kind text NOT NULL DEFAULT 'stroke',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX canvas_objects_room_idx ON public.canvas_objects(room_id, created_at);

GRANT SELECT, INSERT ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT ON public.messages TO anon, authenticated;
GRANT SELECT, INSERT ON public.canvas_objects TO anon, authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT ALL ON public.messages TO service_role;
GRANT ALL ON public.canvas_objects TO service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_objects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read live rooms" ON public.rooms
  FOR SELECT TO anon, authenticated USING (expires_at > now());
CREATE POLICY "Anyone can create rooms" ON public.rooms
  FOR INSERT TO anon, authenticated WITH CHECK (expires_at > now());

CREATE POLICY "Anyone can read messages of live rooms" ON public.messages
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can post messages to live rooms" ON public.messages
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.expires_at > now()));

CREATE POLICY "Anyone can read canvas of live rooms" ON public.canvas_objects
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.expires_at > now()));
CREATE POLICY "Anyone can draw in live rooms" ON public.canvas_objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.expires_at > now()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.canvas_objects;