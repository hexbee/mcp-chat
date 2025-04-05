import { NextResponse } from 'next/server';
import apiService from '@/lib/api-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // 更新API密钥
    if (body.apiKey !== undefined) {
      apiService.setApiKey(body.apiKey);
    }

    // 更新基础URL
    if (body.baseUrl !== undefined) {
      apiService.setBaseUrl(body.baseUrl);
    }

    // 更新模型名称
    if (body.modelName !== undefined) {
      apiService.setModel(body.modelName);
    }

    return NextResponse.json({ 
      success: true 
    });
  } catch (error: any) {
    console.error('配置更新错误:', error);
    return NextResponse.json(
      { error: error.message || '配置更新失败' },
      { status: 500 }
    );
  }
} 