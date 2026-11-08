ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS grid_mode text NOT NULL DEFAULT 'light';
GRANT UPDATE (board_theme, is_locked, shred_round, close_round, grid_mode) ON public.rooms TO authenticated;