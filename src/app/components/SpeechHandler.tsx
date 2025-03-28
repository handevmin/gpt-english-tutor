'use client';

import { useState, useEffect, useRef } from 'react';
import { getSpeechRate } from '../data';

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
    mozSpeechRecognition: typeof SpeechRecognition;
    msSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechHandlerProps {
  isRecording: boolean;
  onRecordingResult: (transcript: string) => void;
  onRecordingEnd: (transcript?: string) => void;
  speechSpeed: number;
  onStartSpeaking: () => void;
  onStopSpeaking: () => void;
  textToSpeak: string | null;
  apiKey: string | null;
  debugMode: boolean;
  currentTranscript: string;
  onStartRecording: () => void;
}

const SpeechHandler: React.FC<SpeechHandlerProps> = ({
  isRecording,
  onRecordingResult,
  onRecordingEnd,
  speechSpeed,
  onStartSpeaking,
  onStopSpeaking,
  textToSpeak,
  apiKey,
  debugMode = false,
  currentTranscript,
  onStartRecording,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  
  // 음성 인식 관련 상태
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // 마이크 접근 권한 확인 및 초기화
  useEffect(() => {
    console.log('마이크 권한 확인 중...');
    
    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setHasPermission(true);
        console.log('마이크 권한 허용됨');
        
        const recorder = new MediaRecorder(stream);
        
        recorder.onstart = () => {
          console.log('녹음 시작됨');
          audioChunksRef.current = [];
          setErrorMessage(null);
        };
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        
        recorder.onstop = async () => {
          console.log('녹음 종료됨');
          
          if (audioChunksRef.current.length === 0) {
            console.log('녹음된 오디오 데이터 없음');
            return;
          }
          
          if (!apiKey) {
            setErrorMessage('OpenAI API 키가 설정되지 않았습니다');
            return;
          }
          
          setIsProcessingAudio(true);
          
          try {
            // 오디오 데이터를 파일로 변환
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            
            // 파일 크기가 너무 크면 경고
            if (audioBlob.size > 25 * 1024 * 1024) { // 25MB 이상이면
              setErrorMessage('오디오 파일이 너무 큽니다. 더 짧게 녹음해주세요.');
              setIsProcessingAudio(false);
              return;
            }
            
            // 오디오 파일이 너무 작으면 Whisper API에서 오류 발생 방지
            // "Audio file is too short. Minimum audio length is 0.1 seconds." 오류 해결
            if (audioBlob.size < 2000) { // 약 0.1초 이하로 추정되는 작은 파일
              console.log('오디오 파일이 너무 짧습니다 (크기: ' + audioBlob.size + ' bytes). 처리를 건너뜁니다.');
              
              // 잡음이나 매우 짧은 녹음으로 간주하고 빈 텍스트 설정
              setTranscript('');
              
              // 오디오 처리 중 상태 해제
              setIsProcessingAudio(false);
              
              // 빈 텍스트로 녹음 종료 처리 (AI 응답 유도)
              // 빈 문자열을 전달하여 너무 짧은 오디오 파일 처리
              onRecordingEnd('');
              return;
            }
            
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'en');
            
            // 최대 3번 재시도
            let attempts = 0;
            const maxAttempts = 3;
            
            // API 요청 전 오류 초기화
            setErrorMessage(null);
            
            // 변수 선언 및 초기화 
            let response = null;
            let result = null;
            
            // API 요청 시도
            while (attempts < maxAttempts) {
              try {
                console.log(`음성 인식 API 요청 시도 ${attempts + 1}/${maxAttempts}...`);
                
                // Whisper API 호출
                response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${apiKey}`
                  },
                  body: formData
                });
                
                if (!response.ok) {
                  if (response.status === 429) {
                    console.log(`API 요청 한도 초과 (429): ${attempts + 1}번째 시도`);
                    
                    // 마지막 시도가 아니면 재시도
                    if (attempts < maxAttempts - 1) {
                      const waitTime = 2000 * (attempts + 1); // 대기 시간을 점점 늘림
                      console.log(`${waitTime/1000}초 후 재시도합니다.`);
                      
                      // 사용자에게 대기 메시지 표시
                      setErrorMessage(`API 요청 한도 초과: ${(attempts + 2)}번째 시도 준비 중...`);
                      
                      // 대기 후 재시도
                      await new Promise(resolve => setTimeout(resolve, waitTime));
                      attempts++;
                      continue;
                    } else {
                      throw new Error('OpenAI API 요청 한도 초과: 잠시 후 다시 시도해주세요 (429)');
                    }
                  } else {
                    // 다른 HTTP 오류
                    const errorText = await response.text().catch(() => '응답 내용을 읽을 수 없음');
                    throw new Error(`API 오류: ${response.status} - ${errorText}`);
                  }
                }
                
                // 성공적인 응답 처리
                try {
                  result = await response.json();
                  console.log('Whisper API 응답 성공:', result);
                  break; // 성공하면 반복 종료
                } catch (jsonError) {
                  throw new Error(`응답 데이터 파싱 오류: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
                }
              } catch (error) {
                console.error(`시도 ${attempts + 1}/${maxAttempts} 실패:`, error);
                
                // 마지막 시도였으면 오류 발생
                if (attempts >= maxAttempts - 1) {
                  console.error('최대 시도 횟수 도달. 최종 오류:', error);
                  throw error;
                }
                
                // 대기 후 재시도
                const waitTime = 1000 * (attempts + 1);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempts++;
              }
            }
            
            if (result && result.text) {
              const recognizedText = result.text.trim();
              setTranscript(recognizedText);
              
              // 인식된 텍스트를 부모 컴포넌트로 전달
              onRecordingResult(recognizedText);
              
              // 명시적으로 짧은 지연 후에 녹음 종료 이벤트 발생시킴
              // 이렇게 하면 UI에 텍스트가 표시된 후 채팅 메시지로 추가됨
              setTimeout(() => {
                console.log('음성 인식 완료, 채팅에 메시지 추가 중...');
                onRecordingEnd();
              }, 300);
            }
          } catch (error) {
            console.error('Whisper API 오류:', error);
            setErrorMessage(`음성 인식 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
            // 오류 발생 시에도 녹음 종료 처리
            onRecordingEnd();
          } finally {
            setIsProcessingAudio(false);
          }
        };
        
        setMediaRecorder(recorder);
        mediaRecorderRef.current = recorder;
        
      } catch (error) {
        console.error('마이크 접근 오류:', error);
        setHasPermission(false);
        setErrorMessage('마이크 접근 권한이 거부되었습니다');
      }
    };
    
    initAudio();
    
    return () => {
      // 컴포넌트 언마운트 시 정리
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, [apiKey, onRecordingEnd, onRecordingResult]);
  
  // 녹음 상태 변경 처리
  useEffect(() => {
    if (!mediaRecorder || hasPermission === false) {
      return;
    }
    
    try {
      if (isRecording && mediaRecorder.state === 'inactive') {
        console.log('녹음 시작');
        mediaRecorder.start();
      } else if (!isRecording && mediaRecorder.state === 'recording') {
        console.log('녹음 중지');
        mediaRecorder.stop();
      }
    } catch (error) {
      console.error('녹음 상태 변경 오류:', error);
      setErrorMessage(`녹음 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }, [isRecording, mediaRecorder, hasPermission]);
  
  // 이전 음성 합성 취소
  const cancelPreviousSpeech = () => {
    if (window.speechSynthesis) {
      console.log('이전 음성 합성 취소');
      window.speechSynthesis.cancel();
      
      // 취소 후 약간의 지연을 두어 브라우저 음성 엔진이 초기화되도록 합니다
      return new Promise(resolve => setTimeout(resolve, 150));
    }
    return Promise.resolve();
  };
  
  // 음성 합성
  useEffect(() => {
    if (!textToSpeak) return;
    
    console.log('음성 합성 시작:', textToSpeak);
    
    let isMounted = true; // 컴포넌트 마운트 상태 추적
    let timeoutId: NodeJS.Timeout;
    
    // 비동기 함수로 음성 합성 프로세스 시작
    const startSpeechProcess = async () => {
      // 이전 음성 합성이 있었다면 취소하고 잠시 대기
      await cancelPreviousSpeech();
      
      if (!isMounted) return; // 컴포넌트가 언마운트되었으면 중단
      
      // 음성 합성 시작 전 약간의 지연 적용 (이전 음성과의 충돌 방지)
      timeoutId = setTimeout(() => {
        try {
          // 음성 합성 엔진이 준비되었는지 확인
          let voices = window.speechSynthesis.getVoices();
          if (voices.length === 0) {
            console.log('음성 목록을 아직 사용할 수 없음, 로딩 대기 중...');
            
            // 음성 로드를 위한 재시도 기능 (0.5초 후 다시 시도)
            const retryAfterDelay = () => {
              if (!isMounted) return; // 마운트 상태 확인
              
              voices = window.speechSynthesis.getVoices();
              if (voices.length > 0) {
                console.log('음성 목록 로드됨, 음성 합성 시작');
                startSpeaking(voices);
              } else {
                console.log('음성 목록을 여전히 사용할 수 없음, 0.5초 후 다시 시도');
                setTimeout(retryAfterDelay, 500);
              }
            };
            
            // 일부 브라우저에서는 비동기적으로 로드됨
            const voicesChangedHandler = () => {
              if (!isMounted) return; // 마운트 상태 확인
              
              voices = window.speechSynthesis.getVoices();
              if (voices.length > 0) {
                // 이벤트 핸들러 제거 (중복 실행 방지)
                window.speechSynthesis.onvoiceschanged = null;
                startSpeaking(voices);
              }
            };
            
            window.speechSynthesis.onvoiceschanged = voicesChangedHandler;
            
            // 첫 번째 재시도 예약
            setTimeout(retryAfterDelay, 500);
            return;
          }
          
          startSpeaking(voices);
          
        } catch (error) {
          console.error('음성 합성 초기화 오류:', error);
          if (isMounted) {
            setIsSpeaking(false);
            onStopSpeaking();
          }
        }
      }, 300); // 지연 시간
    };
    
    // 음성 합성 프로세스 시작
    startSpeechProcess();
    
    // 내부 함수로 실제 음성 합성 시작 로직 분리
    function startSpeaking(voices: SpeechSynthesisVoice[]) {
      if (!isMounted) return; // 마운트 상태 확인
      
      try {
        // textToSpeak가 null이면 바로 리턴
        if (textToSpeak === null) return;
        
        const speech = new SpeechSynthesisUtterance(textToSpeak);
        speechSynthesisRef.current = speech;
        
        speech.lang = 'en-US';
        speech.rate = getSpeechRate(speechSpeed);
        
        // 자연스러운 목소리를 위한 추가 설정
        speech.pitch = 1.0; // 기본값은 1.0, 범위는 0~2
        speech.volume = 1.0; // 최대 볼륨
        
        // 문장 앞뒤에 약간의 공백을 추가하여 더 자연스러운 발화 구현
        const pauseCharacter = ','; // 미세한 휴지를 위한 문자 추가
        if (!textToSpeak.startsWith(pauseCharacter)) {
          speech.text = pauseCharacter + ' ' + textToSpeak;
        }
        
        // 브라우저별 고품질 음성 선택 로직 개선
        console.log('사용 가능한 음성:', voices.length);
        
        if (debugMode) {
          console.log('사용 가능한 음성 목록:', voices.map(v => `${v.name} (${v.lang})`));
        }
        
        // 최신 고품질 음성 목록 (브라우저별 우선 순위)
        const preferredVoices = [
          // Chrome/Edge 고품질 음성
          'Microsoft Aria Online (Natural) - English (United States)',
          'Google UK English Female',
          'Microsoft Libby Online (Natural)',
          'Microsoft Jenny Online (Natural)',
          // Safari 고품질 음성
          'Samantha',
          'Ava',
          // Firefox 음성
          'Karen',
          'Allison'
        ];
        
        // 1. 우선순위가 높은 자연스러운 음성 검색
        let selectedVoice = null;
        for (const voiceName of preferredVoices) {
          const foundVoice = voices.find(v => v.name === voiceName && v.lang.includes('en'));
          if (foundVoice) {
            selectedVoice = foundVoice;
            console.log(`고품질 음성 선택됨: ${foundVoice.name}`);
            break;
          }
        }
        
        // 2. 우선순위 음성이 없으면 'natural' 키워드가 있는 음성 검색
        if (!selectedVoice) {
          const naturalVoice = voices.find(v => 
            v.name.toLowerCase().includes('natural') && 
            v.lang.includes('en-US')
          );
          
          if (naturalVoice) {
            selectedVoice = naturalVoice;
            console.log(`자연스러운 음성 선택됨: ${naturalVoice.name}`);
          }
        }
        
        // 3. 여전히 음성이 없으면 여성 음성 검색
        if (!selectedVoice) {
          const femaleVoice = voices.find(voice => 
            voice.lang.includes('en-US') && 
            (voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Ava'))
          );
          
          if (femaleVoice) {
            selectedVoice = femaleVoice;
            console.log(`여성 음성 선택됨: ${femaleVoice.name}`);
          }
        }
        
        // 4. 마지막으로 영어 음성 중 첫 번째 선택
        if (!selectedVoice) {
          const englishVoice = voices.find(voice => voice.lang.includes('en'));
          if (englishVoice) {
            selectedVoice = englishVoice;
            console.log(`기본 영어 음성 선택됨: ${englishVoice.name}`);
          }
        }
        
        // 선택된 음성 적용
        if (selectedVoice) {
          speech.voice = selectedVoice;
        }
        
        // 이벤트 핸들러
        speech.onstart = () => {
          if (!isMounted) return; // 마운트 상태 확인
          console.log('음성 재생 시작');
          setIsSpeaking(true);
          onStartSpeaking();
        };
        
        speech.onend = () => {
          if (!isMounted) return; // 마운트 상태 확인
          console.log('음성 재생 종료');
          setIsSpeaking(false);
          onStopSpeaking();
        };
        
        speech.onerror = (event) => {
          if (!isMounted) return; // 마운트 상태 확인
          
          // interrupted 오류는 일반적으로 새 음성이 시작될 때 발생하므로 무시
          if (event.error === 'interrupted') {
            console.log('음성 합성 interrupted 오류 무시됨 - 정상적인 음성 전환');
            // interrupted 오류가 발생해도 onend가 발생하지 않을 수 있으므로
            // 이전 음성 상태를 초기화
            setIsSpeaking(false);
            onStopSpeaking();
            // 약간의 지연 후 새 음성 재생 시도 (필요한 경우)
            if (textToSpeak && isMounted) {
              setTimeout(() => {
                if (isMounted && textToSpeak) {
                  // 음성 재생 다시 시도
                  const newSpeech = new SpeechSynthesisUtterance(textToSpeak);
                  if (selectedVoice) newSpeech.voice = selectedVoice;
                  newSpeech.lang = 'en-US';
                  newSpeech.rate = getSpeechRate(speechSpeed);
                  newSpeech.onstart = speech.onstart;
                  newSpeech.onend = speech.onend;
                  newSpeech.onerror = speech.onerror;
                  window.speechSynthesis.speak(newSpeech);
                }
              }, 300);
            }
          } else {
            console.error('음성 합성 오류:', event);
            setIsSpeaking(false);
            onStopSpeaking();
          }
        };
        
        // Chrome과 Edge에서 긴 텍스트가 중간에 끊기는 문제 해결 (15초 이상 문제)
        // SpeechSynthesis 문제 해결책: https://stackoverflow.com/questions/21947730/chrome-speech-synthesis-with-longer-texts
        const maxSpeechLength = 200; // 최대 문자 수 제한
        
        // 긴 텍스트의 경우 분할하여 재생
        if (speech.text && speech.text.length > maxSpeechLength) {
          console.log('긴 텍스트 감지: 분할하여 재생');
          
          // 텍스트를 문장 단위로 분할
          const sentences = speech.text.match(/[^.!?]+[.!?]+/g) || [speech.text];
          
          // 각 문장을 개별 발화로 처리
          let currentIndex = 0;
          
          const speakNextSentence = () => {
            if (!isMounted) return; // 마운트 상태 확인
            
            if (currentIndex < sentences.length) {
              const sentenceText = sentences[currentIndex];
              currentIndex++;
              
              const sentenceSpeech = new SpeechSynthesisUtterance(sentenceText);
              sentenceSpeech.voice = speech.voice;
              sentenceSpeech.lang = speech.lang;
              sentenceSpeech.rate = speech.rate;
              sentenceSpeech.pitch = speech.pitch;
              
              // 마지막 문장이 아닌 경우
              if (currentIndex < sentences.length) {
                sentenceSpeech.onend = speakNextSentence;
              } else {
                // 마지막 문장의 경우 원래 onend 이벤트 처리기 사용
                sentenceSpeech.onend = speech.onend;
              }
              
              // 첫 번째 문장만 onstart 이벤트 발생
              if (currentIndex === 1) {
                sentenceSpeech.onstart = speech.onstart;
              }
              
              sentenceSpeech.onerror = speech.onerror;
              
              // 문장 재생
              window.speechSynthesis.speak(sentenceSpeech);
            }
          };
          
          // 첫 번째 문장부터 시작
          speakNextSentence();
        } else {
          // 일반 텍스트의 경우 바로 재생
          // 음성 합성 시작 전 약간의 추가 지연 적용 (자연스러운 시작을 위해)
          setTimeout(() => {
            if (!isMounted) return; // 마운트 상태 확인
            window.speechSynthesis.speak(speech);
          }, 200);
        }
      } catch (error) {
        console.error('음성 합성 최종 오류:', error);
        if (isMounted) {
          setIsSpeaking(false);
          onStopSpeaking();
        }
      }
    }
    
    return () => {
      // 컴포넌트 언마운트 또는 textToSpeak 변경 시 정리
      isMounted = false; // 마운트 상태 표시 업데이트
      clearTimeout(timeoutId);
      
      // 음성 합성 취소
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
    
  }, [textToSpeak, speechSpeed, debugMode, onStartSpeaking, onStopSpeaking]);
  
  // 디버그 정보 렌더링
  const renderDebugInfo = () => {
    if (!debugMode) return null;
    
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-3 text-xs overflow-auto max-h-36">
        <h3 className="font-bold mb-1">디버그 정보</h3>
        <div>
          <p>마이크 권한: {hasPermission === null ? '확인 중...' : hasPermission ? '허용됨' : '거부됨'}</p>
          <p>녹음 상태: {isRecording ? '녹음 중' : '대기 중'}</p>
          <p>오디오 처리 중: {isProcessingAudio ? 'Yes' : 'No'}</p>
          <p>음성 합성 상태: {isSpeaking ? '음성 출력 중' : '대기 중'}</p>
          <p>인식된 텍스트: {transcript || '없음'}</p>
          {errorMessage && (
            <div className="mt-2 p-2 bg-red-800 rounded">
              <p className="text-red-200 font-bold">오류:</p>
              <p className="text-red-100">{errorMessage}</p>
              {errorMessage.includes('API 요청 한도') && (
                <p className="text-yellow-200 mt-1 text-xs">
                  💡 팁: OpenAI 무료 API 키는 분당 요청 수 제한이 있습니다. 1-2분 정도 기다렸다가 다시 시도해보세요.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <>
      {/* 음성 인식 관련 UI는 여기에 추가 */}
      {renderDebugInfo()}
    </>
  );
};

export default SpeechHandler;