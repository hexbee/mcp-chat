import { useState, FormEvent, useEffect } from 'react';
import { McpTool } from '@/lib/mcp-manager';

// 提取为通用组件
function SettingsPanel({
  isOpen,
  onClose,
  title,
  children,
  wide = false
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className={`absolute right-0 top-10 ${wide ? 'w-[48rem]' : 'w-[32rem]'} bg-white border rounded shadow-lg p-4 z-10`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <button onClick={onClose} className="text-gray-700 hover:text-gray-900">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}

// 模型设置组件
interface ModelSettingsProps {
  apiKey: string;
  modelName: string;
  baseUrl: string;
  onApiKeyChange: (apiKey: string) => void;
  onModelNameChange: (modelName: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
}

export function ModelSettings({
  apiKey,
  modelName,
  baseUrl,
  onApiKeyChange,
  onModelNameChange,
  onBaseUrlChange,
}: ModelSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModelName, setLocalModelName] = useState(modelName);
  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl || 'https://api.anthropic.com');
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<null | { valid: boolean; message: string }>(null);

  // 当props更新时，同步更新本地状态
  useEffect(() => {
    setLocalApiKey(apiKey);
    setLocalModelName(modelName);
    setLocalBaseUrl(baseUrl || 'https://api.anthropic.com');
  }, [apiKey, modelName, baseUrl]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onApiKeyChange(localApiKey);
    onModelNameChange(localModelName);
    onBaseUrlChange(localBaseUrl);
    
    // 提供保存成功的反馈
    const saveSuccess = { valid: true, message: '设置已保存' };
    setApiKeyStatus(saveSuccess);
    
    // 短暂显示保存成功消息，然后关闭面板
    setTimeout(() => {
      setIsOpen(false);
      setApiKeyStatus(null);
    }, 1000);
  };

  const testApiKey = async () => {
    if (!localApiKey.trim()) {
      setApiKeyStatus({ valid: false, message: 'API密钥不能为空' });
      return;
    }

    setIsTestingApiKey(true);
    setApiKeyStatus(null);

    try {
      const response = await fetch('/api/test-api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          apiKey: localApiKey,
          baseUrl: localBaseUrl 
        }),
      });

      const data = await response.json();

      if (data.valid) {
        setApiKeyStatus({ valid: true, message: `API密钥有效，可用模型: ${data.model}` });
      } else {
        setApiKeyStatus({ valid: false, message: data.error || 'API密钥无效' });
      }
    } catch (error: any) {
      console.error('测试API密钥失败:', error);
      setApiKeyStatus({ valid: false, message: '测试API密钥时发生错误' });
    } finally {
      setIsTestingApiKey(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-blue-600 hover:text-blue-800 flex items-center border rounded-md"
        title={`模型设置: ${modelName}`}
      >
        <span className="mr-1">🤖</span>
        <span className="text-xs font-medium">{modelName}</span>
      </button>

      <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} title="模型设置">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">API Key</label>
            <div className="flex mb-2">
              <input
                type="password"
                value={localApiKey}
                onChange={(e) => {
                  setLocalApiKey(e.target.value);
                  setApiKeyStatus(null); // 清除状态
                }}
                className="flex-grow p-2 border rounded-l text-gray-900"
                placeholder="sk-..."
              />
              <button
                type="button"
                onClick={testApiKey}
                disabled={isTestingApiKey || !localApiKey.trim()}
                className="bg-blue-100 text-blue-700 px-2 py-1 rounded-r hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-500"
              >
                测试
              </button>
            </div>
            {apiKeyStatus && (
              <div className={`mt-1 text-sm ${apiKeyStatus.valid ? 'text-green-600' : 'text-red-600'}`}>
                {apiKeyStatus.message}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">API 基础URL</label>
            <input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              className="w-full p-2 border rounded text-gray-900"
              placeholder="https://api.anthropic.com"
            />
            <p className="text-xs text-gray-700 mt-1">如果使用代理或自定义服务，请修改</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-1">模型</label>
            <input
              type="text"
              value={localModelName}
              onChange={(e) => setLocalModelName(e.target.value)}
              className="w-full p-2 border rounded text-gray-900"
              placeholder="claude-3-7-sonnet-latest"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            保存设置
          </button>
        </form>
      </SettingsPanel>
    </div>
  );
}

// MCP服务器设置组件
interface McpSettingsProps {
  mcpConnected: boolean;
  mcpTools: McpTool[];
  connectedMcpServers: string[];
  onConnectMcpServer: (serverName: string) => Promise<void>;
  onDisconnectMcpServer: (serverName: string) => Promise<void>;
}

export function McpSettings({
  mcpConnected,
  mcpTools,
  connectedMcpServers,
  onConnectMcpServer,
  onDisconnectMcpServer,
}: McpSettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [availableServers, setAvailableServers] = useState<string[]>([]);
  const [connectingServer, setConnectingServer] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<McpTool | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 当组件加载时，获取可用服务器列表
  useEffect(() => {
    loadAvailableServers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当已连接服务器列表发生变化时，检查不再在配置中存在的服务器
  useEffect(() => {
    // 检查已连接但在当前可用服务器中不存在的服务器
    const serversToDisconnect = connectedMcpServers.filter(
      server => !availableServers.includes(server)
    );
    
    if (serversToDisconnect.length > 0) {
      console.log(`发现 ${serversToDisconnect.length} 个服务器不再存在于配置中，正在断开连接...`);
      
      serversToDisconnect.forEach(async (server) => {
        try {
          await onDisconnectMcpServer(server);
        } catch (error) {
          console.error(`断开不存在的服务器 ${server} 失败:`, error);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableServers, connectedMcpServers]);

  // 加载可用服务器
  const loadAvailableServers = () => {
    try {
      const storedMcpConfig = localStorage.getItem('mcp_config');
      if (storedMcpConfig) {
        const config = JSON.parse(storedMcpConfig);
        if (config.mcpServers) {
          const newAvailableServers = Object.keys(config.mcpServers);
          setAvailableServers(newAvailableServers);
        }
      }
    } catch (error) {
      console.error('解析MCP配置失败:', error);
    }
  };

  // 手动刷新可用服务器列表
  const refreshServerList = async () => {
    try {
      // 记录之前已连接的服务器，以便稍后重新连接
      const previouslyConnectedServers = [...connectedMcpServers];
      
      // 首先断开所有已连接的服务器
      for (const serverName of connectedMcpServers) {
        try {
          console.log(`刷新列表：断开服务器 ${serverName} 连接...`);
          await onDisconnectMcpServer(serverName);
        } catch (error) {
          console.error(`刷新时断开服务器 ${serverName} 失败:`, error);
        }
      }
      
      // 重新加载配置中的服务器列表
      loadAvailableServers();
      
      // 等待一小段时间确保配置已完全加载并且断开连接操作已完成
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 重新连接之前已连接的服务器（如果它们仍在配置中）
      const reconnected = [];
      for (const serverName of previouslyConnectedServers) {
        if (availableServers.includes(serverName)) {
          try {
            console.log(`正在重新连接服务器 ${serverName}...`);
            setConnectingServer(serverName);
            await onConnectMcpServer(serverName);
            reconnected.push(serverName);
          } catch (error) {
            console.error(`重新连接服务器 ${serverName} 失败:`, error);
          } finally {
            setConnectingServer(null);
          }
        } else {
          console.log(`服务器 ${serverName} 不再存在于配置中，跳过重新连接`);
        }
      }
      
      // 只在控制台输出刷新结果，不使用弹窗提示
      if (reconnected.length > 0) {
        console.log(`刷新完成：已重新连接 ${reconnected.length} 个服务器`);
      } else {
        console.log("刷新完成：配置已更新");
      }
    } catch (error) {
      console.error('刷新服务器列表失败:', error);
      alert("刷新过程中发生错误，请检查控制台日志。");
    }
  };

  // 对localStorage变化的响应也应该更彻底，但保持之前的连接状态
  useEffect(() => {
    const handleStorageChange = async (e: StorageEvent) => {
      if (e.key === 'mcp_config' && e.newValue) {
        console.log('检测到MCP配置变化，正在刷新连接...');
        
        // 记录之前已连接的服务器
        const previouslyConnectedServers = [...connectedMcpServers];
        
        // 断开所有已连接服务器
        for (const serverName of connectedMcpServers) {
          try {
            await onDisconnectMcpServer(serverName);
          } catch (error) {
            console.error(`配置变更时断开服务器 ${serverName} 失败:`, error);
          }
        }
        
        // 重新加载服务器列表
        loadAvailableServers();
        
        // 等待一小段时间确保配置已完全加载
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 重新连接之前已连接的服务器（如果它们仍在配置中）
        for (const serverName of previouslyConnectedServers) {
          if (availableServers.includes(serverName)) {
            try {
              console.log(`配置变更后重新连接服务器 ${serverName}...`);
              await onConnectMcpServer(serverName);
            } catch (error) {
              console.error(`配置变更后重新连接服务器 ${serverName} 失败:`, error);
            }
          }
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedMcpServers, availableServers]);

  // 连接单个服务器
  const handleConnectServer = async (serverName: string) => {
    if (connectedMcpServers.includes(serverName)) return; // 已连接则跳过
    
    setConnectingServer(serverName);
    try {
      // 先验证配置
      const mcpConfig = localStorage.getItem('mcp_config');
      if (!mcpConfig) {
        throw new Error('未找到MCP配置，请先设置配置');
      }

      // 检查配置中是否存在该服务器
      try {
        const config = JSON.parse(mcpConfig);
        if (!config.mcpServers || !config.mcpServers[serverName]) {
          throw new Error(`服务器 ${serverName} 在配置中不存在或配置无效`);
        }
      } catch (parseError) {
        throw new Error('解析MCP配置失败，配置可能不是有效的JSON');
      }

      // 连接服务器
      await onConnectMcpServer(serverName);
    } catch (error) {
      console.error(`连接MCP服务器 ${serverName} 失败`, error);
      // 显示错误信息对话框
      alert(`连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setConnectingServer(null);
    }
  };
  
  // 断开单个服务器
  const handleDisconnectServer = async (serverName: string) => {
    setConnectingServer(serverName);
    try {
      await onDisconnectMcpServer(serverName);
    } catch (error) {
      console.error(`断开MCP服务器 ${serverName} 失败`, error);
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
  
  // 计算连接状态样式
  const statusStyle = mcpConnected 
    ? "text-green-600 bg-green-50 border-green-200" 
    : "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 flex items-center text-sm border rounded-md ${statusStyle} hover:bg-opacity-80`}
        title="MCP服务器连接"
      >
        {mcpConnected ? (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1.5"></span>
            <span>已连接 ({mcpTools.length})</span>
          </>
        ) : (
          <>
            <span className="inline-block w-2 h-2 rounded-full bg-gray-300 mr-1.5"></span>
            <span>未连接</span>
          </>
        )}
      </button>

      <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} title="MCP服务器设置">
        <div className="mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">服务器列表</h3>
            <button 
              onClick={refreshServerList}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
              title="刷新服务器列表"
            >
              刷新列表
            </button>
          </div>
          
          {/* 服务器列表 */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            {availableServers.length > 0 ? (
              <>
                <div className="mb-2 flex justify-between">
                  <div className="text-sm font-medium text-gray-700">可用服务器</div>
                </div>

                <ul className="divide-y divide-gray-100">
                  {availableServers.map(server => {
                    const isConnected = connectedMcpServers.includes(server);
                    const isConnecting = connectingServer === server;
                    const toolCount = toolsByServer[server]?.length || 0;
                    
                    // 状态样式
                    const statusDot = isConnected 
                      ? "bg-green-500" // 已连接 - 绿色
                      : "bg-red-500";  // 未连接 - 红色
                    
                    return (
                      <li key={server} className="py-2 flex justify-between items-center">
                        <div className="flex items-center">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDot} mr-2`}></span>
                          <span className="text-sm font-medium text-gray-800">{server}</span>
                          {isConnected && (
                            <span className="ml-2 text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200">
                              {toolCount}个工具
                            </span>
                          )}
                        </div>
                        <div>
                          {isConnected ? (
                            <button
                              onClick={() => handleDisconnectServer(server)}
                              disabled={isConnecting}
                              className="text-xs px-2 py-1 text-red-600 hover:text-white hover:bg-red-500 rounded border border-red-300 hover:border-red-500"
                            >
                              {isConnecting ? '断开中...' : '断开'}
                            </button>
                          ) : (
                            <button
                              onClick={() => handleConnectServer(server)}
                              disabled={isConnecting}
                              className="text-xs px-2 py-1 text-blue-600 hover:text-white hover:bg-blue-500 rounded border border-blue-300 hover:border-blue-500"
                            >
                              {isConnecting ? '连接中...' : '连接'}
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="text-sm text-gray-500 italic p-4 text-center">
                未找到服务器配置<br />
                请先在MCP配置中添加服务器
              </p>
            )}
          </div>
        </div>

        {mcpConnected && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-gray-900">可用工具</label>
              {selectedTool && (
                <button 
                  onClick={() => setSelectedTool(null)} 
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  关闭所有详情
                </button>
              )}
            </div>
            <div className="bg-gray-100 p-2 rounded text-sm max-h-[40rem] overflow-y-auto"
                 style={{ minHeight: "400px" }}>
              {mcpTools.length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(toolsByServer).map(([server, tools]) => (
                    <div key={server} className="mb-1 last:mb-0 pb-1 border-b border-gray-200 last:border-0">
                      <div className="flex items-center mb-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                        <h5 className="font-semibold text-gray-700">{server}</h5>
                        <span className="ml-2 text-xs text-gray-500">({tools.length}个工具)</span>
                      </div>
                      <ul className="list-disc pl-5 text-gray-800 space-y-0.5 text-sm">
                        {tools.map((tool) => (
                          <li 
                            key={`${server}-${tool.name}`} 
                            className="text-gray-800 leading-tight py-0.5 cursor-pointer hover:text-blue-600"
                            onClick={() => setSelectedTool(selectedTool?.name === tool.name ? null : tool)}
                            title="点击查看详情"
                          >
                            <span className="font-medium">{tool.name}</span>
                            {tool.description && (
                              <span className="text-xs text-gray-500 ml-1">- {tool.description}</span>
                            )}
                            {selectedTool?.name === tool.name && (
                              <div className="mt-2 mb-2 pl-3 border-l-2 border-blue-300 bg-blue-50 p-2 rounded-r text-xs text-gray-700">
                                <div className="flex justify-between items-center">
                                  <div className="font-semibold text-blue-800">工具详情</div>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTool(null);
                                    }}
                                    className="text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    关闭
                                  </button>
                                </div>
                                {tool.input_schema && (
                                  <div className="mt-2">
                                    <div className="mb-1 text-gray-600 font-medium">参数结构:</div>
                                    <pre className="mt-1 p-2 bg-gray-50 border border-gray-200 rounded overflow-x-auto text-xs font-mono leading-relaxed">
                                      {JSON.stringify(tool.input_schema, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-800">无可用工具</p>
              )}
            </div>
          </div>
        )}
      </SettingsPanel>
    </div>
  );
}

// MCP配置组件 - 新增
export function McpConfigSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [mcpConfig, setMcpConfig] = useState<string>('');
  const [mcpConfigError, setMcpConfigError] = useState<string | null>(null);

  // 默认MCP服务器配置
  const defaultMcpConfig = JSON.stringify({
    "mcpServers": {
      "filesystem": {
        "command": "npx",
        "args": [
          "--yes",
          "@modelcontextprotocol/server-filesystem",
          "/tmp/"
        ]
      }
    }
  }, null, 2);

  // 组件加载时读取配置
  useEffect(() => {
    const storedMcpConfig = localStorage.getItem('mcp_config');
    if (storedMcpConfig) {
      setMcpConfig(storedMcpConfig);
    } else {
      setMcpConfig(defaultMcpConfig);
      localStorage.setItem('mcp_config', defaultMcpConfig);
    }
  }, []);

  // 验证MCP配置有效性
  const validateMcpConfig = (config: string): boolean => {
    try {
      const parsedConfig = JSON.parse(config);

      // 检查基本结构
      if (!parsedConfig.mcpServers || typeof parsedConfig.mcpServers !== 'object') {
        setMcpConfigError('配置必须包含mcpServers对象');
        return false;
      }

      // 检查每个服务器配置
      const servers = Object.keys(parsedConfig.mcpServers);
      if (servers.length === 0) {
        setMcpConfigError('配置中没有定义服务器');
        return false;
      }

      for (const server of servers) {
        const serverConfig = parsedConfig.mcpServers[server];

        // 检查必要字段
        if (!serverConfig.command) {
          setMcpConfigError(`服务器 ${server} 缺少command字段`);
          return false;
        }

        if (!serverConfig.args || !Array.isArray(serverConfig.args)) {
          setMcpConfigError(`服务器 ${server} 缺少args字段或args不是数组`);
          return false;
        }

        // 检查环境变量格式
        if (serverConfig.env && typeof serverConfig.env !== 'object') {
          setMcpConfigError(`服务器 ${server} 的env字段必须是对象`);
          return false;
        }
      }

      setMcpConfigError(null);
      return true;
    } catch (e) {
      setMcpConfigError('JSON格式无效');
      return false;
    }
  };

  // 重置MCP配置为默认值
  const resetMcpConfig = () => {
    setMcpConfig(defaultMcpConfig);
    localStorage.setItem('mcp_config', defaultMcpConfig);
    setMcpConfigError(null);
  };

  // 保存MCP配置
  const saveMcpConfig = () => {
    if (validateMcpConfig(mcpConfig)) {
      localStorage.setItem('mcp_config', mcpConfig);
      // 提示用户配置已保存
      alert("MCP配置已保存，服务器配置已更新");
      
      // 关闭配置面板
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 flex items-center text-sm border rounded-md bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
        title="MCP服务器配置"
      >
        <span className="mr-1">⚙️</span>
        <span className="text-xs font-medium">MCP配置</span>
      </button>

      <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} title="MCP 服务器配置" wide={true}>
        <div className={`mb-4 ${mcpConfigError ? 'text-red-500' : ''}`}>
          <label className="block text-sm font-medium mb-1 text-gray-900">自定义MCP服务器配置 (JSON)</label>
          <textarea
            value={mcpConfig}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMcpConfig(e.target.value)}
            placeholder="输入MCP服务器配置..."
            className="w-full h-96 p-2 border rounded font-mono text-sm text-black bg-white border-gray-300 whitespace-pre overflow-x-auto"
            wrap="off"
          />
          {mcpConfigError && (
            <p className="mt-1 text-sm text-red-600 font-medium">{mcpConfigError}</p>
          )}
          <div className="flex space-x-4 mt-2">
            <button 
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              onClick={saveMcpConfig}
              type="button"
            >
              保存配置
            </button>
            <button 
              className="px-3 py-1 text-sm border border-gray-400 rounded hover:bg-gray-100 text-gray-800 font-medium"
              onClick={resetMcpConfig}
              type="button"
            >
              重置为默认值
            </button>
          </div>
          <p className="text-xs mt-2 text-gray-700 font-medium">
            配置会保存在浏览器本地存储中，不会上传到服务器。配置保存后需要重新连接MCP服务器。
          </p>
        </div>
      </SettingsPanel>
    </div>
  );
}

// 修改SettingsProps接口
interface SettingsProps {
  apiKey: string;
  modelName: string;
  baseUrl: string;
  mcpConnected: boolean;
  mcpTools: McpTool[];
  connectedMcpServers: string[];
  onApiKeyChange: (apiKey: string) => void;
  onModelNameChange: (modelName: string) => void;
  onBaseUrlChange: (baseUrl: string) => void;
  onConnectMcpServer: (serverName: string) => Promise<void>;
  onDisconnectMcpServer: (serverName: string) => Promise<void>;
}

export default function Settings(props: SettingsProps) {
  // 为了向后兼容，返回三个组件
  return (
    <>
      <ModelSettings
        apiKey={props.apiKey}
        modelName={props.modelName}
        baseUrl={props.baseUrl}
        onApiKeyChange={props.onApiKeyChange}
        onModelNameChange={props.onModelNameChange}
        onBaseUrlChange={props.onBaseUrlChange}
      />
      <McpSettings
        mcpConnected={props.mcpConnected}
        mcpTools={props.mcpTools}
        connectedMcpServers={props.connectedMcpServers}
        onConnectMcpServer={props.onConnectMcpServer}
        onDisconnectMcpServer={props.onDisconnectMcpServer}
      />
      <McpConfigSettings />
    </>
  );
} 