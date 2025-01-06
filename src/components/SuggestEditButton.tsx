import React, { useState, useEffect, useRef } from 'react';
import { FiEdit, FiPlus } from 'react-icons/fi';
import { RiRobotFill } from 'react-icons/ri';

interface SuggestEditButtonProps {
  onClick: () => void;
  onGenerateClick: () => void;
}

const SuggestEditButton: React.FC<SuggestEditButtonProps> = ({ onClick, onGenerateClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleGeneratePrompt = (e: React.MouseEvent) => {
    e.stopPropagation();
    onGenerateClick();
    setIsExpanded(false);
  };

  const handleMouseEnter = () => {
    if (!isExpanded) {
      setIsExpanded(true);
    }
  };

  const handleButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <div ref={containerRef} className="fixed bottom-6 right-6 flex flex-col items-end gap-3">
      {isExpanded && (
        <button
          onClick={handleGeneratePrompt}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all duration-300 animate-slideIn"
        >
          <div className="bg-white p-1 rounded-full">
            <FiPlus className="w-4 h-4 text-indigo-600" />
          </div>
          <span>生成提示词</span>
        </button>
      )}
      <button
        onClick={handleButtonClick}
        onMouseEnter={handleMouseEnter}
        className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 ${
          isExpanded ? 'translate-y-[-4px]' : ''
        }`}
      >
        <div className="bg-white p-1 rounded-full">
          <RiRobotFill className="w-4 h-4 text-indigo-600" />
        </div>
        <span className={`transition-all duration-300 ${isExpanded ? 'opacity-100' : 'opacity-90'}`}>
          更多选项
        </span>
      </button>
    </div>
  );
};

export default SuggestEditButton; 