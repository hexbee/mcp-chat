'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Message, MessageContent } from '@/lib/api-service';
import { McpTool } from '@/lib/mcp-manager';
import ChatMessage from '@/components/ChatMessage';
import ChatInput from '@/components/ChatInput';
import Settings from '@/components/Settings';
import ApiKeySync from '@/components/ApiKeySync';
import ChatHistory, { ChatSession } from '@/components/ChatHistory';
import sessionService from '@/lib/session-service';
import ServerSelector from '@/components/ServerSelector';
import { Message as MessageType } from '@/lib/types';
import { Session } from '@/lib/session-service';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [showHistory, setShowHistory] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('claude-3-7-sonnet-latest');
  const [baseUrl, setBaseUrl] = useState('https://api.anthropic.com');
  const [mcpConnected, setMcpConnected] = useState(false);
  const [connectedMcpServers, setConnectedMcpServers] = useState<string[]>([]);
  const [mcpTools, setMcpTools] = useState<McpTool[]>([]);

  useEffect(() => {
    // 加载本地存储的设置
    const storedApiKey = localStorage.getItem('llm_api_key') || '';
    const storedModelName = localStorage.getItem('model_name') || 'claude-3-7-sonnet-latest';
    const storedBaseUrl = localStorage.getItem('llm_base_url') || '';
    const storedMcpServers = localStorage.getItem('mcp_servers') || '[]';
    
    // 加载模型配置
    setApiKey(storedApiKey);
    setModelName(storedModelName || 'claude-3-7-sonnet-latest'); // 确保有默认值
    setBaseUrl(storedBaseUrl);
    
    console.log('从localStorage加载设置:', {
      apiKey: storedApiKey ? '已设置' : '未设置',
      modelName: storedModelName,
      baseUrl: storedBaseUrl || '默认',
      mcpServers: storedMcpServers
    });
    
    // 加载会话列表
    const allSessions = sessionService.getSessions();
    setSessions(allSessions);
    
    // 确保有一个默认会话
    if (allSessions.length === 0) {
      const defaultSession = sessionService.createSession();
      setSessions([defaultSession]);
      setCurrentSessionId(defaultSession.id);
    } else {
      // 加载最近的会话
      const latestSession = allSessions[allSessions.length - 1];
      setCurrentSessionId(latestSession.id);
      setMessages(sessionService.getMessages(latestSession.id));
    }
    
    // 同步设置到后端服务器
    const syncSettingsToServer = async () => {
      try {
        // 1. 同步API密钥
        if (storedApiKey) {
          await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey: storedApiKey }),
          });
        }
        
        // 2. 同步模型名称
        if (storedModelName) {
          await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ modelName: storedModelName }),
          });
        }
        
        // 3. 同步Base URL
        if (storedBaseUrl) {
          await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ baseUrl: storedBaseUrl }),
          });
        }
        
        // 4. 如果有保存的MCP服务器配置，重新连接
        try {
          const savedServers = JSON.parse(storedMcpServers) as string[];
          if (savedServers.length > 0) {
            const connectedServers: string[] = [];
            const allTools: McpTool[] = [];
            
            // 获取MCP配置
            const mcpConfig = localStorage.getItem('mcp_config');
            
            for (const serverName of savedServers) {
              try {
                console.log(`尝试自动连接MCP服务器: ${serverName}`);
                const response = await fetch('/api/mcp/connect', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ 
                    serverName,
                    mcpConfig  // 传递MCP配置
                  }),
                });
                
                const data = await response.json();
                if (data.connected) {
                  connectedServers.push(serverName);
                  if (data.tools && Array.isArray(data.tools)) {
                    allTools.push(...data.tools);
                  }
                }
              } catch (err) {
                console.error(`自动连接MCP服务器 ${serverName} 失败:`, err);
              }
            }
            
            if (connectedServers.length > 0) {
              setMcpConnected(true);
              setConnectedMcpServers(connectedServers);
              setMcpTools(allTools);
            }
          }
        } catch (parseError) {
          console.error('解析已保存的MCP服务器列表失败:', parseError);
        }
        
        console.log('设置已从localStorage同步到服务器');
      } catch (error) {
        console.error('同步设置到服务器失败:', error);
      }
    };
    
    syncSettingsToServer();
  }, []);

  // 添加beforeunload事件处理器
  useEffect(() => {
    const handleBeforeUnload = async (event: BeforeUnloadEvent) => {
      // 断开所有服务器连接
      for (const serverName of connectedMcpServers) {
        try {
          const response = await fetch('/api/mcp/disconnect', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ serverName }),
            // 添加keepalive选项，确保请求在页面关闭时也能完成
            keepalive: true
          });
          
          if (!response.ok) {
            console.error(`断开服务器 ${serverName} 失败:`, await response.text());
          } else {
            console.log(`已断开服务器连接: ${serverName}`);
          }
        } catch (err) {
          console.error(`断开服务器 ${serverName} 失败:`, err);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [connectedMcpServers]);

  const handleSendMessage = async (content: string) => {
    try {
      // 清除错误
      setError(null);
      
      // 设置加载状态
      setIsLoading(true);
      
      // 创建新的用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: [{ type: 'text', text: content }],
        createdAt: new Date(),
      };
      
      // 添加到消息列表
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      
      // 保存到会话存储
      sessionService.addMessage(currentSessionId, userMessage);
      
      // 获取MCP配置以便在请求中传递
      const mcpConfig = localStorage.getItem('mcp_config');
      
      // 准备请求数据
      const requestData = {
        messages: newMessages,
        mcpState: mcpConnected ? {
          connected: mcpConnected,
          connectedServers: connectedMcpServers,
          mcpConfig // 添加MCP配置
        } : undefined
      };
      
      // 发送请求到API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // 处理响应
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '无法获取回复');
      }
      
      // 解析响应
      const data = await response.json();
      
      // 将AI响应添加到消息列表
      const updatedMessages = [...newMessages, data.response];
      setMessages(updatedMessages);
      
      // 保存到会话存储
      sessionService.addMessage(currentSessionId, data.response);
      
      // 更新会话列表（可能有标题变更）
      setSessions(sessionService.getSessions());
    } catch (error: any) {
      console.error('发送消息出错:', error);
      setError(`请求失败: ${error.message || '未知错误'}`);
    } finally {
      // 清除加载状态
      setIsLoading(false);
    }
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    localStorage.setItem('llm_api_key', key);
    
    // 立即更新服务端ApiKey
    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ apiKey: key }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('设置API密钥失败');
      }
      return response.json();
    })
    .then(() => {
      // 清除错误信息
      if (error === '请先设置API密钥' || error === 'API密钥未设置') {
        setError(null);
      }
    })
    .catch(err => {
      console.error('更新API密钥失败:', err);
      setError('API密钥同步到服务端失败，请刷新页面重试');
    });
  };

  const handleModelNameChange = (name: string) => {
    setModelName(name);
    localStorage.setItem('model_name', name);
    
    // 立即更新服务端Model
    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelName: name }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('设置模型失败');
      }
      return response.json();
    })
    .catch(err => {
      console.error('更新模型失败:', err);
      setError('模型同步到服务端失败，请刷新页面重试');
    });
  };

  const handleBaseUrlChange = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem('llm_base_url', url);
    
    // 立即更新服务端BaseURL
    fetch('/api/config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ baseUrl: url }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('设置API基础URL失败');
      }
      return response.json();
    })
    .catch(err => {
      console.error('更新API基础URL失败:', err);
      setError('API基础URL同步到服务端失败，请刷新页面重试');
    });
  };

  const handleConnectMcpServer = async (serverName: string) => {
    // 最多尝试2次
    const maxRetries = 1;
    let retryCount = 0;
    let lastError: Error | null = null;

    // 清除之前的错误
    setError(null);
    
    // 显示连接中状态
    setError(`正在连接到MCP服务器 ${serverName}...`);
    
    // 获取浏览器本地存储的MCP配置
    const mcpConfig = localStorage.getItem('mcp_config');
    if (!mcpConfig) {
      setError('MCP配置未设置，请先在设置中配置MCP服务器');
      return;
    }
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`正在重试连接MCP服务器 (${retryCount}/${maxRetries})...`);
          // 显示重试信息给用户
          setError(`连接失败，正在重试... (${retryCount}/${maxRetries})`);
          // 重试前等待一段时间
          await new Promise(r => setTimeout(r, 3000));
        }
        
        const response = await fetch('/api/mcp/connect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            serverName,
            mcpConfig  // 传递MCP配置
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // 解析详细错误信息
          let errorMessage = data.error || '连接MCP服务器失败';
          
          // 提供更多用户友好的错误解释
          if (errorMessage.includes('Connection closed')) {
            errorMessage = `连接MCP服务器失败: 服务器启动后意外关闭。可能是工具包未安装或API密钥无效。`;
          } else if (errorMessage.includes('ENOENT')) {
            errorMessage = `连接MCP服务器失败: 无法找到指定的命令。请确保已安装所需的npm包。`;
          } else if (errorMessage.includes('timeout')) {
            errorMessage = `连接MCP服务器失败: 连接超时。服务器可能响应过慢或无法启动。`;
          }
          
          throw new Error(errorMessage);
        }

        // 成功连接，更新状态
        setMcpConnected(true);
        
        // 添加到已连接服务器列表
        setConnectedMcpServers(prev => {
          // 如果已经连接过，不重复添加
          if (prev.includes(serverName)) {
            return prev;
          }
          return [...prev, serverName];
        });
        
        // 更新工具列表，将新工具添加到现有工具中
        if (data.tools && Array.isArray(data.tools)) {
          setMcpTools(prev => {
            // 移除已有的同名工具(如果有)
            const filtered = prev.filter(tool => 
              !data.tools.some((newTool: McpTool) => newTool.name === tool.name && newTool.serverName === serverName)
            );
            return [...filtered, ...data.tools];
          });
        }
        
        // 保存到localstorage - 更新服务器列表
        const updatedServers = [...new Set([...connectedMcpServers, serverName])];
        localStorage.setItem('mcp_servers', JSON.stringify(updatedServers));
        
        setError(null);
        console.log(`已成功连接到MCP服务器: ${serverName}, 工具数量: ${data.tools?.length || 0}`);
        return;
      } catch (err: any) {
        console.error(`连接MCP服务器失败 (尝试 ${retryCount+1}/${maxRetries+1}):`, err);
        lastError = err instanceof Error ? err : new Error(String(err));
        retryCount++;
        
        // 如果已经到达最大重试次数，则退出循环
        if (retryCount > maxRetries) {
          break;
        }
      }
    }
    
    // 如果重试后仍然失败，则显示错误
    if (lastError) {
      // 构建更详细的错误信息
      let finalError = lastError.message || '连接MCP服务器失败';
      
      // 添加建议操作
      finalError += '\n\n可能的解决方案:\n1. 检查网络连接\n2. 确保相关npm包已安装\n3. 验证API密钥是否有效\n4. 检查MCP配置中的服务器设置是否正确';
      
      setError(finalError);
    }
  };
  
  const handleDisconnectMcpServer = async (serverName: string) => {
    try {
      setError(`正在断开MCP服务器 ${serverName} 连接...`);
      
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverName }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `断开MCP服务器 ${serverName} 失败`);
      }

      // 从已连接服务器列表中移除
      setConnectedMcpServers(prev => prev.filter(name => name !== serverName));
      
      // 移除此服务器的工具
      setMcpTools(prev => prev.filter(tool => tool.serverName !== serverName));
      
      // 如果没有其他连接的服务器，设置整体状态为未连接
      const updatedServers = connectedMcpServers.filter(name => name !== serverName);
      setMcpConnected(updatedServers.length > 0);
      
      // 更新localStorage
      localStorage.setItem('mcp_servers', JSON.stringify(updatedServers));
      
      setError(null);
    } catch (error: any) {
      console.error(`断开MCP服务器 ${serverName} 失败:`, error);
      setError(error.message || `断开MCP服务器 ${serverName} 失败`);
    }
  };

  // 历史记录相关处理函数
  const handleSelectSession = (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    
    // 切换到选中的会话
    setCurrentSessionId(sessionId);
    
    // 加载会话消息
    const sessionMessages = sessionService.getMessages(sessionId);
    setMessages(sessionMessages);
    
    // 清除错误信息
    setError(null);
    
    // 在移动设备上自动隐藏历史记录
    if (window.innerWidth < 768) {
      setShowHistory(false);
    }
  };

  const handleNewSession = () => {
    // 创建新会话
    const newSession = sessionService.createSession();
    setSessions(prev => [...prev, newSession]);
    setCurrentSessionId(newSession.id);
    setMessages([]);
    setError(null);
    
    // 在移动设备上自动隐藏历史记录
    if (window.innerWidth < 768) {
      setShowHistory(false);
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    // 删除会话
    const deleted = sessionService.deleteSession(sessionId);
    if (deleted) {
      setSessions(sessionService.getSessions());
      
      // 如果删除的是当前会话，则切换到另一个会话
      if (sessionId === currentSessionId) {
        const remaining = sessionService.getSessions();
        if (remaining.length > 0) {
          // 切换到最新的会话
          const nextSession = remaining[remaining.length - 1];
          setCurrentSessionId(nextSession.id);
          setMessages(sessionService.getMessages(nextSession.id));
        } else {
          // 如果没有会话，创建一个新会话
          const newSession = sessionService.createSession();
          setSessions([newSession]);
          setCurrentSessionId(newSession.id);
          setMessages([]);
        }
      }
    }
  };

  return (
    <div className="flex h-screen max-h-screen bg-white overflow-hidden">
      <ApiKeySync />
      
      {/* 聊天历史侧边栏 */}
      <ChatHistory 
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        isVisible={showHistory}
        onToggleVisibility={() => setShowHistory(!showHistory)}
      />
      
      {/* 主聊天区域 */}
      <div className={`flex flex-col flex-grow h-full w-0 ${showHistory ? 'md:ml-64' : ''}`}>
        <header className="flex justify-between items-center p-4 border-b bg-white">
          <div className="flex items-center">
            {/* 移动端菜单按钮 */}
            <button 
              className="md:hidden mr-3 text-gray-700"
              onClick={() => setShowHistory(!showHistory)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-blue-700 truncate">MCP-Chat</h1>
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <Settings 
              apiKey={apiKey}
              modelName={modelName}
              baseUrl={baseUrl}
              mcpConnected={mcpConnected}
              mcpTools={mcpTools}
              connectedMcpServers={connectedMcpServers}
              onApiKeyChange={handleApiKeyChange}
              onModelNameChange={handleModelNameChange}
              onBaseUrlChange={handleBaseUrlChange}
              onConnectMcpServer={handleConnectMcpServer}
              onDisconnectMcpServer={handleDisconnectMcpServer}
            />
          </div>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-4 w-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-2xl mb-4 font-bold text-blue-700">欢迎使用智能助手MCP-Chat</p>
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow-sm max-w-md">
                <ol className="list-decimal list-inside text-base space-y-3 text-gray-900">
                  <li className="font-medium">点击右上角按钮，配置模型和API密钥</li>
                  <li className="font-medium">点击右上角按钮，配置MCP服务器</li>
                  <li className="font-medium">直接在输入框中输入您的问题或指令开始对话</li>
                </ol>
              </div>

            </div>
          ) : (
            messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg shadow-sm">
              <p className="font-medium text-center">{error}</p>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center my-4">
              <div className="animate-pulse text-blue-700 font-bold text-lg flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                正在思考...
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-white">
          <ChatInput onSendMessage={handleSendMessage} loading={isLoading} />
        </div>
      </div>
    </div>
  );
}
