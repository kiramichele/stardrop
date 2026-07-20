-- Private bucket that caches ElevenLabs text-to-speech audio. Read-aloud
-- bills per character, so we hash the input text and store the generated
-- mp3 at `tts/{sha256}.mp3`; repeat plays (same student or another) are
-- served from cache and never re-billed.
--
-- Stays private — all reads go through our TTS route handlers, which are
-- gated by requireStudent(). Written/read only via the service-role admin
-- client, so no storage.objects policies are needed.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tts-audio', 'tts-audio', false)
ON CONFLICT (id) DO NOTHING;
