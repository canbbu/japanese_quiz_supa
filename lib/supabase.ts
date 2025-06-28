import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 사용자별 단어 조회
export const getUserWords = async (userName: string) => {
  const { data, error } = await supabase
    .from('japanese_quiz')
    .select('*')
    .eq('user_name', userName)
    .eq('deleted_at', false)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// 사용자별 특정 날짜 단어 조회
export const getUserWordsByDate = async (userName: string, date: string) => {
  // date는 'YYYY-MM-DD' 형식
  const startDate = `${date}T00:00:00.000Z`
  const endDate = `${date}T23:59:59.999Z`
  
  const { data, error } = await supabase
    .from('japanese_quiz')
    .select('*')
    .eq('user_name', userName)
    .eq('deleted_at', false)
    .gte('created_at', startDate)
    .lte('created_at', endDate)
    .order('created_at', { ascending: false })
  
  return { data, error }
}

// 사용자의 단어를 날짜별로 그룹화해서 가져오기
export const getUserWordsByDateGroups = async (userName: string) => {
  const { data, error } = await supabase
    .from('japanese_quiz')
    .select('*')
    .eq('user_name', userName)
    .eq('deleted_at', false)
    .order('created_at', { ascending: false })
  
  if (error) return { data: null, error }
  
  // 날짜별로 그룹화
  const groupedByDate: { [key: string]: Word[] } = {}
  
  data?.forEach(word => {
    if (word.created_at) {
      const date = new Date(word.created_at).toISOString().split('T')[0] // YYYY-MM-DD 형식
      if (!groupedByDate[date]) {
        groupedByDate[date] = []
      }
      groupedByDate[date].push(word)
    }
  })
  
  return { data: groupedByDate, error: null }
}

// 사용자별 단어 추가
export const addUserWord = async (word: Omit<Word, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('japanese_quiz')
    .insert([word])
    .select()
  
  return { data, error }
}

// 데이터베이스 타입 정의
export interface Word {
  id?: number
  kanji: string
  yomigana: string
  korean: string
  user_name: string  // 사용자 이름 추가 (필수 필드)
  wrong_count?: number
  created_at?: string
  deleted_at?: boolean
} 