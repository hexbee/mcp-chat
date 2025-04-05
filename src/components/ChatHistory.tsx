import { useState } from 'react';

export interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export default function ChatHistory({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  isVisible,
  onToggleVisibility
}: ChatHistoryProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(sessionId);
  };

  const handleConfirmDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setShowDeleteConfirm(null);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(null);
  };

  return (
    <>
      {/* 移动端菜单按钮 */}
      <button 
        className="md:hidden fixed top-4 left-4 z-20 bg-white p-2 rounded-md shadow-md"
        onClick={onToggleVisibility}
      >
        {isVisible ? (
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        )}
      </button>

      {/* 历史记录侧边栏 */}
      <div className={`fixed inset-y-0 left-0 transform ${isVisible ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 z-10 transition duration-200 ease-in-out md:relative md:w-64 md:min-w-64 md:max-w-64 bg-gray-50 border-r border-gray-200 shadow-md md:shadow-none`}>
        <div className="flex flex-col h-full">
          {/* 标题和按钮 */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h2 className="text-lg font-bold text-gray-900">对话历史</h2>
            <button 
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={onToggleVisibility}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 新建对话按钮 */}
          <div className="p-4">
            <button 
              onClick={onNewSession}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md font-medium transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              开始新对话
            </button>
          </div>

          {/* 对话列表 */}
          <div className="flex-1 overflow-y-auto p-2">
            {sessions.length === 0 ? (
              <div className="text-center py-6 text-gray-500">无对话历史</div>
            ) : (
              <ul className="space-y-1 w-full">
                {sessions.map((session) => (
                  <li key={session.id} className="w-full">
                    <div 
                      className={`rounded-md p-3 cursor-pointer relative w-full ${
                        session.id === currentSessionId 
                          ? 'bg-blue-100 border-blue-300 text-blue-800' 
                          : 'hover:bg-gray-100 text-gray-800'
                      }`}
                      onClick={() => onSelectSession(session.id)}
                    >
                      <div className="flex items-start justify-between w-full">
                        <div className="w-[calc(100%-20px)] overflow-hidden">
                          <p className="font-medium truncate">{session.title}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {new Date(session.updatedAt).toLocaleString()}
                          </p>
                        </div>
                        {showDeleteConfirm !== session.id && (
                          <button 
                            onClick={(e) => handleDeleteClick(e, session.id)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0 w-5"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                      
                      {/* 删除确认 */}
                      {showDeleteConfirm === session.id && (
                        <div className="mt-2 flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleConfirmDelete(e, session.id)}
                            className="bg-red-500 text-white text-xs px-2 py-1 rounded"
                          >
                            删除
                          </button>
                          <button 
                            onClick={handleCancelDelete}
                            className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            取消
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 