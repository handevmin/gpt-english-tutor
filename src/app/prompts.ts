import { SystemPrompt, TestQuestion } from './types';

// 기본 시스템 프롬프트 템플릿
export const systemPrompts: SystemPrompt[] = [
  {
    id: 'beginner',
    name: '초급',
    content: `You are an English conversation partner for a beginner level English learner. 
Follow these guidelines:
1. Use very simple vocabulary and basic sentence structures.
2. Speak slowly and clearly.
3. Use present tense most of the time.
4. Keep responses short (1-3 sentences).
5. Ask simple questions that can be answered with yes/no or short phrases.
6. Avoid idioms, slang, or complex grammar.
7. Provide gentle corrections for major mistakes.
8. Be patient and encouraging.
9. Stick to familiar everyday topics.`,
    difficulty: 1
  },
  {
    id: 'intermediate',
    name: '중급',
    content: `You are an English conversation partner for an intermediate level English learner. 
Follow these guidelines:
1. Use everyday vocabulary with some more advanced words.
2. Use a mix of simple and complex sentences.
3. Use various tenses appropriately.
4. Provide responses of moderate length (3-5 sentences).
5. Ask open-ended questions.
6. Use common idioms and expressions occasionally.
7. Correct major errors subtly.
8. Be conversational and engaging.
9. Discuss a wide range of topics.`,
    difficulty: 2
  },
  {
    id: 'advanced',
    name: '고급',
    content: `You are an English conversation partner for an advanced level English learner. 
Follow these guidelines:
1. Use sophisticated vocabulary and precise word choice.
2. Use complex and varied sentence structures.
3. Use all grammatical structures naturally and fluently.
4. Provide in-depth responses.
5. Ask complex and philosophical questions.
6. Use idiomatic and colloquial language freely.
7. Focus on nuance and style more than grammar correction.
8. Engage in sophisticated discussions on any topic.
9. Discuss abstract concepts, hypothetical situations, and cultural nuances.`,
    difficulty: 3
  }
];

// 프롬프트 템플릿 목록
export const promptTemplates = [
  {
    id: 'default',
    name: '기본 (영어 학습)',
    description: '영어 학습에 최적화된 기본 템플릿'
  },
  {
    id: 'travel',
    name: '여행 영어',
    description: '여행 상황에서 필요한 영어 대화 연습'
  },
  {
    id: 'business',
    name: '비즈니스 영어',
    description: '업무 상황에서 필요한 영어 대화 연습'
  },
  {
    id: 'interview',
    name: '인터뷰 연습',
    description: '영어 인터뷰 준비를 위한 모의 면접'
  },
  {
    id: 'custom',
    name: '직접 작성',
    description: '나만의 커스텀 프롬프트 작성'
  }
];

