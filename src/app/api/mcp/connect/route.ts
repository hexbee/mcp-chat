import { NextResponse } from 'next/server';
import apiService from '@/lib/api-service';
import mcpManager from '@/lib/mcp-manager';

export async function POST(request: Request) {
  try {
    const { serverName, mcpConfig } = await request.json();
    
    if (!serverName) {
      return NextResponse.json(
        { error: '缺少服务器名称' },
        { status: 400 }
      );
    }
    
    // 如果客户端提供了MCP配置，使用客户端配置
    if (mcpConfig) {
      try {
        // 设置MCP配置到管理器
        mcpManager.setConfig(JSON.parse(mcpConfig));
      } catch (configError) {
        console.error('解析MCP配置失败:', configError);
        return NextResponse.json(
          { error: '无效的MCP配置' },
          { status: 400 }
        );
      }
    }

    // 尝试连接到服务器
    const tools = await apiService.connectToMcpServer(serverName);
    
    // 返回成功结果
    return NextResponse.json({
      connected: true,
      serverName,
      tools
    });
  } catch (error: any) {
    console.error('连接MCP服务器失败:', error);
    
    // 构建友好的错误消息
    const errorMessage = error.message || '连接MCP服务器时发生未知错误';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        connected: false
      },
      { status: 500 }
    );
  }
} 