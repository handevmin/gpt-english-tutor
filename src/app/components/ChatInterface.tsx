'use client';

import { useState, useEffect, useRef } from 'react';
import { Dialog } from '@headlessui/react';
import { ChatState, ChatSettings, Message, TestResult } from '../types';
import { generateUniqueId, getBotResponse, defaultSettings } from '../data';
import SpeechHandler from './SpeechHandler';
import { getOpenAIClient } from '../utils/openai';
import EnglishTest from './EnglishTest';
import PromptEditor from './PromptEditor';
import { getSystemPromptForDifficulty } from '../prompts';

export default function ChatInterface() {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    settings: defaultSettings,
    isRecording: false,
    isProcessing: false,
    transcript: '',
  });
  
  const [textToSpeak, setTextToSpeak] = useState<string | null>(null);
  const [botIsSpeaking, setBotIsSpeaking] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [showTest, setShowTest] = useState(true); // 테스트 화면 표시 여부
  const [showPromptEditor, setShowPromptEditor] = useState(false); // 프롬프트 에디터 표시 여부
  const [customSystemPrompt, setCustomSystemPrompt] = useState<string | null>(null); // 커스텀 프롬프트
  const [adminPressed, setAdminPressed] = useState(0); // 관리자 버튼 누른 횟수
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const latestTranscriptRef = useRef<string>(''); // 최신 transcript 값을 보존하기 위한 ref
  
  // API 키 초기화 (환경변수에서 가져옴)
  useEffect(() => {
    // 환경변수에서 API 키 가져오기
    const envApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (envApiKey) {
      setApiKey(envApiKey);
      // 클라이언트 초기화
      getOpenAIClient(envApiKey);
    } else {
      console.error('환경 변수에 API 키가 설정되지 않았습니다.');
    }
    
    // 테스트 완료 여부 확인
    const testCompleted = localStorage.getItem('test_completed');
    if (testCompleted === 'true') {
      setShowTest(false);
      
      // 저장된 테스트 결과 불러오기
      const savedTestResult = localStorage.getItem('test_result');
      if (savedTestResult) {
        try {
          const testResult = JSON.parse(savedTestResult) as TestResult;
          updateSettingsFromTestResult(testResult);
        } catch (e) {
          console.error('테스트 결과 파싱 오류:', e);
        }
      }
    }
    
    // 커스텀 프롬프트 불러오기
    const savedPrompt = localStorage.getItem('custom_system_prompt');
    if (savedPrompt) {
      setCustomSystemPrompt(savedPrompt);
    }
  }, []);
  
  // 메시지 자동 스크롤
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatState.messages]);
  
  // 테스트 결과에 따른 설정 업데이트
  const updateSettingsFromTestResult = (testResult: TestResult) => {
    const updatedSettings = {
      ...chatState.settings,
      difficulty: testResult.recommendedDifficulty,
      speed: testResult.recommendedSpeed,
      systemPrompt: getSystemPromptForDifficulty(testResult.recommendedDifficulty)
    };
    
    setChatState(prev => ({
      ...prev,
      settings: updatedSettings,
      testResult
    }));
  };
  
  // 테스트 완료 처리
  const handleTestComplete = (testResult: TestResult) => {
    // 설정 업데이트
    updateSettingsFromTestResult(testResult);
    
    // 테스트 결과 저장
    localStorage.setItem('test_completed', 'true');
    localStorage.setItem('test_result', JSON.stringify(testResult));
    
    // 테스트 화면 닫기
    setShowTest(false);
  };
  
  // 테스트 건너뛰기
  const handleSkipTest = () => {
    localStorage.setItem('test_completed', 'true');
    setShowTest(false);
  };
  
  // 사용자 메시지 처리
  const handleUserMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // 사용자 메시지 추가
    const userMessage: Message = {
      id: generateUniqueId(),
      text: text,
      sender: 'user',
      timestamp: Date.now(),
    };
    
    setChatState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isProcessing: true,
      transcript: '',
    }));
    
    try {
      // 봇 응답 생성 (API 호출) - 커스텀 프롬프트 또는 설정 난이도에 따른 프롬프트 사용
      const botResponse = await getBotResponse(
        text, 
        chatState.settings.difficulty, 
        customSystemPrompt || undefined
      );
      
      const botMessage: Message = {
        id: generateUniqueId(),
        text: botResponse,
        sender: 'bot',
        timestamp: Date.now(),
      };
      
      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, botMessage],
        isProcessing: false,
      }));
      
      // 봇 메시지 읽기
      setTextToSpeak(botResponse);
    } catch (error) {
      console.error('응답 생성 중 오류:', error);
      
      const errorMessage: Message = {
        id: generateUniqueId(),
        text: '죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요.',
        sender: 'bot',
        timestamp: Date.now(),
      };
      
      setChatState((prev) => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isProcessing: false,
      }));
    }
  };
  
  // 텍스트 입력 제출
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleUserMessage(textInput);
      setTextInput('');
    }
  };
  
  // 녹음 시작 핸들러 (자동 시작용)
  const handleStartRecording = () => {
    if (botIsSpeaking) return; // 봇이 말하는 동안 녹음 방지
    
    console.log('자동 녹음 시작 요청 처리');
    setChatState((prev) => ({
      ...prev,
      isRecording: true,
      transcript: '',
    }));
  };
  
  // 녹음 시작/종료 토글
  const toggleRecording = () => {
    if (botIsSpeaking) return; // 봇이 말하는 동안 녹음 방지
    
    setChatState((prev) => ({
      ...prev,
      isRecording: !prev.isRecording,
      transcript: '',
    }));
  };
  
  // 녹음 결과 처리
  const handleRecordingResult = (transcript: string) => {
    console.log('음성 인식 결과 수신:', transcript);
    
    // ref에 최신 transcript 저장
    latestTranscriptRef.current = transcript;
    
    // 인식된 텍스트를 상태에 저장
    setChatState((prev) => ({
      ...prev,
      transcript,
    }));
  };
  
  // 녹음 종료 처리
  const handleRecordingEnd = (transcript?: string) => {
    console.log('녹음 종료 처리, 전달받은 transcript:', transcript, '상태의 transcript:', chatState.transcript, 'ref transcript:', latestTranscriptRef.current);
    
    // 우선순위: 1) 직접 전달받은 텍스트, 2) ref에 저장된 텍스트, 3) 상태의 텍스트
    const textToAdd = transcript || latestTranscriptRef.current || chatState.transcript;
    
    if (textToAdd && textToAdd.trim() !== '') {
      // 실제 채팅 메시지로 추가
      handleUserMessage(textToAdd);
      console.log('채팅 메시지 추가됨:', textToAdd);
      
      // ref 초기화
      latestTranscriptRef.current = '';
    } else {
      console.log('인식된 텍스트가 없어 채팅에 추가하지 않음');
      
      // 빈 메시지를 전송해 AI가 응답하도록 함
      if (transcript === '') {
        console.log('매우 짧은 오디오 감지, AI 자동 응답 요청');
        
        // AI가 직접 대화를 시작하는 메시지 추가
        const botStartMessage = '안녕하세요! 대화를 시작해볼까요? 오늘 어떤 주제에 대해 이야기해 보고 싶으신가요?';
        const newMessage: Message = {
          id: generateUniqueId(),
          text: botStartMessage,
          sender: 'bot',
          timestamp: Date.now(),
        };

        // 봇 메시지 추가
        setChatState(prev => ({
          ...prev,
          messages: [...prev.messages, newMessage],
        }));

        // 봇의 음성 재생
        setTextToSpeak(botStartMessage);
        
        // 짧은 지연 후 녹음 상태 업데이트
        setTimeout(() => {
          setChatState((prev) => ({
            ...prev,
            isRecording: false,
            transcript: '',
          }));
        }, 300);
        
        return;
      }
    }
    
    // 녹음 종료
    setChatState((prev) => ({
      ...prev,
      isRecording: false,
      transcript: '',
    }));
  };
  
  // 설정 변경
  const updateSettings = (newSettings: Partial<ChatSettings>) => {
    setChatState((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...newSettings,
      },
    }));
    setShowSettingsModal(false);
  };

  // 커스텀 프롬프트 저장
  const handleSaveCustomPrompt = (promptText: string) => {
    setCustomSystemPrompt(promptText);
    localStorage.setItem('custom_system_prompt', promptText);
  };
  
  // 관리자 버튼 처리
  const handleAdminButtonClick = () => {
    setAdminPressed(prev => prev + 1);
    
    // 5번 연속 클릭 시 프롬프트 에디터 열기
    if (adminPressed >= 4) {
      setShowPromptEditor(true);
      setAdminPressed(0);
    }
  };
  
  const renderSpeedOptions = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          말하기 속도
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">느림</span>
          {[1, 2, 3, 4, 5].map((speed) => (
            <button
              key={`speed-${speed}`}
              className={`w-8 h-8 rounded-full ${
                chatState.settings.speed === speed
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
              onClick={() => updateSettings({ speed })}
            >
              {speed}
            </button>
          ))}
          <span className="text-xs text-gray-500">빠름</span>
        </div>
      </div>
    );
  };
  
  const renderDifficultyOptions = () => {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          난이도
        </label>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">쉬움</span>
          {[1, 2, 3].map((level) => (
            <button
              key={`difficulty-${level}`}
              className={`w-8 h-8 rounded-full ${
                chatState.settings.difficulty === level
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
              onClick={() => updateSettings({ 
                difficulty: level,
                systemPrompt: getSystemPromptForDifficulty(level)
              })}
            >
              {level}
            </button>
          ))}
          <span className="text-xs text-gray-500">어려움</span>
        </div>
      </div>
    );
  };
  
  // 디버그 모드 UI
  const renderDebugOptions = () => {
    return (
      <div className="mb-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={debugMode}
            onChange={() => setDebugMode(!debugMode)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="text-sm font-medium text-gray-700">디버그 모드 활성화</span>
        </label>
        <p className="mt-1 text-xs text-gray-500">
          음성 인식 문제 해결에 도움이 됩니다.
        </p>
      </div>
    );
  };
  
  // 테스트 다시 하기 옵션
  const renderTestOptions = () => {
    return (
      <div className="mb-4">
        <button
          onClick={() => {
            localStorage.removeItem('test_completed');
            localStorage.removeItem('test_result');
            setShowTest(true);
          }}
          className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          영어 레벨 테스트 다시 하기
        </button>
        <p className="mt-1 text-xs text-gray-500">
          영어 수준에 맞는 난이도를 다시 추천받으려면 테스트를 다시 해보세요.
        </p>
      </div>
    );
  };
  
  // 영어 테스트 화면 표시
  if (showTest) {
    return (
      <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50">
        <EnglishTest 
          onComplete={handleTestComplete} 
          onSkip={handleSkipTest} 
        />
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-gray-50">
      {/* 헤더 */}
      <header className="bg-blue-600 text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center">
          <h1 
            className="text-xl font-bold cursor-pointer" 
            onClick={handleAdminButtonClick}
          >
            영어 말하기 연습
          </h1>
          <span 
            className="ml-1 opacity-0 hover:opacity-100 transition-opacity text-xs"
          >
            {adminPressed > 0 && `(${5 - adminPressed})`}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDebugMode(!debugMode)}
            className="p-2 bg-blue-700 rounded-full"
            title="디버그 모드 토글"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 bg-blue-700 rounded-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 테스트 결과 표시 (첫 방문 시) */}
      {chatState.testResult && chatState.messages.length === 0 && (
        <div className="bg-blue-50 p-4 border-b border-blue-100">
          <h2 className="font-medium mb-1">영어 레벨 테스트 결과</h2>
          <p className="text-sm text-gray-700 mb-2">
            추천 난이도: <span className="font-bold">{chatState.testResult.recommendedDifficulty}</span> / 
            추천 속도: <span className="font-bold">{chatState.testResult.recommendedSpeed}</span>
          </p>
          <div className="text-xs text-gray-500">
            설정 메뉴에서 난이도와 속도를 변경할 수 있습니다.
          </div>
        </div>
      )}

      {/* 메시지 영역 */}
      <div className="flex-1 overflow-y-auto p-4">
        {chatState.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <p>마이크 버튼을 눌러 영어로 대화를 시작하세요.</p>
            <p className="mt-2 text-sm">
              주제: {chatState.settings.topic?.title || '일상 대화'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {chatState.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p>{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            ))}
            {chatState.isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-800 rounded-lg px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef}></div>
          </div>
        )}
      </div>

      {/* 입력 영역 */}
      <div className="bg-white border-t border-gray-200 p-4">        
        {/* 텍스트 입력 폼 */}
        <form onSubmit={handleTextSubmit} className="mb-3">
          <div className="flex items-center">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="영어로 메시지를 입력하세요"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={chatState.isRecording || botIsSpeaking}
            />
            <button
              type="submit"
              className={`ml-2 px-4 py-2 rounded-md ${
                chatState.isRecording || botIsSpeaking
                  ? 'bg-gray-400 text-white'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
              disabled={chatState.isRecording || botIsSpeaking}
            >
              전송
            </button>
          </div>
        </form>
        
        {/* 음성 인식 버튼 */}
        <div className="flex items-center">
          <button
            onClick={toggleRecording}
            disabled={botIsSpeaking}
            className={`w-12 h-12 rounded-full flex items-center justify-center ${
              chatState.isRecording
                ? 'bg-red-500 text-white animate-pulse'
                : botIsSpeaking
                ? 'bg-gray-400 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            {chatState.isRecording ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            )}
          </button>
          
          <div className="ml-4 flex-1">
            <p className="text-sm text-gray-500">
              {botIsSpeaking
                ? '챗봇이 응답 중...'
                : chatState.isRecording
                ? '말하기를 마치려면 버튼을 다시 누르세요'
                : '마이크 버튼을 눌러 말하기 시작 또는 텍스트로 입력하세요'}
            </p>
          </div>
        </div>
      </div>

      {/* 설정 모달 */}
      <Dialog
        open={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-sm rounded-lg bg-white p-6">
            <Dialog.Title className="text-lg font-medium mb-4">
              대화 설정
            </Dialog.Title>
            
            {renderSpeedOptions()}
            {renderDifficultyOptions()}
            {renderDebugOptions()}
            {renderTestOptions()}
            
            {/* 커스텀 프롬프트가 설정된 경우 표시 */}
            {customSystemPrompt && (
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <label className="block text-sm font-medium text-gray-700">
                    커스텀 프롬프트 사용 중
                  </label>
                  <button 
                    onClick={() => {
                      setCustomSystemPrompt(null);
                      localStorage.removeItem('custom_system_prompt');
                    }}
                    className="text-red-500 text-xs"
                  >
                    초기화
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  관리자 모드에서 설정한 프롬프트가 적용 중입니다.
                </p>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-md mr-2"
              >
                취소
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                확인
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* 프롬프트 에디터 */}
      <PromptEditor
        isOpen={showPromptEditor}
        onClose={() => setShowPromptEditor(false)}
        onSave={handleSaveCustomPrompt}
        currentPrompt={customSystemPrompt || chatState.settings.systemPrompt?.content}
      />

      {/* 음성 핸들러 */}
      <SpeechHandler
        isRecording={chatState.isRecording}
        onRecordingResult={handleRecordingResult}
        onRecordingEnd={handleRecordingEnd}
        speechSpeed={chatState.settings.speed}
        onStartSpeaking={() => setBotIsSpeaking(true)}
        onStopSpeaking={() => setBotIsSpeaking(false)}
        textToSpeak={textToSpeak}
        apiKey={apiKey}
        debugMode={debugMode}
        currentTranscript={chatState.transcript}
        onStartRecording={handleStartRecording}
      />
      
      {/* 디버그 패널이 SpeechHandler에서 표시되므로 여기서는 스페이서만 추가 */}
      {debugMode && <div className="h-36"></div>}
    </div>
  );
}