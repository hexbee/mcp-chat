import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

export interface McpTool {
  name: string;
  description: string | undefined;
  input_schema: any;
  serverName: string; // 添加服务器名称，用于标识工具来自哪个服务器
}

export interface McpServerConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

// 表示一个MCP服务器的连接实例
interface McpServerConnection {
  serverName: string;
  mcp: Client;
  transport: StdioClientTransport | null;
  tools: McpTool[];
  isConnected: boolean;
}

class McpManager {
  private serverConnections: Map<string, McpServerConnection> = new Map();
  private config: McpServerConfig | null = null;

  constructor() {
    // 构造函数为空，不再创建默认Client实例
    this.loadConfigFromFile();
  }

  // 从文件加载配置
  private loadConfigFromFile(): void {
    try {
      // 不再从文件加载配置，但保留此方法以保持兼容性
      console.log('配置现在通过API传递，不再使用配置文件');
      // 如果已经有配置了，则不需要做任何事
      if (this.config) {
        return;
      }
      // 如果没有配置，创建一个空的默认配置
      this.config = {
        mcpServers: {}
      };
    } catch (error) {
      console.error('加载MCP配置失败:', error);
    }
  }

  // 设置配置
  setConfig(config: McpServerConfig): void {
    this.config = config;
    console.log('已设置MCP配置');
  }

  // 获取所有已连接的服务器名称
  getConnectedServers(): string[] {
    return Array.from(this.serverConnections.entries())
      .filter(([_, conn]) => conn.isConnected)
      .map(([name, _]) => name);
  }

  // 获取特定服务器的连接状态
  isSpecificServerConnected(serverName: string): boolean {
    return this.serverConnections.get(serverName)?.isConnected || false;
  }

  // 获取所有工具，包括来自所有已连接服务器的工具
  getAllTools(): McpTool[] {
    const allTools: McpTool[] = [];
    for (const connection of this.serverConnections.values()) {
      if (connection.isConnected) {
        allTools.push(...connection.tools);
      }
    }
    return allTools;
  }

  // 兼容旧API
  getTools(): McpTool[] {
    return this.getAllTools();
  }

  // 检查是否有任何服务器连接
  hasAnyServerConnected(): boolean {
    return this.getConnectedServers().length > 0;
  }

  // 兼容旧API
  isServerConnected(): boolean {
    return this.hasAnyServerConnected();
  }

  // 连接到特定的MCP服务器
  async connectToServer(serverName: string, retryCount = 2, timeoutMs = 10000): Promise<McpTool[]> {
    // 如果服务器已连接，先清理现有连接
    if (this.serverConnections.has(serverName) && this.serverConnections.get(serverName)!.isConnected) {
      try {
        await this.disconnectServer(serverName);
      } catch (cleanupError) {
        console.warn(`清理 ${serverName} 服务器连接时出错，将继续尝试新连接:`, cleanupError);
      }
    }

    let lastError: any = null;
    
    // 重试机制
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        console.log(`MCP服务器 ${serverName} 连接重试 (${attempt}/${retryCount})...`);
        // 在重试前等待一小段时间
        await new Promise(r => setTimeout(r, 1000));
      }
      
