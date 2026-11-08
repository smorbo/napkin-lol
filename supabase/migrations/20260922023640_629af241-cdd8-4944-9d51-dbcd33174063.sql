GRANT SELECT, INSERT, UPDATE ON public.rooms TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_members TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.room_knocks TO anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.close_votes TO anon, authenticated;
GRANT ALL ON public.rooms, public.room_members, public.room_knocks, public.close_votes TO service_role;