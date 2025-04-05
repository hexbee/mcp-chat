import { v4 as uuidv4 } from 'uuid';
import { Message } from './api-service';
import { ChatSession } from '@/components/ChatHistory';

// 本地存储键
const SESSIONS_STORAGE_KEY = 'mcp_chat_sessions';
const MESSAGES_STORAGE_KEY_PREFIX = 'mcp_chat_messages_';

// 默认会话标题
const DEFAULT_SESSION_TITLE = '新对话';

class SessionService {
  // 创建新的对话会话
  createSession(): ChatSession {
    const session: ChatSession = {
      id: uuidv4(),
      title: DEFAULT_SESSION_TITLE,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 将新会话保存到本地存储
    this.saveSession(session);
    
    // 清空当前会话消息
    this.saveMessages(session.id, []);
    
    return session;
  }

  // 获取所有会话列表
  getSessions(): ChatSession[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const sessionsJson = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (!sessionsJson) {
      return [];
    }
    
    try {
      const sessions = JSON.parse(sessionsJson) as ChatSession[];
      // 确保日期正确解析
      return sessions.map(session => ({
        ...session,
        createdAt: new Date(session.createdAt),
        updatedAt: new Date(session.updatedAt)
      }));
    } catch (error) {
      console.error('解析会话数据失败:', error);
      return [];
    }
  }

  // 获取特定会话
  getSession(sessionId: string): ChatSession | null {
    const sessions = this.getSessions();
    return sessions.find(session => session.id === sessionId) || null;
  }

  // 保存会话
  saveSession(session: ChatSession): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    const sessions = this.getSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }

  // 保存会话并更新时间
  updateSession(sessionId: string, updates: Partial<ChatSession>): ChatSession | null {
    const session = this.getSession(sessionId);
    if (!session) {
      return null;
    }
    
    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date()
    };
    
    this.saveSession(updatedSession);
    return updatedSession;
  }

  // 删除会话
  deleteSession(sessionId: string): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    
    const sessions = this.getSessions();
    const filteredSessions = sessions.filter(session => session.id !== sessionId);
    
    if (filteredSessions.length === sessions.length) {
      // 没有找到指定会话
      return false;
    }
    
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(filteredSessions));
    
    // 删除关联的消息
    localStorage.removeItem(`${MESSAGES_STORAGE_KEY_PREFIX}${sessionId}`);
    
    return true;
  }

  // 获取会话消息
  getMessages(sessionId: string): Message[] {
    if (typeof window === 'undefined') {
      return [];
    }
    
    const messagesJson = localStorage.getItem(`${MESSAGES_STORAGE_KEY_PREFIX}${sessionId}`);
    if (!messagesJson) {
      return [];
    }
    
    try {
      const messages = JSON.parse(messagesJson) as Message[];
      // 确保日期正确解析
      return messages.map(message => ({
        ...message,
        createdAt: new Date(message.createdAt)
      }));
    } catch (error) {
      console.error('解析消息数据失败:', error);
      return [];
    }
  }

  // 保存会话消息
  saveMessages(sessionId: string, messages: Message[]): void {
    if (typeof window === 'undefined') {
      return;
    }
    
    localStorage.setItem(`${MESSAGES_STORAGE_KEY_PREFIX}${sessionId}`, JSON.stringify(messages));
    
    // 如果有消息，更新会话标题
    if (messages.length > 0) {
      const firstUserMessage = messages.find(msg => msg.role === 'user');
      if (firstUserMessage && firstUserMessage.content.length > 0) {
        const firstContent = firstUserMessage.content[0];
        if (firstContent.type === 'text' && firstContent.text) {
          const title = firstContent.text.substring(0, 30);
          this.updateSession(sessionId, { title, updatedAt: new Date() });
        }
      }
    }
  }

  // 添加一条消息并保存
  addMessage(sessionId: string, message: Message): Message[] {
    const messages = this.getMessages(sessionId);
    const updatedMessages = [...messages, message];
    this.saveMessages(sessionId, updatedMessages);
    return updatedMessages;
  }

  // 确保有一个默认会话
  ensureDefaultSession(): ChatSession {
    const sessions = this.getSessions();
    if (sessions.length === 0) {
      return this.createSession();
    }
    return sessions[sessions.length - 1]; // 返回最新的会话
  }
}

const sessionService = new SessionService();
export default sessionService; 