import { useState, FormEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  loading: boolean;
}

export default function ChatInput({ onSendMessage, loading }: ChatInputProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4 shadow-md">
      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
        <div className="flex rounded-lg shadow-sm border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
          <textarea
            className="flex-grow p-3 rounded-l-lg text-gray-900 focus:outline-none bg-white font-medium resize-none"
            placeholder="输入您的消息..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-r-lg hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 font-medium flex items-center justify-center min-w-[100px]"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                发送中
              </span>
            ) : (
              <span className="flex items-center">
                发送
                <svg className="ml-1 w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"></path>
                </svg>
              </span>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">按 Enter 发送，Shift + Enter 换行</p>
      </form>
    </div>
  );
} 