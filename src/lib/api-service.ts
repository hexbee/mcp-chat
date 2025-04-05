import { Anthropic } from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import mcpManager, { McpTool } from "./mcp-manager";

// 定义消息类型
export type MessageRole = 'user' | 'assistant' | 'system';

export interface MessageContent {
  type: 'text' | 'tool_use' | 'tool_result';
  text?: string;
  tool?: {
    name: string;
    args: any;
    result?: any;
  };
}

export interface Message {
  id: string;
  role: MessageRole;
  content: MessageContent[];
  createdAt: Date;
}

class ApiService {
  private anthropic: Anthropic | null = null;
  private modelName: string = 'claude-3-7-sonnet-latest';
  private baseUrl: string = 'https://api.anthropic.com';
  private isInitialized: boolean = false;

  constructor() {
    this.initAnthropicClient();
  }

  private initAnthropicClient() {
    // 初始化Anthropic客户端（如果有API密钥）
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const baseUrl = process.env.ANTHROPIC_BASE_URL;
    const modelName = process.env.MODEL_NAME;
    
    if (apiKey) {
      try {
        this.anthropic = new Anthropic({
          apiKey,
          baseURL: baseUrl || this.baseUrl,
        });
        this.isInitialized = true;
        console.log('Anthropic客户端初始化成功');
      } catch (error) {
        console.error('Anthropic客户端初始化失败:', error);
        this.anthropic = null;
        this.isInitialized = false;
      }
    }
    
    if (baseUrl) {
      this.baseUrl = baseUrl;
    }
    
    if (modelName) {
      this.modelName = modelName;
    }
  }

