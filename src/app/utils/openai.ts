import OpenAI from 'openai';
import { getSystemPromptForDifficulty } from '../prompts';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(apiKey?: string): OpenAI | null {
  // 환경변수의 API 키를 우선적으로 사용
  const envApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  
  // 환경변수 API 키가 있으면 그것을 사용
  if (envApiKey) {
    // 기존 클라이언트가 이미 환경변수 API 키로 초기화되었는지 확인
    if (openaiClient && openaiClient.apiKey === envApiKey) {
      return openaiClient;
    }
    
    // 새 클라이언트 생성
    openaiClient = new OpenAI({
      apiKey: envApiKey,
      dangerouslyAllowBrowser: true
    });
    
    return openaiClient;
  }
  
  // 환경변수 API 키가 없는 경우 전달된 API 키 사용
  // API 키가 없으면 null 반환
  if (!apiKey && !openaiClient) return null;
  
  // 이미 클라이언트가 있고, API 키가 제공되지 않았다면 기존 클라이언트 반환
  if (openaiClient && !apiKey) return openaiClient;

  // API 키가 제공된 경우 새 클라이언트 생성
  if (apiKey) {
    openaiClient = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  
  return openaiClient;
}

export async function generateChatResponse(
  userMessage: string,
  difficulty: number,
  customSystemPrompt?: string
): Promise<string> {
  try {
    const client = getOpenAIClient();
    
    if (!client) {
      return "API 키가 설정되지 않았습니다. 설정에서 OpenAI API 키를 입력해주세요.";
    }
    
    // 난이도에 따른 시스템 프롬프트 선택 또는 커스텀 프롬프트 사용
    let systemPromptContent = '';
    
    if (customSystemPrompt) {
      // 커스텀 프롬프트가 제공된 경우 사용
      systemPromptContent = customSystemPrompt;
    } else {
      // 난이도에 맞는 프롬프트 사용
      const systemPrompt = getSystemPromptForDifficulty(difficulty);
      if (!systemPrompt) {
        return "시스템 프롬프트 오류가 발생했습니다.";
      }
      systemPromptContent = systemPrompt.content;
    }
    
    // 최대 3번 재시도
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`채팅 API 요청 시도 ${attempts + 1}/${maxAttempts}...`);
        
        const response = await client.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPromptContent },
            { role: 'user', content: userMessage }
          ],
          max_tokens: 150,
          temperature: 0.7,
        });
        
        return response.choices[0]?.message?.content || '죄송합니다, 응답을 생성할 수 없었습니다.';
      } catch (error) {
        console.error(`채팅 API 오류 발생(시도 ${attempts + 1}/${maxAttempts}):`, error);
        
        // OpenAI 에러 타입 체크
        interface OpenAIError {
          status?: number;
          message?: string;
        }
        
        const openaiError = error as OpenAIError;
        
        // API 요청 제한 오류인 경우 재시도
        if (openaiError?.status === 429 && attempts < maxAttempts - 1) {
          const waitTime = 3000 * (attempts + 1); // 대기 시간을 점점 늘림
          console.log(`API 요청 한도 초과: ${waitTime/1000}초 후 재시도합니다.`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          attempts++;
          continue;
        }
        
        // 다른 오류이거나 최대 시도 횟수에 도달하면 오류 발생
        if (openaiError?.status === 429) {
          return '죄송합니다, API 요청 한도에 도달했습니다. 잠시 후(1-2분 정도) 다시 시도해 주세요.';
        } else if (openaiError?.status === 401 || openaiError?.status === 403) {
          return 'API 키 오류: API 키가 유효하지 않거나 만료되었습니다. 설정에서 API 키를 확인해주세요.';
        } else if (openaiError?.status >= 500) {
          return 'OpenAI 서버 오류: 서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.';
        }
        
        throw error;
      }
    }
    
    return '죄송합니다, 응답을 생성할 수 없었습니다.';
  } catch (error) {
    console.error('OpenAI API 호출 중 오류 발생:', error);
    return '죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요.';
  }
}