'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { systemPrompts } from '../prompts';

interface PromptEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customPrompt: string) => void;
  currentPrompt?: string;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentPrompt 
}) => {
  const [promptText, setPromptText] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('custom');
  
  // 컴포넌트가 열릴 때 현재 프롬프트로 초기화
  useEffect(() => {
    if (isOpen && currentPrompt) {
      setPromptText(currentPrompt);
      // 기존 프롬프트가 템플릿 중 하나인지 확인
      const matchingPrompt = systemPrompts.find(p => p.content === currentPrompt);
      if (matchingPrompt) {
        setSelectedTemplate(matchingPrompt.id);
      } else {
        setSelectedTemplate('custom');
      }
    }
  }, [isOpen, currentPrompt]);
  
  // 템플릿 선택 처리
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    if (templateId === 'custom') {
      return; // 커스텀 선택 시 텍스트 유지
    }
    
    const selectedPrompt = systemPrompts.find(p => p.id === templateId);
    if (selectedPrompt) {
      setPromptText(selectedPrompt.content);
    }
  };
  
  // 저장 처리
  const handleSave = () => {
    onSave(promptText);
    onClose();
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4 flex justify-between items-center">
            <span>시스템 프롬프트 수정</span>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Dialog.Title>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              템플릿 선택
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => handleTemplateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="custom">사용자 정의</option>
              {systemPrompts.map((prompt) => (
                <option key={prompt.id} value={prompt.id}>
                  {prompt.name} (난이도: {prompt.difficulty})
                </option>
              ))}
            </select>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              프롬프트 내용
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="OpenAI에 전달할 시스템 프롬프트를 입력하세요..."
            />
          </div>
          
          <div className="text-xs text-gray-500 mb-4">
            <p>이 프롬프트는 AI가 대화를 생성할 때 기본 지침으로 사용됩니다.</p>
            <p>학습자의 수준에 맞는 영어 표현, 문장 길이, 복잡성 등을 지정할 수 있습니다.</p>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded-md mr-2"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={!promptText.trim()}
              className={`px-4 py-2 rounded-md ${
                promptText.trim() ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              저장
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default PromptEditor; 