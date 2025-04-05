import { Message, MessageContent } from "@/lib/api-service";
import { useState } from "react";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const { role, content } = message;

  return (
    <div className={`p-5 rounded-lg shadow-sm ${
      role === 'assistant' 
        ? 'bg-blue-50 border border-blue-200' 
        : 'bg-white border border-gray-200'
    }`}>
      <div className={`font-bold mb-2 flex items-center ${
        role === 'assistant' ? 'text-blue-700' : 'text-gray-800'
      }`}>
        {role === 'assistant' && (
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
        )}
        {role === 'user' && (
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
          </svg>
        )}
        {role === 'user' ? '用户' : role === 'assistant' ? '助手' : '系统'}
      </div>
      <div className="space-y-4 text-gray-900">
        {content.map((item, index) => (
          <MessageContentBlock key={index} content={item} />
        ))}
      </div>
    </div>
  );
}

function MessageContentBlock({ content }: { content: MessageContent }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (content.type === 'text') {
    return (
      <div className="whitespace-pre-wrap text-gray-800 font-medium leading-relaxed">{content.text}</div>
    );
  }

  if (content.type === 'tool_use') {
    return (
      <div className="border border-blue-300 bg-blue-50 p-2 rounded-lg shadow-sm">
        <div 
          className="font-bold text-blue-800 flex items-center cursor-pointer"
          onClick={toggleExpand}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zm7-10a1 1 0 01.707.293l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H7a1 1 0 110-2h7.586l-3.293-3.293A1 1 0 0112 2z" clipRule="evenodd"></path>
          </svg>
          <span>工具调用: {content.tool?.name}</span>
          <svg 
            className={`w-5 h-5 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
          </svg>
        </div>
        {isExpanded && (
          <div className="mt-2">
            <pre className="bg-blue-100 p-3 rounded-lg overflow-x-auto text-blue-900 text-sm font-medium">
              {JSON.stringify(content.tool?.args, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  if (content.type === 'tool_result') {
    return (
      <div className="border border-green-300 bg-green-50 p-2 rounded-lg shadow-sm">
        <div 
          className="font-bold text-green-800 flex items-center cursor-pointer"
          onClick={toggleExpand}
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path>
          </svg>
          <span>工具结果: {content.tool?.name}</span>
          <svg 
            className={`w-5 h-5 ml-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
            fill="currentColor" 
            viewBox="0 0 20 20" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
          </svg>
        </div>
        {isExpanded && (
          <div className="mt-2">
            <pre className="bg-green-100 p-3 rounded-lg overflow-x-auto text-green-900 text-sm font-medium">
              {JSON.stringify(content.tool?.result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  return null;
} 