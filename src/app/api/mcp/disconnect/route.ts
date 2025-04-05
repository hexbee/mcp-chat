import { NextResponse } from 'next/server';
import apiService from '@/lib/api-service';

export async function POST(request: Request) {
  try {
    const { serverName } = await request.json() as { serverName: string };
    
    if (!serverName) {
      return NextResponse.json(
        { error: '服务器名称不能为空' },
        { status: 400 }
      );
    }

    // 断开MCP服务器连接
    await apiService.disconnectMcpServer(serverName);
    
    return NextResponse.json({ 
      success: true,
      message: `已断开MCP服务器: ${serverName}连接`
    });
  } catch (error: any) {
    console.error('断开MCP服务器连接错误:', error);
    return NextResponse.json(
      { error: error.message || 'MCP服务器断开连接失败', success: false },
      { status: 500 }
    );
  }
} 