import { NextResponse } from 'next/server';
import { Anthropic } from "@anthropic-ai/sdk";

// 测试API密钥是否有效
export async function POST(request: Request) {
  try {
    const { apiKey, baseUrl } = await request.json() as { apiKey: string; baseUrl?: string };
    
    if (!apiKey) {
      return NextResponse.json(
        { valid: false, error: 'API密钥不能为空' },
        { status: 400 }
      );
    }

    // 创建临时Anthropic客户端进行测试
    const anthropic = new Anthropic({
      apiKey,
      baseURL: baseUrl || 'https://api.anthropic.com',
    });

    // 尝试发送一个简单请求测试API密钥
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [
        { role: "user", content: "Hello, this is a test." }
      ],
    });

    // 如果没有抛出异常，则API密钥有效
    return NextResponse.json({ 
      valid: true, 
      model: response.model 
    });
  } catch (error: any) {
    console.error('API密钥测试失败:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: error.message || 'API密钥无效' 
      },
      { status: 400 }
    );
  }
} 