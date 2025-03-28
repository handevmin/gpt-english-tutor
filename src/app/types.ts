export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: number;
}

export interface DialogTopic {
  id: string;
  title: string;
  description: string;
}

export interface SystemPrompt {
  id: string;
  name: string;
  content: string;
  difficulty: number;
}

export interface ChatSettings {
  speed: number;
  difficulty: number;
  topic: DialogTopic;
  systemPrompt?: SystemPrompt;
}

export interface TestQuestion {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  difficulty: number; // 1-5
}

export interface TestResult {
  score: number;
  recommendedDifficulty: number;
  recommendedSpeed: number;
  completed: boolean;
}

export interface ChatState {
  messages: Message[];
  settings: ChatSettings;
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string;
  testResult?: TestResult;
} 