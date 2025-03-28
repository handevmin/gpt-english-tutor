import { DialogTopic, ChatSettings, SystemPrompt, TestQuestion } from './types';
import { generateChatResponse, getOpenAIClient } from './utils/openai';
import { systemPrompts, getSystemPromptForDifficulty } from './prompts';

// 대화 주제
export const topics: DialogTopic[] = [
  {
    id: 'daily-life',
    title: '일상 대화',
    description: '일상적인 주제에 관한 대화',
  },
  {
    id: 'travel',
    title: '여행',
    description: '여행 경험과 계획에 관한 대화',
  },
  {
    id: 'hobbies',
    title: '취미',
    description: '취미와 관심사에 관한 대화',
  },
];

// 기본 설정
export const defaultSettings: ChatSettings = {
  speed: 2,   // 1-3 (느림-빠름)
  difficulty: 2,  // 1-3 (쉬움-어려움)
  topic: topics[0],
  systemPrompt: getSystemPromptForDifficulty(2), // 기본값 중급
};

// 유틸리티 함수
export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 음성 속도 레벨에 따른 실제 속도값 변환
export function getSpeechRate(speedLevel: number): number {
  const rates = {
    1: 0.7,
    2: 0.85,
    3: 1.0,
    4: 1.15,
    5: 1.3
  };
  return rates[speedLevel as keyof typeof rates] || 1.0;
}

// 난이도에 따른 응답 생성 (OpenAI API 활용)
export async function getBotResponse(
  userMessage: string, 
  difficulty: number = 2,
  customSystemPrompt?: string
): Promise<string> {
  const client = getOpenAIClient();
  
  if (!client) {
    return "API 키가 설정되지 않았습니다. 설정에서 OpenAI API 키를 입력해주세요.";
  }
  
  try {
    const systemPrompt = customSystemPrompt || getSystemPromptForDifficulty(difficulty)?.content;
    
    if (!systemPrompt) {
      return "시스템 프롬프트 오류가 발생했습니다.";
    }

    const response = await client.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return response.choices[0].message.content || "응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error("API 호출 오류:", error);
    return "죄송합니다, 응답을 생성하는 중 오류가 발생했습니다.";
  }
}

// 테스트 질문 목록
export const testQuestions: TestQuestion[] = [
  {
    id: '1',
    text: 'What is the capital city of the United States?',
    options: ['New York', 'Washington D.C.', 'Los Angeles', 'Chicago'],
    correctAnswer: 1,
    difficulty: 1
  },
  {
    id: '2',
    text: 'How many planets are there in our solar system?',
    options: ['Seven', 'Eight', 'Nine', 'Ten'],
    correctAnswer: 1,
    difficulty: 1
  },
  {
    id: '3',
    text: 'If you need to make an important decision, what would you do?',
    options: [
      'I would think about it carefully',
      'I would ask my friends for advice',
      'I would follow my instincts',
      'I would research all options thoroughly'
    ],
    correctAnswer: -1, // 주관식 문제
    difficulty: 2
  },
  {
    id: '4',
    text: 'Describe your favorite movie and explain why you like it.',
    options: ['(Write your answer)'],
    correctAnswer: -1, // 주관식 문제
    difficulty: 3
  },
  {
    id: '5',
    text: 'What would you do if you won a million dollars tomorrow?',
    options: ['(Write your answer)'],
    correctAnswer: -1, // 주관식 문제
    difficulty: 3
  },
  {
    id: '6',
    text: 'The economic repercussions of the policy were not fully _____ until years later.',
    options: ['understood', 'comprehended', 'realized', 'appreciated'],
    correctAnswer: 2,
    difficulty: 4
  },
  {
    id: '7',
    text: "How might renewable energy sources affect global economics in the next decade?",
    options: ['(Write your answer)'],
    correctAnswer: -1, // 주관식 문제
    difficulty: 5
  },
  {
    id: '8',
    text: 'What is the difference between "affect" and "effect"?',
    options: [
      '"Affect" is a verb, "effect" is a noun', 
      'They mean the same thing', 
      '"Affect" is for emotions, "effect" is for results',
      'They are interchangeable in most contexts'
    ],
    correctAnswer: 0,
    difficulty: 4
  },
  {
    id: '9',
    text: 'Analyze the potential ethical implications of artificial intelligence in healthcare.',
    options: ['(Write your answer)'],
    correctAnswer: -1, // 주관식 문제
    difficulty: 5
  },
  {
    id: '10',
    text: 'Which of the following sentences is grammatically correct?',
    options: [
      'She don\'t like coffee.',
      'He have been working here for years.',
      'They were watching a movie when I called.',
      'We was planning to visit tomorrow.'
    ],
    correctAnswer: 2,
    difficulty: 2
  }
]; 