-- Private bucket for student-uploaded media (Unity-upload screenshots,
-- screen recordings, etc.). Stays private — all reads go through our
-- /api/files/submissions/ proxy route, which checks that the requester
-- is either the submission owner or a teacher.
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;
