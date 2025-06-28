'use client'

import React, { useState, useEffect } from 'react'
import { supabase, Word, getUserWords, addUserWord, getUserWordsByDate, getUserWordsByDateGroups } from '../lib/supabase'

export default function Home() {
  // 사용자 관련 상태
  const [currentUser, setCurrentUser] = useState<string>('')
  const [tempUserName, setTempUserName] = useState<string>('')
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  
  // 단어 관련 상태
  const [vocabulary, setVocabulary] = useState<Word[]>([])
  const [wordsByDate, setWordsByDate] = useState<{ [key: string]: Word[] }>({})
  const [viewMode, setViewMode] = useState<'all' | 'byDate'>('all')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableDates, setAvailableDates] = useState<string[]>([])
  
  const [kanjiWord, setKanjiWord] = useState('')
  const [yomigana, setYomigana] = useState('')
  const [koreanMeaning, setKoreanMeaning] = useState('')
  const [isQuizMode, setIsQuizMode] = useState(false)
  const [quizType, setQuizType] = useState<'all' | 'date'>('all')
  const [currentQuizWords, setCurrentQuizWords] = useState<Word[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [wrongAnswers, setWrongAnswers] = useState<Word[]>([])
  const [userYomigana, setUserYomigana] = useState('')
  const [userKoreanMeaning, setUserKoreanMeaning] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'wrongCount'>('newest')

  // 로그인 상태 확인
  useEffect(() => {
    const savedUser = localStorage.getItem('quiz-user-name')
    if (savedUser) {
      setCurrentUser(savedUser)
      setIsLoggedIn(true)
    }
  }, [])

  // 사용자별 단어 불러오기
  useEffect(() => {
    if (isLoggedIn && currentUser) {
      fetchUserWords()
    }
  }, [isLoggedIn, currentUser])

  // 사용자별 단어 불러오기
  const fetchUserWords = async () => {
    if (!currentUser) return
    
    try {
      setLoading(true)
      console.log('Fetching words for user:', currentUser)
      
      // 전체 단어와 날짜별 그룹화된 단어를 모두 가져오기
      const [allWordsResult, dateGroupsResult] = await Promise.all([
        getUserWords(currentUser),
        getUserWordsByDateGroups(currentUser)
      ])
      
      if (allWordsResult.error) {
        console.error('Error fetching user words:', allWordsResult.error)
        showMessageBox(`단어를 불러오는 중 오류: ${allWordsResult.error.message}`)
        return
      }

      if (dateGroupsResult.error) {
        console.error('Error fetching date groups:', dateGroupsResult.error)
        showMessageBox(`날짜별 데이터를 불러오는 중 오류: ${dateGroupsResult.error.message}`)
        return
      }

      console.log('User words:', allWordsResult.data)
      console.log('Words by date:', dateGroupsResult.data)
      
      setVocabulary(allWordsResult.data || [])
      setWordsByDate(dateGroupsResult.data || {})
      
      // 사용 가능한 날짜 목록 설정
      const dates = Object.keys(dateGroupsResult.data || {}).sort((a, b) => b.localeCompare(a)) // 최신순
      setAvailableDates(dates)
      
      // 선택된 날짜가 없거나 더 이상 존재하지 않으면 가장 최근 날짜로 설정
      if (!selectedDate || !dates.includes(selectedDate)) {
        setSelectedDate(dates[0] || '')
      }
      
    } catch (error) {
      console.error('Error:', error)
      showMessageBox(`데이터베이스 연결에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  // 특정 날짜의 단어들 가져오기
  const fetchWordsByDate = async (date: string) => {
    if (!currentUser || !date) return
    
    try {
      setLoading(true)
      console.log('Fetching words for date:', date)
      
      const { data, error } = await getUserWordsByDate(currentUser, date)
      
      if (error) {
        console.error('Error fetching words by date:', error)
        showMessageBox(`날짜별 단어를 불러오는 중 오류: ${error.message}`)
        return
      }

      console.log('Words for date:', data)
      
      // 날짜별 데이터 업데이트
      setWordsByDate(prev => ({
        ...prev,
        [date]: data || []
      }))
      
    } catch (error) {
      console.error('Error:', error)
      showMessageBox(`데이터베이스 연결에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  // 사용자 로그인
  const loginUser = () => {
    if (!tempUserName.trim()) {
      showMessageBox('이름을 입력해주세요.')
      return
    }
    
    const userName = tempUserName.trim()
    setCurrentUser(userName)
    setIsLoggedIn(true)
    localStorage.setItem('quiz-user-name', userName)
    setTempUserName('')
  }

  // 사용자 로그아웃
  const logoutUser = () => {
    setCurrentUser('')
    setIsLoggedIn(false)
    setVocabulary([])
    localStorage.removeItem('quiz-user-name')
  }

  // 기존 fetchWords 함수 제거하고 fetchUserWords로 대체
  const fetchWords = fetchUserWords

  // 배열 섞기 함수
  const shuffleArray = (array: Word[]) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // 단어 정렬 함수
  const sortWords = (words: Word[], order: 'newest' | 'oldest' | 'wrongCount') => {
    const sorted = [...words]
    switch (order) {
      case 'newest':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA // 최신순
        })
      case 'oldest':
        return sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateA - dateB // 오래된순
        })
      case 'wrongCount':
        return sorted.sort((a, b) => {
          const wrongA = a.wrong_count || 0
          const wrongB = b.wrong_count || 0
          return wrongB - wrongA // 틀린 횟수가 많은 순
        })
      default:
        return sorted
    }
  }

  // 현재 보기 모드에 따른 단어 목록 가져오기
  const getCurrentWords = (): Word[] => {
    if (viewMode === 'all') {
      return vocabulary
    } else if (viewMode === 'byDate' && selectedDate) {
      return wordsByDate[selectedDate] || []
    }
    return []
  }

  // 날짜 형식 변환 함수 (YYYY-MM-DD -> YYYY년 MM월 DD일)
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return `${date.getFullYear()}년 ${(date.getMonth() + 1).toString().padStart(2, '0')}월 ${date.getDate().toString().padStart(2, '0')}일`
  }

  // 문자열 정규화 함수 (띄어쓰기, 쉼표, 특수문자 제거 및 소문자 변환)
  const normalizeString = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/[\s,，、。！？!?]/g, '') // 띄어쓰기, 쉼표, 마침표, 느낌표, 물음표 제거
      .trim()
  }

  // 정답 확인 개선 함수
  const checkAnswerMatch = (userAnswer: string, correctAnswers: string[]): { isCorrect: boolean, matchedAnswer: string | null } => {
    const normalizedUserAnswer = normalizeString(userAnswer)
    
    for (const correctAnswer of correctAnswers) {
      const normalizedCorrectAnswer = normalizeString(correctAnswer)
      if (normalizedUserAnswer === normalizedCorrectAnswer) {
        return { isCorrect: true, matchedAnswer: correctAnswer.trim() }
      }
    }
    
    return { isCorrect: false, matchedAnswer: null }
  }

  // 정렬된 단어 목록 가져오기
  const getSortedVocabulary = () => {
    return sortWords(getCurrentWords(), sortOrder)
  }

  // 메시지 박스 표시
  const showMessageBox = (message: string) => {
    alert(message) // 실제 환경에서는 토스트 메시지로 대체 가능
  }

  // 단어 추가
  const addWord = async () => {
    if (!kanjiWord.trim() || !yomigana.trim() || !koreanMeaning.trim()) {
      showMessageBox('모든 필드를 입력해주세요: 한자, 요미가나, 한국어 뜻.')
      return
    }

    if (!currentUser) {
      showMessageBox('로그인이 필요합니다.')
      return
    }

    try {
      setLoading(true)
      
      const wordData: Omit<Word, 'id' | 'created_at'> = {
        kanji: kanjiWord.trim(),
        yomigana: yomigana.trim(),
        korean: koreanMeaning.trim(),
        user_name: currentUser,
        wrong_count: 0,
        deleted_at: false
      }
      
      console.log('Adding word with user data:', wordData)

      const { data, error } = await addUserWord(wordData)

      if (error) {
        console.error('Supabase error details:', error)
        showMessageBox(`단어 추가 중 오류가 발생했습니다.\n오류 내용: ${error.message}\n상세: ${error.details || 'N/A'}\n힌트: ${error.hint || 'N/A'}`)
        return
      }

      console.log('Successfully added word:', data)

      // 입력 필드 초기화
      setKanjiWord('')
      setYomigana('')
      setKoreanMeaning('')

      // 단어 목록 새로고침
      await fetchWords()
      showMessageBox('단어가 성공적으로 추가되었습니다!')
    } catch (error) {
      console.error('Error details:', error)
      showMessageBox(`단어 추가에 실패했습니다.\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  // 단어 삭제 (soft delete)
  const deleteWord = async (wordId: number) => {
    if (!confirm('정말로 이 단어를 삭제하시겠습니까?')) {
      return
    }

    try {
      setLoading(true)
      console.log('Attempting to delete word with ID:', wordId)
      
      // 먼저 해당 단어가 존재하는지 확인
      const { data: existingWord, error: findError } = await supabase
        .from('japanese_quiz')
        .select('*')
        .eq('id', wordId)
        .single()

      if (findError) {
        console.error('Error finding word:', findError)
        showMessageBox(`단어를 찾을 수 없습니다.\n오류: ${findError.message}`)
        return
      }

      console.log('Found word to delete:', existingWord)

      // deleted_at 컬럼이 있는지 확인하고 삭제 시도
      const { data, error } = await supabase
        .from('japanese_quiz')
        .update({ deleted_at: true })
        .eq('id', wordId)
        .select()

      if (error) {
        console.error('Supabase delete error:', error)
        
        // deleted_at 컬럼이 없으면 실제 삭제 시도
        if (error.message.includes('column "deleted_at" does not exist')) {
          console.log('deleted_at column does not exist, trying hard delete...')
          
          const { error: deleteError } = await supabase
            .from('japanese_quiz')
            .delete()
            .eq('id', wordId)

          if (deleteError) {
            console.error('Hard delete error:', deleteError)
            showMessageBox(`단어 삭제 중 오류가 발생했습니다.\n오류: ${deleteError.message}`)
            return
          }
          
          console.log('Hard delete successful')
        } else {
          showMessageBox(`단어 삭제 중 오류가 발생했습니다.\n오류: ${error.message}\n상세: ${error.details || 'N/A'}`)
          return
        }
      } else {
        console.log('Soft delete operation result:', data)
        
        if (data && data.length === 0) {
          showMessageBox('삭제할 단어를 찾을 수 없습니다. 이미 삭제되었거나 존재하지 않는 단어입니다.')
          return
        }
      }

      // 단어 목록 새로고침
      await fetchWords()
      showMessageBox('단어가 삭제되었습니다.')
    } catch (error) {
      console.error('Delete error details:', error)
      showMessageBox(`단어 삭제에 실패했습니다.\n오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setLoading(false)
    }
  }

  // 틀린 횟수 증가
  const incrementWrongCount = async (wordId: number) => {
    try {
      // 현재 wrong_count 값을 가져와서 1 증가시키기
      const { data: currentData, error: fetchError } = await supabase
        .from('japanese_quiz')
        .select('wrong_count')
        .eq('id', wordId)
        .single()

      if (fetchError) {
        console.error('Error fetching current wrong count:', fetchError)
        return
      }

      const newWrongCount = (currentData?.wrong_count || 0) + 1

      const { error } = await supabase
        .from('japanese_quiz')
        .update({ wrong_count: newWrongCount })
        .eq('id', wordId)

      if (error) {
        console.error('Error updating wrong count:', error)
      }
    } catch (error) {
      console.error('Error:', error)
    }
  }

  // 퀴즈 시작
  const startQuiz = (type: 'all' | 'date') => {
    let wordsToQuiz: Word[] = []
    
    if (type === 'all') {
      wordsToQuiz = vocabulary
    } else if (type === 'date' && selectedDate) {
      wordsToQuiz = wordsByDate[selectedDate] || []
    }
    
    if (wordsToQuiz.length === 0) {
      const message = type === 'all' 
        ? '퀴즈를 시작하려면 단어를 먼저 추가해주세요.'
        : '선택한 날짜에 등록된 단어가 없습니다.'
      showMessageBox(message)
      return
    }
    
    setQuizType(type)
    setCurrentQuizWords(shuffleArray(wordsToQuiz))
    setCurrentWordIndex(0)
    setWrongAnswers([])
    setIsQuizMode(true)
    setQuizCompleted(false)
    setUserYomigana('')
    setUserKoreanMeaning('')
    setFeedback('')
    setShowAnswer(false)
  }

  // 틀린 단어만 다시 풀기
  const startWrongAnswersQuiz = () => {
    if (wrongAnswers.length === 0) {
      showMessageBox('틀린 단어가 없습니다.')
      return
    }
    
    setCurrentQuizWords(shuffleArray(wrongAnswers))
    setCurrentWordIndex(0)
    setWrongAnswers([])
    setQuizCompleted(false)
    setUserYomigana('')
    setUserKoreanMeaning('')
    setFeedback('')
    setShowAnswer(false)
  }

  // 정답 확인
  const checkAnswer = async () => {
    if (!userYomigana.trim() || !userKoreanMeaning.trim()) {
      showMessageBox('요미가나와 한국어 뜻을 모두 입력해주세요.')
      return
    }

    const currentWord = currentQuizWords[currentWordIndex]
    
    // 요미가나 정답 확인 (콤마로 구분된 여러 요미가나 허용)
    const yomiganaOptions = currentWord.yomigana.split(',').map(m => m.trim())
    const yomiganaResult = checkAnswerMatch(userYomigana, yomiganaOptions)

    // 한국어 뜻 정답 확인 (콤마로 구분된 여러 뜻 허용)
    const koreanOptions = currentWord.korean.split(',').map(m => m.trim())
    const koreanResult = checkAnswerMatch(userKoreanMeaning, koreanOptions)

    if (yomiganaResult.isCorrect && koreanResult.isCorrect) {
      // 완전 정답
      setFeedback('정답입니다! 😊')
    } else if (yomiganaResult.isCorrect || koreanResult.isCorrect) {
      // 부분 정답
      let feedbackMessage = '부분 정답입니다!\n\n'
      
      if (yomiganaResult.isCorrect) {
        feedbackMessage += `✅ 요미가나: "${yomiganaResult.matchedAnswer}" (정답)\n`
        feedbackMessage += `❌ 한국어 뜻: 정답은 "${currentWord.korean}" 입니다`
      } else if (koreanResult.isCorrect) {
        feedbackMessage += `❌ 요미가나: 정답은 "${currentWord.yomigana}" 입니다\n`
        feedbackMessage += `✅ 한국어 뜻: "${koreanResult.matchedAnswer}" (정답)`
      }
      
      setFeedback(feedbackMessage)
      setWrongAnswers(prev => [...prev, currentWord])
      
      // 틀린 횟수 증가
      if (currentWord.id) {
        await incrementWrongCount(currentWord.id)
      }
    } else {
      // 완전 오답
      setFeedback(`오답입니다! ❌\n\n정답 요미가나: "${currentWord.yomigana}"\n정답 한국어 뜻: "${currentWord.korean}"`)
      setWrongAnswers(prev => [...prev, currentWord])
      
      // 틀린 횟수 증가
      if (currentWord.id) {
        await incrementWrongCount(currentWord.id)
      }
    }
    setShowAnswer(true)
  }

  // 다음 단어
  const nextWord = () => {
    if (currentWordIndex < currentQuizWords.length - 1) {
      setCurrentWordIndex(prev => prev + 1)
      setUserYomigana('')
      setUserKoreanMeaning('')
      setFeedback('')
      setShowAnswer(false)
    } else {
      // 퀴즈 완료
      setQuizCompleted(true)
    }
  }

  // 퀴즈 종료 후 처음으로 돌아가기
  const returnToMain = () => {
    setIsQuizMode(false)
    setQuizCompleted(false)
    setUserYomigana('')
    setUserKoreanMeaning('')
    setFeedback('')
    setShowAnswer(false)
    // 단어 목록 새로고침 (틀린 횟수 업데이트 반영)
    fetchWords()
  }

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!showAnswer) {
        checkAnswer()
      } else {
        nextWord()
      }
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg text-gray-600">로딩 중...</div>
        </div>
      </div>
    )
  }

  // 로그인하지 않은 경우 이름 입력 화면
  if (!isLoggedIn) {
    return (
      <div className="container">
        <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">일본어 단어 퀴즈</h1>
          <div className="space-y-4">
            <div>
              <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
                사용자 이름을 입력해주세요
              </label>
              <input
                type="text"
                id="userName"
                value={tempUserName}
                onChange={(e) => setTempUserName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loginUser()}
                placeholder="이름을 입력하세요"
                className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>
            <button
              onClick={loginUser}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              시작하기
            </button>
          </div>
          <div className="mt-6 text-sm text-gray-500 text-center">
            입력한 이름으로 개인별 단어장이 관리됩니다.
          </div>
        </div>
      </div>
    )
  }

  if (!isQuizMode) {
    return (
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">일본어 단어 퀴즈</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              안녕하세요, <span className="font-semibold text-indigo-600">{currentUser}</span>님!
            </span>
            <button
              onClick={logoutUser}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition duration-300"
            >
              로그아웃
            </button>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h2 className="text-xl font-semibold text-gray-700">새 단어 추가</h2>
          
          <div>
            <label htmlFor="kanjiWord" className="block text-sm font-medium text-gray-700 mb-1">한자:</label>
            <input
              type="text"
              id="kanjiWord"
              value={kanjiWord}
              onChange={(e) => setKanjiWord(e.target.value)}
              placeholder="한자를 입력하세요 (예: 日本)"
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="yomigana" className="block text-sm font-medium text-gray-700 mb-1">요미가나:</label>
            <input
              type="text"
              id="yomigana"
              value={yomigana}
              onChange={(e) => setYomigana(e.target.value)}
              placeholder="요미가나를 입력하세요 (예: にほん)"
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="koreanMeaning" className="block text-sm font-medium text-gray-700 mb-1">한국어 뜻:</label>
            <input
              type="text"
              id="koreanMeaning"
              value={koreanMeaning}
              onChange={(e) => setKoreanMeaning(e.target.value)}
              placeholder="한국어 뜻을 입력하세요 (예: 일본)"
              className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              disabled={loading}
            />
          </div>
          
          <button
            onClick={addWord}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '추가 중...' : '단어 추가'}
          </button>

          {/* 보기 모드 선택 */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-700">단어 보기</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1 text-sm rounded transition duration-300 ${
                    viewMode === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={loading}
                >
                  전체 보기
                </button>
                <button
                  onClick={() => setViewMode('byDate')}
                  className={`px-3 py-1 text-sm rounded transition duration-300 ${
                    viewMode === 'byDate' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                  disabled={loading}
                >
                  날짜별 보기
                </button>
              </div>
            </div>
            
            {viewMode === 'byDate' && (
              <div className="mb-3">
                <label htmlFor="dateSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  날짜 선택:
                </label>
                <select
                  id="dateSelect"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2"
                  disabled={loading}
                >
                  {availableDates.map(date => (
                    <option key={date} value={date}>
                      {formatDate(date)} ({wordsByDate[date]?.length || 0}개)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">
                {viewMode === 'all' 
                  ? `전체 단어 (${vocabulary.length}개)`
                  : `${selectedDate ? formatDate(selectedDate) : '날짜 선택'} (${getCurrentWords().length}개)`
                }
              </h3>
              <div className="flex items-center space-x-2">
                <label htmlFor="sortOrder" className="text-sm text-gray-600">정렬:</label>
                <select
                  id="sortOrder"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest' | 'wrongCount')}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                  disabled={loading}
                >
                  <option value="newest">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="wrongCount">틀린 횟수 많은순</option>
                </select>
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {getSortedVocabulary().map((word) => (
                <div key={word.id} className="word-list-item">
                  <div className="mb-1">
                    <span className="text-gray-800 font-medium text-base">{word.kanji}</span>
                    <span className="text-gray-600 text-sm">({word.yomigana})</span>
                    {word.wrong_count && word.wrong_count > 0 && (
                      <span className="text-red-500 text-xs ml-2">틀린 횟수: {word.wrong_count}번</span>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-600">{word.korean}</span>
                    <button
                      onClick={() => word.id && deleteWord(word.id)}
                      disabled={loading}
                      className="text-red-500 hover:text-red-700 text-sm p-1 rounded disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* 퀴즈 시작 버튼들 */}
          <div className="space-y-2">
            <button
              onClick={() => startQuiz('all')}
              disabled={vocabulary.length === 0 || loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              전체 단어 퀴즈 시작 ({vocabulary.length}개)
            </button>
            
            {viewMode === 'byDate' && selectedDate && (
              <button
                onClick={() => startQuiz('date')}
                disabled={getCurrentWords().length === 0 || loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {formatDate(selectedDate)} 단어 퀴즈 시작 ({getCurrentWords().length}개)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            퀴즈 결과 - {quizType === 'all' ? '전체 단어' : `${selectedDate ? formatDate(selectedDate) : '날짜별'} 단어`}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-indigo-600">{currentUser}</span>님
            </span>
            <button
              onClick={logoutUser}
              className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition duration-300"
            >
              로그아웃
            </button>
          </div>
        </div>
        
        <div className="space-y-6 text-center">
          <div className="word-display">퀴즈 종료!</div>
          <div className={`text-lg font-semibold ${wrongAnswers.length > 0 ? 'wrong-answer' : 'correct-answer'}`}>
            {wrongAnswers.length > 0 
              ? `틀린 단어: ${wrongAnswers.length}개` 
              : '모든 단어를 맞혔습니다!'
            }
          </div>
          
          {wrongAnswers.length > 0 && (
            <button
              onClick={() => startWrongAnswersQuiz()}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
            >
              틀린 단어만 다시 풀기
            </button>
          )}
          
          <button
            onClick={returnToMain}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            처음부터 다시 시작
          </button>
        </div>
      </div>
    )
  }

  const currentWord = currentQuizWords[currentWordIndex]

  return (
    <div className="container">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800">
          퀴즈 진행중 - {quizType === 'all' ? '전체 단어' : `${selectedDate ? formatDate(selectedDate) : '날짜별'} 단어`}
        </h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            <span className="font-semibold text-indigo-600">{currentUser}</span>님
          </span>
          <button
            onClick={() => {
              if (confirm('퀴즈를 종료하고 로그아웃하시겠습니까?')) {
                logoutUser()
              }
            }}
            className="text-sm bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded transition duration-300"
          >
            로그아웃
          </button>
        </div>
      </div>
      
      <div className="space-y-6 text-center">
        <div className="word-display">{currentWord?.kanji}</div>
        <div className="text-sm text-gray-500">
          ({currentWordIndex + 1}/{currentQuizWords.length})
          {currentWord?.wrong_count && currentWord.wrong_count > 0 && (
            <div className="text-red-500 text-xs mt-1">
              이전 틀린 횟수: {currentWord.wrong_count}번
            </div>
          )}
        </div>
        
        <div>
          <input
            type="text"
            value={userYomigana}
            onChange={(e) => setUserYomigana(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="요미가나를 입력하세요"
            className="w-full text-center text-lg py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 mb-2"
            disabled={showAnswer}
          />
        </div>
        
        <div>
          <input
            type="text"
            value={userKoreanMeaning}
            onChange={(e) => setUserKoreanMeaning(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="한국어 뜻을 입력하세요"
            className="w-full text-center text-lg py-3 px-4 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            disabled={showAnswer}
          />
        </div>
        
        {!showAnswer ? (
          <button
            onClick={checkAnswer}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            정답 확인
          </button>
        ) : (
          <button
            onClick={nextWord}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            다음 단어
          </button>
        )}
        
        {feedback && (
          <div className={`text-lg font-semibold mt-4 ${feedback.includes('정답') ? 'correct-answer' : 'wrong-answer'}`}>
            {feedback.split('\n').map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 