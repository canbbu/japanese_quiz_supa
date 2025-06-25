-- japanese_quiz 테이블 생성 (존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS japanese_quiz (
  id SERIAL PRIMARY KEY,
  kanji TEXT NOT NULL,
  yomigana TEXT NOT NULL,
  korean TEXT NOT NULL,
  wrong_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at BOOLEAN DEFAULT FALSE
);

-- RLS (Row Level Security) 활성화
ALTER TABLE japanese_quiz ENABLE ROW LEVEL SECURITY;

-- 모든 사용자가 읽기/쓰기 가능하도록 정책 설정 (개발용)
CREATE POLICY "Enable all operations for all users" ON japanese_quiz
FOR ALL USING (true) WITH CHECK (true);

-- 기존 테이블이 있는 경우 컬럼 추가 (안전하게)
DO $$
BEGIN
  -- wrong_count 컬럼이 없으면 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='japanese_quiz' AND column_name='wrong_count') THEN
    ALTER TABLE japanese_quiz ADD COLUMN wrong_count INTEGER DEFAULT 0;
  END IF;
  
  -- deleted_at 컬럼이 없으면 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='japanese_quiz' AND column_name='deleted_at') THEN
    ALTER TABLE japanese_quiz ADD COLUMN deleted_at BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- created_at 컬럼이 없으면 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='japanese_quiz' AND column_name='created_at') THEN
    ALTER TABLE japanese_quiz ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END
$$; 