      try {
        // 优先使用设置的配置，如果没有则从文件读取
        if (!this.config) {
          this.loadConfigFromFile();
        }

        if (!this.config) {
          throw new Error(`MCP配置未设置或无法加载`);
        }

        if (!this.config.mcpServers[serverName]) {
          throw new Error(`MCP server "${serverName}" not found in config`);
        }

        const serverConfig = this.config.mcpServers[serverName];
        
        // 检查命令和参数是否有效
        if (!serverConfig.command || !Array.isArray(serverConfig.args)) {
          throw new Error(`MCP server "${serverName}" 配置无效: 必须提供command和args`);
        }
        
        console.log(`正在启动MCP服务器: ${serverName}`);
        console.log(`执行命令: ${serverConfig.command} ${serverConfig.args.join(' ')}`);

        // 创建新的连接实例
        const client = new Client({ name: "mcp-chat-app", version: "1.0.0" });
        let transport: StdioClientTransport | null = null;

        // 初始化transport
        try {
          transport = new StdioClientTransport({
            command: serverConfig.command,
            args: serverConfig.args,
            env: {
              ...process.env,  // 继承当前进程的环境变量
              ...serverConfig.env, // 添加配置中指定的环境变量
              NODE_ENV: process.env.NODE_ENV || 'development', // 确保NODE_ENV被正确传递
            }
          });
        } catch (transportError: any) {
          console.error(`创建MCP传输层失败:`, transportError);
          throw new Error(`无法创建MCP传输层: ${transportError?.message || '未知错误'}`);
        }

        // 设置连接超时
        const connectionPromise = new Promise<McpTool[]>(async (resolve, reject) => {
          try {
            // 连接到服务器
            try {
              client.connect(transport!);
              console.log(`成功连接到MCP服务器 ${serverName}`);
            } catch (connectError: any) {
              // 特别处理"Connection closed"错误
              if (connectError.message && connectError.message.includes("Connection closed")) {
                console.error("MCP连接被意外关闭，可能是服务器启动失败");
                // 添加更多诊断信息
                reject(new Error(`MCP服务器连接失败: 连接被意外关闭，可能是服务器启动失败或命令不正确`));
              } else {
                reject(connectError);
              }
              return;
            }

            // 获取可用工具列表
            try {
              const toolsResult = await client.listTools();
              // 将工具与服务器名称关联
              const serverTools = toolsResult.tools.map((tool) => {
                return {
                  name: tool.name,
                  description: tool.description || "",
                  input_schema: tool.inputSchema,
                  serverName: serverName,
                };
              });
              
              // 创建并保存连接实例
              const serverConnection: McpServerConnection = {
                serverName,
                mcp: client,
                transport,
                tools: serverTools,
                isConnected: true
              };
              
              // 保存到连接映射
              this.serverConnections.set(serverName, serverConnection);
              
              console.log(`成功获取MCP服务器 ${serverName} 的工具, 共 ${serverTools.length} 个工具`);
              resolve(serverTools);
            } catch (listToolsError) {
              // 如果获取工具列表失败，也要清理资源
              console.error(`获取MCP工具列表失败:`, listToolsError);
              
              if (transport) {
                try {
                  await transport.close();
                } catch (closeError) {
                  console.error("关闭transport失败:", closeError);
                }
              }
              
              reject(listToolsError);
            }
          } catch (connError: any) {
            // 确保在连接失败时清理资源
            if (transport) {
              try {
                await transport.close();
              } catch (closeError) {
                console.error("关闭transport失败:", closeError);
              }
            }
            
            // 特别处理"Connection closed"错误
            if (connError.message && connError.message.includes("Connection closed")) {
              console.error("MCP连接被意外关闭，可能是服务器启动失败");
              // 添加更多诊断信息
              reject(new Error(`MCP服务器连接失败: 连接被意外关闭，可能是服务器启动失败或命令不正确`));
            } else {
              reject(connError);
            }
          }
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`连接到MCP服务器超时 (${timeoutMs}ms)`)), timeoutMs);
        });

        // 使用Promise.race实现超时
        return await Promise.race([connectionPromise, timeoutPromise]);
      } catch (error) {
        lastError = error;
        console.error(`连接到MCP服务器 ${serverName} 失败 (尝试 ${attempt+1}/${retryCount+1}): `, error);
        
        // 最后一次尝试失败时才抛出错误
        if (attempt === retryCount) {
          throw error;
        }
      }
    }

    // 理论上代码不会执行到这里，但为了类型安全
    throw lastError || new Error("无法连接到MCP服务器");
  }

  // 断开特定服务器的连接
  async disconnectServer(serverName: string): Promise<void> {
    const connection = this.serverConnections.get(serverName);
    if (!connection || !connection.isConnected) {
      return; // 服务器未连接，无需断开
    }

    try {
      // 清理连接资源
      try {
        await connection.mcp.close();
      } catch (error) {
        console.warn(`关闭MCP服务器 ${serverName} 连接时出错，将忽略此错误:`, error);
      } finally {
        if (connection.transport) {
          try {
            await connection.transport.close();
          } catch (transportError) {
            console.warn(`关闭 ${serverName} transport时出错:`, transportError);
          }
        }
        
        // 更新连接状态
        connection.isConnected = false;
        connection.tools = [];
        connection.transport = null;
        
        // 更新映射
        this.serverConnections.set(serverName, connection);
      }
    } catch (error) {
      console.error(`断开MCP服务器 ${serverName} 连接时出错:`, error);
      throw error;
    }
  }

  // 断开所有服务器连接
  async disconnectAll(): Promise<void> {
    const serverNames = Array.from(this.serverConnections.keys());
    for (const name of serverNames) {
      try {
        await this.disconnectServer(name);
      } catch (error) {
        console.error(`断开服务器 ${name} 失败:`, error);
      }
    }
  }

  // 调用特定工具
  async callTool({ name, args }: { name: string; args: any }) {
    // 查找哪个服务器有这个工具
    let targetServer: McpServerConnection | undefined;
    
    for (const conn of this.serverConnections.values()) {
      if (conn.isConnected && conn.tools.some(t => t.name === name)) {
        targetServer = conn;
        break;
      }
    }
    
    if (!targetServer) {
      throw new Error(`未找到支持工具 "${name}" 的已连接MCP服务器`);
    }

    console.log(`准备调用MCP工具: ${name} (服务器: ${targetServer.serverName})`, args);
    
    try {
      const result = await targetServer.mcp.callTool({
        name,
        arguments: args,
      });
      
      console.log(`MCP工具 ${name} 调用成功`);
      return result;
    } catch (error) {
      console.error(`MCP工具 ${name} 调用失败:`, error);
      throw error;
    }
  }

  // 旧的方法保留，但更改实现为调用新方法
  async cleanup() {
    await this.disconnectAll();
  }
}

// 使用单例模式
const mcpManager = new McpManager();
export default mcpManager; 