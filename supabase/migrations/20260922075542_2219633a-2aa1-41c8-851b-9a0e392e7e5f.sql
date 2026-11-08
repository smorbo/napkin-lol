-- Clear shred votes that were orphaned while the shred helpers were blocked:
-- these rounds can never complete and re-appear on every room update (e.g. door toggles).
DELETE FROM public.shred_votes
WHERE round IN (SELECT shred_round FROM public.rooms WHERE shred_round IS NOT NULL);

UPDATE public.rooms
   SET shred_round = NULL, shred_execute_at = NULL
 WHERE shred_round IS NOT NULL;