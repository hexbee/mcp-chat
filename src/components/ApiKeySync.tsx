import { useEffect } from 'react';

export default function ApiKeySync() {
  useEffect(() => {
    // 从localStorage加载API密钥并同步到服务端
    const syncApiKey = async () => {
      try {
        const savedApiKey = localStorage.getItem('anthropic_api_key');
        const savedModelName = localStorage.getItem('model_name');
        const savedBaseUrl = localStorage.getItem('anthropic_base_url');
        
        if (savedApiKey || savedModelName || savedBaseUrl) {
          const payload: Record<string, string> = {};
          
          if (savedApiKey) payload.apiKey = savedApiKey;
          if (savedModelName) payload.modelName = savedModelName;
          if (savedBaseUrl) payload.baseUrl = savedBaseUrl;
          
          // 同步到服务端
          await fetch('/api/config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
          
          console.log('已将API密钥、模型和基础URL同步到服务端');
        }
      } catch (error) {
        console.error('同步API配置到服务端失败:', error);
      }
    };

    syncApiKey();
  }, []);

  return null; // 这个组件不渲染任何内容
} 