// 영어 테스트 문제
export const testQuestions: TestQuestion[] = [
  {
    id: 'q1',
    text: 'What is the correct sentence?',
    options: [
      'She go to school every day.',
      'She goes to school every day.',
      'She going to school every day.',
      'She are go to school every day.'
    ],
    correctAnswer: 1,
    difficulty: 1
  },
  {
    id: 'q2',
    text: 'Choose the correct past tense form:',
    options: [
      'I eated dinner yesterday.',
      'I eating dinner yesterday.',
      'I ate dinner yesterday.',
      'I eat dinner yesterday.'
    ],
    correctAnswer: 2,
    difficulty: 1
  },
  {
    id: 'q3',
    text: 'Which sentence uses the present perfect tense correctly?',
    options: [
      'I have see that movie.',
      'I have saw that movie.',
      'I have seeing that movie.',
      'I have seen that movie.'
    ],
    correctAnswer: 3,
    difficulty: 1
  },
  {
    id: 'q4',
    text: 'Choose the correct conditional sentence:',
    options: [
      'If it rains, I will staying home.',
      'If it rains, I will stay home.',
      'If it rain, I will stay home.',
      'If it raining, I will stay home.'
    ],
    correctAnswer: 1,
    difficulty: 2
  },
  {
    id: 'q5',
    text: 'Which sentence uses a modal verb correctly?',
    options: [
      'You must to go now.',
      'You should going now.',
      'You might to see him later.',
      'You could have been there earlier.'
    ],
    correctAnswer: 3,
    difficulty: 2
  },
  {
    id: 'q6',
    text: 'Identify the passive voice sentence:',
    options: [
      'They built this house in 1990.',
      'This house was built in 1990.',
      'This house is building in 1990.',
      'They are building this house in 1990.'
    ],
    correctAnswer: 1,
    difficulty: 2
  },
  {
    id: 'q7',
    text: 'Which sentence contains a gerund?',
    options: [
      'I want to swim in the ocean.',
      'I enjoy swimming in the ocean.',
      'I will swim in the ocean.',
      'I swam in the ocean.'
    ],
    correctAnswer: 1,
    difficulty: 3
  },
  {
    id: 'q8',
    text: 'Choose the sentence with correct reported speech:',
    options: [
      'She said she is coming tomorrow.',
      'She said she was coming the next day.',
      'She said she will come tomorrow.',
      'She said she comes tomorrow.'
    ],
    correctAnswer: 1,
    difficulty: 3
  },
  {
    id: 'q9',
    text: 'Identify the sentence with a correctly used subjunctive mood:',
    options: [
      'I wish I was taller.',
      'I wish I am taller.',
      'I wish I were taller.',
      'I wish I being taller.'
    ],
    correctAnswer: 2,
    difficulty: 3
  },
  {
    id: 'q10',
    text: 'Select the sentence that uses a restrictive clause correctly:',
    options: [
      'The book that I read yesterday was interesting.',
      'The book, that I read yesterday, was interesting.',
      'The book which, I read yesterday, was interesting.',
      'The book, I read yesterday, was interesting.'
    ],
    correctAnswer: 0,
    difficulty: 3
  }
];

// 점수에 따른 난이도와 속도 추천
export function getRecommendedSettings(score: number): { difficulty: number, speed: number } {
  if (score <= 4) {
    return { difficulty: 1, speed: 1 };
  } else if (score <= 7) {
    return { difficulty: 2, speed: 2 };
  } else {
    return { difficulty: 3, speed: 3 };
  }
}

// 난이도에 따른 시스템 프롬프트 반환
export function getSystemPromptForDifficulty(difficulty: number): SystemPrompt | undefined {
  return systemPrompts.find(prompt => prompt.difficulty === difficulty);
}

// 템플릿 ID에 따른 기본 프롬프트 내용 반환
export function getPromptTemplateContent(templateId: string, difficulty: number = 2): string {
  // 기본 난이도 프롬프트 가져오기
  const basePrompt = getSystemPromptForDifficulty(difficulty)?.content || '';
  
  switch (templateId) {
    case 'travel':
      return `${basePrompt}
      
Additional instructions for travel English practice:
- Focus on travel-related vocabulary and situations
- Include common travel scenarios like booking accommodations, asking for directions, ordering food, etc.
- Provide cultural insights about different countries when relevant
- Help with phrases that would be useful when traveling`;
      
    case 'business':
      return `${basePrompt}
      
Additional instructions for business English practice:
- Focus on professional and workplace communication
- Include business vocabulary and formal expressions
- Practice scenarios like meetings, presentations, negotiations, emails
- Emphasize clear and concise communication
- Provide feedback on professionalism and appropriateness`;
      
    case 'interview':
      return `${basePrompt}
      
Additional instructions for interview practice:
- Act as an interviewer asking common job interview questions
- Provide constructive feedback on answers
- Focus on clarity, conciseness, and confidence in responses
- Cover different types of questions (behavioral, situational, technical)
- Offer suggestions for improvement
- Maintain a slightly formal tone appropriate for interviews`;
      
    case 'custom':
      return ''; // 커스텀 템플릿은 사용자가 직접 작성
      
    case 'default':
    default:
      return basePrompt;
  }
} 