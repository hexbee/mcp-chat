import React, { useState, useEffect, useCallback } from 'react';
import mcpManager, { McpTool } from "@/lib/mcp-manager";

// 节流函数：限制函数在一定时间内只能执行一次
const throttle = (fn: Function, delay: number) => {
  let lastCall = 0;
  return function(...args: any[]) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
};

interface ServerSelectorProps {
  connectedServers: string[];
  mcpTools: McpTool[];
  onConnectServer: (serverName: string) => Promise<void>;
  onDisconnectServer: (serverName: string) => Promise<void>;
  inSettingsPanel?: boolean; // 是否在设置面板中使用
}

export default function ServerSelector({
  connectedServers,
  mcpTools,
  onConnectServer,
  onDisconnectServer,
  inSettingsPanel = false
}: ServerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  const [connectingServer, setConnectingServer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 加载可用服务器列表
  useEffect(() => {
    loadAvailableServers();
  }, []);

  // 加载可用服务器
  const loadAvailableServers = useCallback(() => {
    try {
      const storedMcpConfig = localStorage.getItem('mcp_config');
      if (storedMcpConfig) {
        const config = JSON.parse(storedMcpConfig);
        if (config.mcpServers) {
          const newAvailableServers = Object.keys(config.mcpServers);
          setAvailableServers(newAvailableServers);
        } else {
          setAvailableServers([]);
        }
      } else {
        setAvailableServers([]);
      }
    } catch (error) {
      console.error('解析MCP配置失败:', error);
      setError('无法加载服务器配置');
      setAvailableServers([]);
    }
  }, []);

  // 带节流的刷新函数 - 每2秒最多执行一次
  const handleRefresh = useCallback(throttle(() => {
    setIsRefreshing(true);
    setError(null);
    
    // 显示加载状态
    console.log('刷新服务器列表...');
    
    // 加载服务器列表
    loadAvailableServers();
    
    // 设置短暂的加载动画
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, 2000), [loadAvailableServers]);

  // 连接服务器
  const handleConnectServer = async (serverName: string) => {
    if (connectedServers.includes(serverName)) return;
    
    setConnectingServer(serverName);
    setError(null);
    
    try {
      await onConnectServer(serverName);
    } catch (error: any) {
      setError(error.message || '连接服务器失败');
    } finally {
      setConnectingServer(null);
    }
  };

  // 断开服务器
  const handleDisconnectServer = async (serverName: string) => {
    setConnectingServer(serverName);
    setError(null);
    
    try {
      await onDisconnectServer(serverName);
    } catch (error: any) {
      setError(error.message || '断开服务器失败');
    } finally {
      setConnectingServer(null);
    }
  };

  // 按服务器对工具进行分组
  const getToolsByServer = () => {
    const toolsByServer: Record<string, McpTool[]> = {};
    
    mcpTools.forEach(tool => {
      if (!toolsByServer[tool.serverName]) {
        toolsByServer[tool.serverName] = [];
      }
      toolsByServer[tool.serverName].push(tool);
    });
    
    return toolsByServer;
  };

  const toolsByServer = getToolsByServer();
  const connectedToolsCount = mcpTools.length;
  const connectedServerCount = connectedServers.length;

  // 如果在设置面板中，直接显示服务器列表
  if (inSettingsPanel) {
    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-base font-medium text-gray-800">可用服务器</h4>
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`text-blue-600 hover:text-blue-700 p-1 rounded ${isRefreshing ? 'opacity-70' : ''}`}
            title="刷新服务器列表"
          >
            <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {availableServers.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {availableServers.map(server => {
              const isConnected = connectedServers.includes(server);
              const toolsCount = toolsByServer[server]?.length || 0;
              const isConnecting = connectingServer === server;
              
              return (
                <li key={server} className="py-2 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{server}</span>
                    <span className="text-xs text-gray-500">
                      {isConnected 
                        ? `已连接 (${toolsCount} 个工具)` 
                        : '未连接'}
                    </span>
                  </div>
                  
                  <div>
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnectServer(server)}
                        disabled={isConnecting}
                        className="text-xs px-2 py-1 text-red-600 hover:text-white hover:bg-red-500 rounded border border-red-300 hover:border-red-500 disabled:opacity-50"
                      >
                        {isConnecting ? '断开中...' : '断开'}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnectServer(server)}
                        disabled={isConnecting}
                        className="text-xs px-2 py-1 text-blue-600 hover:text-white hover:bg-blue-500 rounded border border-blue-300 hover:border-blue-500 disabled:opacity-50"
                      >
                        {isConnecting ? '连接中...' : '连接'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-center text-gray-500 py-4">未找到可用服务器</p>
        )}
        
        {error && (
          <div className="mt-3 p-2 bg-red-50 text-red-600 rounded border border-red-200 text-sm">
            {error}
          </div>
        )}

        {connectedServers.length > 0 && (
          <div className="mt-4">
            <h4 className="text-base font-medium text-gray-800 mb-2">已连接工具列表</h4>
            <div className="bg-white p-2 rounded-md border border-gray-200">
              {Object.entries(toolsByServer).map(([server, tools]) => (
                tools.length > 0 && (
                  <div key={server} className="mb-2">
                    <h5 className="text-sm font-medium text-gray-700">{server}</h5>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tools.map(tool => (
                        <span 
                          key={tool.name} 
                          className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                          title={tool.description}
                        >
                          {tool.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 flex items-center text-sm border rounded-md ${
          connectedServerCount > 0 
            ? "text-green-600 bg-green-50 border-green-200" 
            : "text-gray-600 bg-gray-50 border-gray-200"
        } hover:bg-opacity-80`}
        title="MCP服务器"
      >
        {connectedServerCount > 0 ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
            <span>MCP Servers:{connectedServerCount} | MCP Tools:{connectedToolsCount}</span>
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1.5"></span>
            <span>选择服务器</span>
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">可用服务器</h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={`text-blue-600 hover:text-blue-700 ${isRefreshing ? 'opacity-70' : ''}`}
                  title="刷新服务器列表"
                >
                  <svg className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                  title="关闭"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto p-3">
            {availableServers.length > 0 ? (
              <ul className="space-y-2">
                {availableServers.map(server => {
                  const isConnected = connectedServers.includes(server);
                  const toolsCount = toolsByServer[server]?.length || 0;
                  const isConnecting = connectingServer === server;
                  
                  return (
                    <li key={server} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{server}</span>
                        <span className="text-xs text-gray-500">
                          {isConnected 
                            ? `已连接 (${toolsCount} 个工具)` 
                            : '未连接'}
                        </span>
                      </div>
                      
                      <div>
                        {isConnected ? (
                          <button
                            onClick={() => handleDisconnectServer(server)}
                            disabled={isConnecting}
                            className="text-xs px-2 py-1 text-red-600 hover:text-white hover:bg-red-500 rounded border border-red-300 hover:border-red-500 disabled:opacity-50"
                          >
                            {isConnecting ? '断开中...' : '断开'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleConnectServer(server)}
                            disabled={isConnecting}
                            className="text-xs px-2 py-1 text-blue-600 hover:text-white hover:bg-blue-500 rounded border border-blue-300 hover:border-blue-500 disabled:opacity-50"
                          >
                            {isConnecting ? '连接中...' : '连接'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-center text-gray-500 py-4">未找到可用服务器</p>
            )}
            
            {error && (
              <div className="mt-3 p-2 bg-red-50 text-red-600 rounded border border-red-200 text-sm">
                {error}
              </div>
            )}
            
            {connectedServers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">已连接工具</h4>
                <ul className="text-sm text-gray-600">
                  {Object.entries(toolsByServer).map(([server, tools]) => (
                    tools.length > 0 && (
                      <li key={server} className="mb-2">
                        <div className="font-medium text-xs text-gray-500 mb-1">{server}:</div>
                        <div className="flex flex-wrap gap-1">
                          {tools.map(tool => (
                            <span 
                              key={tool.name} 
                              className="inline-block px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs"
                              title={tool.description}
                            >
                              {tool.name}
                            </span>
                          ))}
                        </div>
                      </li>
                    )
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 