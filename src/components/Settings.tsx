import { useState, FormEvent, useEffect } from 'react';
import { McpTool } from '@/lib/mcp-manager';
import ServerSelector from '@/components/ServerSelector';

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
    
    // 短暂显示保存成功消息
    setTimeout(() => {
      setApiKeyStatus(null);
    }, 2000);
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
    <div>
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
    </div>
  );
}

// MCP配置组件 - 新增
export function McpConfigSettings() {
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
    }
  };

  return (
    <div>
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
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'model' | 'servers' | 'config'>('model');

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 flex items-center text-sm border rounded-md border-gray-300 bg-white hover:bg-gray-50"
        title="设置"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="ml-1">设置</span>
      </button>

      <SettingsPanel isOpen={isOpen} onClose={() => setIsOpen(false)} title="设置" wide={true}>
        <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'model'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('model')}
          >
            模型设置
          </button>
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'servers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('servers')}
          >
            服务器选择
          </button>
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('config')}
          >
            MCP配置
          </button>
        </div>

        {activeTab === 'model' && (
          <div className="p-1">
            <h3 className="text-lg font-medium text-gray-900 mb-3">模型设置</h3>
            <p className="text-sm text-gray-600 mb-4">
              设置您的 Anthropic API 密钥、基础URL和模型名称。API密钥用于与 Claude 模型通信。
            </p>
            <ModelSettings
              apiKey={props.apiKey}
              modelName={props.modelName}
              baseUrl={props.baseUrl}
              onApiKeyChange={props.onApiKeyChange}
              onModelNameChange={props.onModelNameChange}
              onBaseUrlChange={props.onBaseUrlChange}
            />
          </div>
        )}

        {activeTab === 'servers' && (
          <div className="p-1">
            <h3 className="text-lg font-medium text-gray-900 mb-3">MCP服务器</h3>
            <p className="text-sm text-gray-600 mb-4">
              在这里您可以管理MCP服务器的连接。连接的服务器将提供额外的工具功能。
            </p>
            <div className="bg-gray-50 p-4 rounded border border-gray-200">
              <ServerSelector 
                connectedServers={props.connectedMcpServers}
                mcpTools={props.mcpTools}
                onConnectServer={props.onConnectMcpServer}
                onDisconnectServer={props.onDisconnectMcpServer}
                inSettingsPanel={true}
              />
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="p-1">
            <h3 className="text-lg font-medium text-gray-900 mb-3">MCP服务器配置</h3>
            <p className="text-sm text-gray-600 mb-4">
              在这里您可以编辑MCP服务器的JSON配置。修改配置后，您需要重新连接服务器才能使配置生效。
            </p>
            <McpConfigSettings />
          </div>
        )}
      </SettingsPanel>
    </div>
  );
} 