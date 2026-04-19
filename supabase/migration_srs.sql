-- ========================================================
-- DACE SRS Migration — chạy trong Supabase SQL Editor
-- ========================================================

-- 1. Thêm SRS fields vào bảng phrases
ALTER TABLE phrases
  ADD COLUMN IF NOT EXISTS next_review_at  TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS ease_factor     FLOAT       DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS review_interval INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS repetitions     INTEGER     DEFAULT 0;

-- 2. Tạo bảng lưu lịch sử ôn tập
CREATE TABLE IF NOT EXISTS study_logs (
  id          SERIAL PRIMARY KEY,
  phrase_id   INTEGER     NOT NULL REFERENCES phrases(id) ON DELETE CASCADE,
  result      TEXT        NOT NULL CHECK (result IN ('again', 'hard', 'good', 'easy')),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS study_logs_phrase_id_idx ON study_logs (phrase_id);
CREATE INDEX IF NOT EXISTS study_logs_reviewed_at_idx ON study_logs (reviewed_at DESC);

-- 3. Index để query phrases cần ôn nhanh
CREATE INDEX IF NOT EXISTS phrases_next_review_idx
  ON phrases (next_review_at)
  WHERE deleted_at IS NULL;
