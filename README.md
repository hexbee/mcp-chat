# MCP-Chat

MCP-Chat是一个现代化的AI聊天应用程序，提供丰富的模型配置选项和工具调用能力。基于Next.js构建，支持ModelContextProtocol(MCP)工具集成，实现文件管理、网络搜索等增强功能。

## 主要功能

### 1. 聊天界面
- 简洁现代的用户界面，灵感来自ChatGPT
- 支持多会话管理，可创建、切换和删除不同的对话
- 消息内容自动保存在本地存储中
- 支持工具调用结果的展示和交互

### 2. 模型配置
- 可自定义API Key、Base URL和模型名称
- 内置API密钥测试功能
- 支持各种Claude模型，未来可扩展支持其他模型提供商
- 配置信息保存在本地浏览器存储中

### 3. MCP工具支持
- 动态MCP服务器配置
- 支持多个MCP服务器同时连接
- 工具调用结果自动展示在对话中
- 可视化工具参数结构和使用方法

### 4. 服务器管理
- 服务器连接状态直观显示
- 支持通过界面添加、配置和连接服务器
- JSON格式的服务器配置编辑器
- 服务器配置保存在浏览器本地存储中

### 5. 会话管理
- 自动保存历史会话
- 可创建多个独立对话
- 会话标题根据首条消息自动生成
- 支持删除不需要的会话

## 技术特点

- 基于Next.js构建的现代React应用
- 使用Tailwind CSS实现响应式设计
- Anthropic API集成以支持Claude模型
- 实时工具调用能力
- 本地存储实现的无服务器数据持久化
- ModelContextProtocol实现插件化工具支持

## 使用方法

1. **设置模型配置**：点击右上角模型设置按钮，配置API Key和模型信息
2. **配置MCP服务器**：点击MCP配置按钮，添加需要的服务器配置
3. **连接服务器**：点击MCP服务器连接按钮，选择并连接所需服务器
4. **开始对话**：在输入框中输入问题或指令，开始与AI助手交流

## 服务器配置示例

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "--yes",
        "@modelcontextprotocol/server-filesystem",
        "/tmp/"
      ]
    },
    "tavily-mcp": {
      "command": "npx",
      "args": [
        "--yes",
        "tavily-mcp@0.1.4"
      ],
      "env": {
        "TAVILY_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

## 开发与部署

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 注意事项

- API密钥保存在本地，不会上传到服务器
- 刷新MCP服务器配置后需要重新连接服务器
- 请确保安装了相关的npm包以支持MCP工具
