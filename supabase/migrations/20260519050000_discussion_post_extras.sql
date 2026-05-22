-- Discussion board extras: profanity flagging + media attachments on posts.
-- discussion_boards / discussion_posts / notifications already exist.
-- After applying, regenerate types:
--   npx supabase gen types typescript --linked > types/database.ts

ALTER TABLE public.discussion_posts
  ADD COLUMN IF NOT EXISTS flagged_at timestamptz,
  ADD COLUMN IF NOT EXISTS flagged_terms text[],
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Private bucket for images / videos / screen recordings posted to
-- discussion boards. Served through /api/files/discussion/ with an
-- auth check (must share a class with the post, or be a teacher).
INSERT INTO storage.buckets (id, name, public)
VALUES ('discussion', 'discussion', false)
ON CONFLICT (id) DO NOTHING;
