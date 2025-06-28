-- japanese_quiz 테이블 생성 (존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS japanese_quiz (
  id SERIAL PRIMARY KEY,
  kanji TEXT NOT NULL,
  yomigana TEXT NOT NULL,
  korean TEXT NOT NULL,
  user_name TEXT NOT NULL,
  wrong_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at BOOLEAN DEFAULT FALSE
);

-- RLS (Row Level Security) 활성화
ALTER TABLE japanese_quiz ENABLE ROW LEVEL SECURITY;

-- 사용자별 데이터 접근 정책 (사용자는 자신의 데이터만 접근 가능)
DROP POLICY IF EXISTS "Enable all operations for all users" ON japanese_quiz;
CREATE POLICY "Users can only access their own data" ON japanese_quiz
FOR ALL USING (auth.uid()::text = user_name) WITH CHECK (auth.uid()::text = user_name);

-- 기존 테이블이 있는 경우 컬럼 추가 (안전하게)
DO $$
BEGIN
  -- user_name 컬럼이 없으면 추가
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='japanese_quiz' AND column_name='user_name') THEN
    ALTER TABLE japanese_quiz ADD COLUMN user_name TEXT;
    -- 기존 데이터에 대해서는 임시 user_name 설정 (실제 사용시에는 적절한 값으로 업데이트 필요)
    UPDATE japanese_quiz SET user_name = 'temp_user' WHERE user_name IS NULL;
    -- NOT NULL 제약 조건 추가
    ALTER TABLE japanese_quiz ALTER COLUMN user_name SET NOT NULL;
  END IF;
  
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