import { NextResponse } from 'next/server';
import apiService, { Message } from '@/lib/api-service';
import mcpManager from '@/lib/mcp-manager';

interface ChatRequest {
  messages: Message[];
  mcpState?: {
    connected: boolean;
    connectedServers: string[];
  };
}

export async function POST(request: Request) {
  try {
    const { messages, mcpState } = await request.json() as ChatRequest;
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '无效的消息格式' },
        { status: 400 }
      );
    }

    // 如果有MCP状态信息并且显示已连接，则确保服务器端也已连接
    if (mcpState?.connected && mcpState.connectedServers?.length > 0) {
      const connectedServers = mcpManager.getConnectedServers();
      const shouldConnect = mcpState.connectedServers.filter(server => 
        !connectedServers.includes(server)
      );
      
      if (shouldConnect.length > 0) {
        console.log(`客户端显示已连接的MCP服务器 ${shouldConnect.join(', ')} 在服务端未连接，正在重新连接...`);
        
        for (const serverName of shouldConnect) {
          try {
            // 重新连接MCP服务器
            await apiService.connectToMcpServer(serverName);
            console.log(`已重新连接MCP服务器: ${serverName}`);
          } catch (err) {
            console.error(`自动重新连接MCP服务器 ${serverName} 失败:`, err);
          }
        }
      }
    }

    // 打印MCP工具状态信息
    const connectedServers = mcpManager.getConnectedServers();
    const isConnected = connectedServers.length > 0;
    const tools = mcpManager.getTools();
    console.log(`API请求时MCP连接状态: ${isConnected ? '已连接' : '未连接'}`);
    console.log(`API请求时已连接的MCP服务器: ${connectedServers.join(', ')}`);
    console.log(`API请求时可用MCP工具数量: ${tools.length}`);
    if (tools.length > 0) {
      console.log(`工具列表: ${tools.map(t => t.name).join(', ')}`);
    }

    // 调用API服务发送消息
    const response = await apiService.sendMessage(messages);
    
    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('聊天API错误:', error);
    return NextResponse.json(
      { error: error.message || '请求处理失败' },
      { status: 500 }
    );
  }
} 