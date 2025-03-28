'use client';

import { useState } from 'react';
import { TestResult } from '../types';
import { testQuestions, getRecommendedSettings } from '../prompts';

interface EnglishTestProps {
  onComplete: (result: TestResult) => void;
  onSkip: () => void;
}

const EnglishTest: React.FC<EnglishTestProps> = ({ onComplete, onSkip }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(Array(testQuestions.length).fill(-1));
  const [showResult, setShowResult] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  
  const handleAnswerSelect = (answerIndex: number) => {
    const newSelectedAnswers = [...selectedAnswers];
    newSelectedAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newSelectedAnswers);
  };
  
  const handleNext = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      calculateResult();
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const calculateResult = () => {
    // 맞은 문제 수 계산
    let correctCount = 0;
    for (let i = 0; i < testQuestions.length; i++) {
      if (selectedAnswers[i] === testQuestions[i].correctAnswer) {
        correctCount++;
      }
    }
    
    // 난이도와 속도 추천
    const { difficulty, speed } = getRecommendedSettings(correctCount);
    
    const result: TestResult = {
      score: correctCount,
      recommendedDifficulty: difficulty,
      recommendedSpeed: speed,
      completed: true
    };
    
    setTestResult(result);
    setShowResult(true);
  };
  
  const handleComplete = () => {
    if (testResult) {
      onComplete(testResult);
    }
  };
  
  const currentQuestion = testQuestions[currentQuestionIndex];
  const isAnswerSelected = selectedAnswers[currentQuestionIndex] !== -1;
  const isLastQuestion = currentQuestionIndex === testQuestions.length - 1;
  
  return (
    <div className="flex flex-col h-full">
      {showResult ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <h2 className="text-2xl font-bold mb-4">테스트 결과</h2>
          <p className="text-lg mb-2">
            {testQuestions.length}문제 중 <span className="font-bold">{testResult?.score}</span>문제 정답
          </p>
          <p className="mb-4">
            추천 난이도: <span className="font-bold">{testResult?.recommendedDifficulty}</span>
            <br />
            추천 말하기 속도: <span className="font-bold">{testResult?.recommendedSpeed}</span>
          </p>
          <div className="w-full max-w-xs bg-gray-200 rounded-full h-2.5 mb-6">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${(testResult?.score || 0) / testQuestions.length * 100}%` }}
            ></div>
          </div>
          <button
            onClick={handleComplete}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 mb-2"
          >
            대화 시작하기
          </button>
        </div>
      ) : (
        <>
          <div className="p-4 bg-blue-50 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">영어 레벨 테스트</h2>
              <div className="text-sm text-gray-500">
                {currentQuestionIndex + 1} / {testQuestions.length}
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${(currentQuestionIndex + 1) / testQuestions.length * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">{currentQuestion.text}</h3>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-md cursor-pointer ${
                      selectedAnswers[currentQuestionIndex] === index
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                    onClick={() => handleAnswerSelect(index)}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 flex items-center justify-center rounded-full border mr-3 ${
                        selectedAnswers[currentQuestionIndex] === index
                          ? 'border-blue-500 bg-blue-500 text-white'
                          : 'border-gray-400'
                      }`}>
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span>{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t flex justify-between">
            <div>
              <button
                onClick={onSkip}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                건너뛰기
              </button>
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className={`px-4 py-2 mr-2 ${
                  currentQuestionIndex === 0
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                이전
              </button>
            </div>
            <button
              onClick={handleNext}
              disabled={!isAnswerSelected}
              className={`px-6 py-2 rounded-md ${
                isAnswerSelected
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLastQuestion ? '결과 보기' : '다음'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default EnglishTest; 