  async sendMessage(messages: Message[]): Promise<Message> {
    if (!this.isInitialized) {
      // 如果未初始化，尝试再次初始化
      this.initAnthropicClient();
    }
    
    if (!this.anthropic) {
      throw new Error("Anthropic API密钥未设置");
    }

    // 转换消息格式为Anthropic API格式
    const anthropicMessages: MessageParam[] = messages.map(msg => {
      if (msg.content.length === 0 || (msg.content.length === 1 && msg.content[0].type === 'text')) {
        // 简单的文本消息
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content.length === 0 ? "" : (msg.content[0].text || ""),
        };
      } else {
        // 包含多个内容块的消息
        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content
            .filter(c => c.type === 'text')
            .map(c => ({ type: 'text' as const, text: c.text || "" })),
        };
      }
    });

    // 获取MCP工具
    const tools = mcpManager.getTools().map(tool => ({
      name: tool.name,
      description: tool.description || "",
      input_schema: tool.input_schema,
    }));

    console.log('正在发送请求到Anthropic，MCP工具数量:', tools.length);
    if (tools.length > 0) {
      console.log('可用MCP工具:', tools.map(t => t.name).join(', '));
    }

    // 初始化最终的消息内容
    const messageContent: MessageContent[] = [];
    
    // 准备消息历史 - 使用原始消息作为起点
    let conversationHistory = [...anthropicMessages];
    
    // 控制是否继续执行工具调用循环
    let shouldContinue = true;
    // 记录是否有工具调用
    let hasAnyToolCalls = false;
    // 最多允许的工具调用轮次
    const maxIterations = 20;
    let iterations = 0;
    
    // 跟踪已调用的工具，避免循环
    const calledTools: {name: string, input: string}[] = [];
    
    while (shouldContinue && iterations < maxIterations) {
      iterations++;
      console.log(`开始第 ${iterations} 轮工具调用循环`);
      
      // 调用Anthropic API获取响应
      const response = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 1000,
        messages: conversationHistory,
        ...(tools.length > 0 ? {
          tools: tools,
          tool_choice: { type: "auto" }
        } : {})
      });
      
      // 标记本轮是否有工具调用
      let hasToolCallsThisRound = false;
      // 临时存储本轮的模型回复
      const tempContent: MessageContent[] = [];
      
      // 保存此轮响应用于添加到最终结果
      const currentResponseId = response.id;
      
      // 模型的文本回复(如果有)
      let modelTextResponse = '';
      
      for (const content of response.content) {
        if (content.type === 'text') {
          tempContent.push({
            type: 'text',
            text: content.text,
          });
          modelTextResponse = content.text;
        } else if (content.type === 'tool_use') {
          // 检查是否重复调用相同的工具和参数
          const toolCallKey = `${content.name}:${JSON.stringify(content.input)}`;
          const isRepeatedCall = calledTools.some(tool => 
            `${tool.name}:${JSON.stringify(tool.input)}` === toolCallKey
          );
          
          if (isRepeatedCall) {
            console.log(`检测到重复的工具调用: ${content.name}，跳过并结束循环`);
            
            // 如果是重复调用，添加一个解释并退出循环
            modelTextResponse = `我正在尝试使用工具 ${content.name}，但似乎已经调用过相同的工具。让我整理已获得的信息，为您提供答案。`;
            
            tempContent.push({
              type: 'text',
              text: modelTextResponse,
            });
            
            // 跳过此工具调用，结束循环
            shouldContinue = false;
            break;
          }
          
          // 记录此次工具调用
          calledTools.push({name: content.name, input: JSON.stringify(content.input)});
          
          hasToolCallsThisRound = true;
          hasAnyToolCalls = true;
          
          // 添加工具调用
          const toolUse = {
            type: 'tool_use' as const,
            tool: {
              name: content.name,
              args: content.input,
            },
          };
          tempContent.push(toolUse);
          messageContent.push(toolUse);
          
          console.log(`模型要求调用工具: ${content.name}`, content.input);
          
          // 执行工具调用
          try {
            const result = await mcpManager.callTool({
              name: content.name,
              args: content.input,
            });
            
            console.log(`工具调用结果:`, result.content);
            
            // 添加工具结果到最终消息
            const toolResult = {
              type: 'tool_result' as const,
              tool: {
                name: content.name,
                args: content.input,
                result: result.content,
              },
            };
            tempContent.push(toolResult);
            messageContent.push(toolResult);
            
            // 保留完整的对话历史，添加模型的回复（包含工具调用）
            if (modelTextResponse || iterations === 1) {
              // 如果有文本回复或者是第一轮，添加模型回复
              conversationHistory.push({
                role: 'assistant',
                content: modelTextResponse || `我需要使用工具 ${content.name} 来回答您的问题。`
              });
            }
            
            // 添加工具调用结果到对话历史
            conversationHistory.push({
              role: 'user',
              content: `工具 ${content.name} 的结果: ${JSON.stringify(result.content)}`,
            });
            
          } catch (error) {
            console.error("工具调用失败:", error);
            const toolError = {
              type: 'tool_result' as const,
              tool: {
                name: content.name,
                args: content.input,
                result: { error: "工具调用失败" },
              },
            };
            tempContent.push(toolError);
            messageContent.push(toolError);
            
            // 添加错误结果到对话历史
            if (modelTextResponse) {
              conversationHistory.push({
                role: 'assistant',
                content: modelTextResponse
              });
            }
            
            conversationHistory.push({
              role: 'user',
              content: `工具 ${content.name} 调用失败: ${error}`,
            });
          }
        }
      }
      
      // 如果本轮没有工具调用，表示模型已完成所有工作，可以退出循环
      if (!hasToolCallsThisRound) {
        console.log("本轮没有工具调用，退出循环");
        
        // 将最后一轮的文本内容添加到最终消息中
        tempContent.filter(c => c.type === 'text').forEach(c => {
          messageContent.push(c);
        });
        
        // 将最终回复添加到对话历史
        if (modelTextResponse) {
          conversationHistory.push({
            role: 'assistant',
            content: modelTextResponse
          });
        }
        
        shouldContinue = false;
      } else {
        console.log(`完成第 ${iterations} 轮工具调用，继续下一轮`);
      }
    }
    
    // 如果达到最大迭代次数仍有工具调用，生成一个最终回复
    if (iterations >= maxIterations && shouldContinue) {
      console.log(`达到最大工具调用轮次(${maxIterations})，生成最终回复`);
      
      // 添加一个最终回复，表示达到了工具调用上限
      const finalResponse = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `我提交了一个问题，你尝试使用了多种工具来回答，但似乎需要多次工具调用。请根据目前已获得的信息，总结一下你了解到的内容，并尽可能回答我的问题。原始问题是：${messages[messages.length - 1].content.filter(c => c.type === 'text').map(c => c.text).join(' ')}`
          }
        ]
      });
      
      // 添加最终回复文本
      if (finalResponse.content && finalResponse.content.length > 0) {
        const finalTextContent = finalResponse.content.find(c => c.type === 'text');
        if (finalTextContent && 'text' in finalTextContent) {
          messageContent.push({
            type: 'text',
            text: finalTextContent.text,
          });
        }
      }
    }
    
    // 如果整个过程中没有任何工具调用，保持原始回复
    if (!hasAnyToolCalls && messageContent.length === 0) {
      console.log("整个过程没有工具调用，使用原始回复");
      const originalResponse = await this.anthropic.messages.create({
        model: this.modelName,
        max_tokens: 1000,
        messages: anthropicMessages,
      });
      
      for (const content of originalResponse.content) {
        if (content.type === 'text') {
          messageContent.push({
            type: 'text',
            text: content.text,
          });
        }
      }
    }

    // 创建新的助手消息
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: messageContent,
      createdAt: new Date(),
    };
  }

  async connectToMcpServer(serverName: string, retryCount = 2, timeoutMs = 10000): Promise<McpTool[]> {
    try {
      return await mcpManager.connectToServer(serverName, retryCount, timeoutMs);
    } catch (error) {
      console.error(`连接到MCP服务器 ${serverName} 失败:`, error);
      // 重新抛出错误，但确保错误信息更加用户友好
      const errorMessage = error instanceof Error ? 
        error.message : 
        `连接到MCP服务器 ${serverName} 失败`;
      
      throw new Error(`MCP服务器连接失败: ${errorMessage}`);
    }
  }

  async disconnectMcpServer(serverName: string): Promise<void> {
    try {
      await mcpManager.disconnectServer(serverName);
    } catch (error) {
      console.error(`断开MCP服务器 ${serverName} 连接失败:`, error);
      // 重新抛出错误，但确保错误信息更加用户友好
      const errorMessage = error instanceof Error ? 
        error.message : 
        `断开MCP服务器 ${serverName} 连接失败`;
      
      throw new Error(`MCP服务器断开连接失败: ${errorMessage}`);
    }
  }

  isConnectedToMcpServer(): boolean {
    return mcpManager.isServerConnected();
  }

  getAvailableMcpTools(): McpTool[] {
    return mcpManager.getTools();
  }

  setApiKey(apiKey: string): void {
    if (apiKey) {
      try {
        const baseUrl = process.env.ANTHROPIC_BASE_URL || this.baseUrl;
        this.anthropic = new Anthropic({
          apiKey,
          baseURL: baseUrl,
        });
        this.isInitialized = true;

        // 在服务端环境中设置环境变量
        if (typeof process !== 'undefined' && process.env) {
          process.env.ANTHROPIC_API_KEY = apiKey;
        }
        
        console.log('Anthropic API密钥已更新');
      } catch (error) {
        console.error('设置Anthropic API密钥失败:', error);
        this.anthropic = null;
        this.isInitialized = false;
        throw new Error('API密钥设置失败');
      }
    } else {
      // 如果传入空的API密钥，则重置客户端
      this.anthropic = null;
      this.isInitialized = false;
    }
  }

  setBaseUrl(baseUrl: string): void {
    if (baseUrl) {
      this.baseUrl = baseUrl;
      
      // 如果已经有API密钥，则重新初始化客户端
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (apiKey && !this.anthropic) {
        try {
          this.anthropic = new Anthropic({
            apiKey,
            baseURL: baseUrl,
          });
          this.isInitialized = true;
        } catch (error) {
          console.error('使用新的基础URL初始化Anthropic客户端失败:', error);
          this.anthropic = null;
          this.isInitialized = false;
        }
      }

      // 在服务端环境中设置环境变量
      if (typeof process !== 'undefined' && process.env) {
        process.env.ANTHROPIC_BASE_URL = baseUrl;
      }
      
      console.log('Anthropic API基础URL已更新:', baseUrl);
    }
  }

  setModel(modelName: string): void {
    if (modelName) {
      this.modelName = modelName;
    }
  }
}

// 使用单例模式
const apiService = new ApiService();
export default apiService; 