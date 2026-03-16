// Korean profanity / hate speech filter
// Uses keyword matching + pattern detection for common evasion tricks

const PROFANITY_LIST = [
  // Common Korean profanity
  '시발', '씨발', '씨빨', '씨팔', 'ㅅㅂ', 'ㅆㅂ', '시bal', '씹',
  '병신', 'ㅂㅅ', '멍청', '바보',
  '지랄', 'ㅈㄹ', '좆', 'ㅈ같',
  '개새끼', '새끼', 'ㅅㄲ', '개새',
  '꺼져', '닥쳐', '죽어',
  '미친', '또라이', '정신병',
  'ㅗ', '느금마', '느금',
  '장애인', '한남', '한녀',  // hate speech
  '니애미', '니엄마', '엠창',
  // Common obfuscations
  'ㅅ1발', '시1발', 'shi발', '씨8', '18놈',
]

// Normalize text: remove spaces, convert similar chars
function normalize(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[1!|l]/g, 'i')
    .replace(/[0ㅇ]/g, 'o')
    .replace(/[@]/g, 'a')
    .toLowerCase()
}

export function checkProfanity(text: string): { isProfane: boolean; matched: string[] } {
  const normalized = normalize(text)
  const matched = PROFANITY_LIST.filter(word => {
    const normalizedWord = normalize(word)
    return normalized.includes(normalizedWord)
  })

  return {
    isProfane: matched.length > 0,
    matched,
  }
}
