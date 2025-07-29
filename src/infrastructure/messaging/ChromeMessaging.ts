/**
 * ChromeMessaging インフラストラクチャ
 * chrome.runtime メッセージング API の統一インターフェース
 */

// 型定義
interface ChromeMessagingOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  debugMode?: boolean;
}

interface MessageSendOptions {
  timeout?: number;
  retryAttempts?: number;
  targetTab?: number | null;
  expectResponse?: boolean;
}

interface BroadcastOptions {
  timeout?: number;
  includeBackground?: boolean;
  activeTabsOnly?: boolean;
}

interface MessageWithId {
  type: string;
  messageId: string;
  timestamp: number;
  data?: any;
  isRequest?: boolean;
  [key: string]: any;
}

interface MessageHistoryEntry {
  action: string;
  type: string;
  messageId: string;
  timestamp: number;
  context: any;
}

interface MessageStats {
  totalMessages: number;
  recentMessages: number;
  registeredHandlers: number;
  actionCounts: { [key: string]: number };
  typeCounts: { [key: string]: number };
  messageHistorySize: number;
}

interface HealthCheckResult {
  apiAvailable: boolean;
  messagingWorking: boolean;
  errors: string[];
}

type MessageHandler = (message: any, sender: chrome.runtime.MessageSender) => Promise<any> | any;

class ChromeMessaging {
  private readonly defaultTimeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;
  private readonly messageHandlers: Map<string, Set<MessageHandler>>;
  private messageHistory: MessageHistoryEntry[];
  private readonly maxHistorySize: number;
  private readonly debugMode: boolean;

  /**
   * @param options - 設定オプション
   */
  constructor(options: ChromeMessagingOptions = {}) {
    this.defaultTimeout = options.timeout || 5000; // 5秒
    this.retryAttempts = options.retryAttempts || 2;
    this.retryDelay = options.retryDelay || 1000;
    this.messageHandlers = new Map();
    this.messageHistory = [];
    this.maxHistorySize = 100;
    this.debugMode = options.debugMode || false;
    
    this.setupMessageListener();
  }

  /**
   * メッセージを送信
   * @param message - 送信するメッセージ
   * @param options - 送信オプション
   * @returns Promise<any> レスポンス
   */
  sendMessage(message: any, options: MessageSendOptions = {}): Promise<any> {
    const config = {
      timeout: options.timeout || this.defaultTimeout,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      targetTab: options.targetTab || null,
      expectResponse: options.expectResponse !== false
    };

    return this.withRetry(() => {
      this.validateChromeApi();
      this.validateMessage(message);

      const messageWithId: MessageWithId = {
        ...message,
        messageId: this.generateMessageId(),
        timestamp: Date.now()
      };

      this.logMessage('send', messageWithId, config);

      return new Promise<any>((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new ChromeMessagingError(`Message timeout after ${config.timeout}ms`, 'TIMEOUT'));
        }, config.timeout);

        const responseCallback = (response: any) => {
          clearTimeout(timer);
          
          if (chrome.runtime.lastError) {
            this.logMessage('error', messageWithId, { 
              error: chrome.runtime.lastError.message 
            });
            reject(new ChromeMessagingError(
              chrome.runtime.lastError.message!, 
              'CHROME_ERROR'
            ));
            return;
          }

          this.logMessage('response', messageWithId, { response });
          
          if (config.expectResponse && response === undefined) {
            reject(new ChromeMessagingError('No response received', 'NO_RESPONSE'));
            return;
          }

          resolve(response);
        };

        // タブ指定メッセージ vs 拡張機能メッセージ
        if (config.targetTab) {
          chrome.tabs.sendMessage(config.targetTab, messageWithId, responseCallback);
        } else {
          chrome.runtime.sendMessage(messageWithId, responseCallback);
        }
      });
    }, config.retryAttempts);
  }

  /**
   * ブロードキャストメッセージを送信
   * @param message - 送信するメッセージ
   * @param options - 送信オプション
   * @returns Promise<any[]> 全レスポンス
   */
  async broadcastMessage(message: any, options: BroadcastOptions = {}): Promise<any[]> {
    const config = {
      timeout: options.timeout || this.defaultTimeout,
      includeBackground: options.includeBackground !== false,
      activeTabsOnly: options.activeTabsOnly || false
    };

    this.validateChromeApi();
    
    // 将来の機能拡張用に予約されたresponses配列
    const promises: Promise<any>[] = [];

    try {
      // 全タブに送信
      const tabs = await this.getAllTabs(config.activeTabsOnly);
      
      for (const tab of tabs) {
        if (tab.url && !tab.url.startsWith('chrome://')) {
          const promise = this.sendMessage(message, {
            ...options,
            targetTab: tab.id,
            expectResponse: false
          }).catch(error => {
            // 個別タブのエラーは記録するが失敗扱いにしない
            this.logMessage('broadcast_error', message, { 
              tabId: tab.id, 
              error: error.message 
            });
            return null;
          });
          
          promises.push(promise);
        }
      }

      // バックグラウンドにも送信
      if (config.includeBackground) {
        const bgPromise = this.sendMessage(message, {
          ...options,
          expectResponse: false
        }).catch(error => {
          this.logMessage('broadcast_error', message, { 
            target: 'background', 
            error: error.message 
          });
          return null;
        });
        
        promises.push(bgPromise);
      }

      const results = await Promise.all(promises);
      return results.filter(result => result !== null);

    } catch (error) {
      throw new ChromeMessagingError(`Broadcast failed: ${(error as Error).message}`, 'BROADCAST_ERROR');
    }
  }

  /**
   * メッセージハンドラーを登録
   * @param messageType - メッセージタイプ
   * @param handler - ハンドラー関数
   * @returns ハンドラー削除関数
   */
  onMessage(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);
    
    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  /**
   * ワンタイムメッセージハンドラーを登録
   * @param messageType - メッセージタイプ
   * @param handler - ハンドラー関数
   * @param timeout - タイムアウト（ms）
   * @returns Promise<any>
   */
  onceMessage(messageType: string, handler: MessageHandler, timeout: number = this.defaultTimeout): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        removeHandler();
        reject(new ChromeMessagingError(`Message wait timeout: ${messageType}`, 'WAIT_TIMEOUT'));
      }, timeout);

      const wrappedHandler: MessageHandler = async (message, sender) => {
        try {
          clearTimeout(timer);
          const result = await handler(message, sender);
          removeHandler();
          resolve(result);
        } catch (error) {
          removeHandler();
          reject(error);
        }
      };

      const removeHandler = this.onMessage(messageType, wrappedHandler);
    });
  }

  /**
   * メッセージリクエスト/レスポンスパターン
   * @param messageType - メッセージタイプ
   * @param data - リクエストデータ
   * @param options - オプション
   * @returns Promise<any> レスポンス
   */
  request(messageType: string, data: any, options: MessageSendOptions = {}): Promise<any> {
    const message = {
      type: messageType,
      data: data,
      isRequest: true
    };
    
    return this.sendMessage(message, options);
  }

  /**
   * メッセージリクエストハンドラーを登録
   * @param messageType - メッセージタイプ
   * @param handler - レスポンス生成関数
   * @returns ハンドラー削除関数
   */
  onRequest(messageType: string, handler: (data: any, sender: chrome.runtime.MessageSender) => Promise<any> | any): () => void {
    return this.onMessage(messageType, async (message, sender) => {
      if (message.isRequest) {
        try {
          const response = await handler(message.data, sender);
          return response;
        } catch (error) {
          this.logMessage('request_error', message, { error: (error as Error).message });
          throw error;
        }
      }
    });
  }

  /**
   * 全タブを取得
   * @param activeOnly - アクティブタブのみ
   * @returns Promise<chrome.tabs.Tab[]>
   */
  getAllTabs(activeOnly: boolean = false): Promise<chrome.tabs.Tab[]> {
    this.validateChromeApi();
    
    const query: chrome.tabs.QueryInfo = activeOnly ? { active: true } : {};
    return new Promise((resolve, reject) => {
      chrome.tabs.query(query, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new ChromeMessagingError(
            chrome.runtime.lastError.message!, 
            'TABS_ERROR'
          ));
          return;
        }
        resolve(tabs);
      });
    });
  }

  /**
   * メッセージリスナーの設定
   */
  private setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleIncomingMessage(message, sender, sendResponse);
        return true; // 非同期レスポンスを許可
      });
    }
  }

  /**
   * 受信メッセージの処理
   * @param message - 受信メッセージ
   * @param sender - 送信者情報
   * @param sendResponse - レスポンス関数
   */
  private async handleIncomingMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): Promise<void> {
    try {
      this.logMessage('receive', message, { sender });
      
      // メッセージ履歴に追加
      this.addToHistory('receive', message, sender);
      
      if (!message.type) {
        sendResponse({ error: 'Message type is required' });
        return;
      }

      const handlers = this.messageHandlers.get(message.type);
      if (!handlers || handlers.size === 0) {
        this.logMessage('no_handler', message, { type: message.type });
        sendResponse({ error: `No handler for message type: ${message.type}` });
        return;
      }

      // 複数のハンドラーがある場合は最初の有効なレスポンスを返す
      for (const handler of handlers) {
        try {
          const response = await handler(message, sender);
          if (response !== undefined) {
            sendResponse(response);
            return;
          }
        } catch (error) {
          this.logMessage('handler_error', message, { 
            error: (error as Error).message,
            handler: handler.name || 'anonymous'
          });
          
          sendResponse({ 
            error: (error as Error).message,
            type: 'HANDLER_ERROR'
          });
          return;
        }
      }

      // どのハンドラーもレスポンスしなかった場合
      sendResponse({ warning: 'No handler provided a response' });

    } catch (error) {
      this.logMessage('message_error', message, { error: (error as Error).message });
      sendResponse({ 
        error: (error as Error).message,
        type: 'MESSAGE_ERROR'
      });
    }
  }

  /**
   * リトライ付きで操作を実行
   * @param operation - 実行する操作
   * @param attempts - 試行回数
   * @returns Promise<T>
   */
  private async withRetry<T>(operation: () => Promise<T>, attempts: number): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // 拡張機能コンテキスト無効化エラーは即座に諦める
        if ((error as ChromeMessagingError).code === 'CHROME_ERROR' && 
            lastError.message.includes('Extension context invalidated')) {
          throw error;
        }
        
        // 最後の試行でなければリトライ
        if (attempt < attempts) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Chrome API の可用性をチェック
   */
  private validateChromeApi(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new ChromeMessagingError('Chrome runtime API is not available', 'API_UNAVAILABLE');
    }
  }

  /**
   * メッセージの妥当性をチェック
   * @param message
   */
  private validateMessage(message: any): void {
    if (!message || typeof message !== 'object') {
      throw new ChromeMessagingError('Message must be an object', 'INVALID_MESSAGE');
    }
    
    if (!message.type) {
      throw new ChromeMessagingError('Message type is required', 'INVALID_MESSAGE');
    }
  }

  /**
   * メッセージIDを生成
   * @returns string
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 遅延処理
   * @param ms
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * メッセージログ出力
   * @param action
   * @param message
   * @param details
   */
  private logMessage(action: string, message: any, details: any = {}): void {
    if (this.debugMode && typeof console !== 'undefined') {
      console.log(`[ChromeMessaging] ${action}:`, {
        type: message.type,
        messageId: message.messageId,
        ...details
      });
    }
  }

  /**
   * メッセージ履歴に追加
   * @param action
   * @param message
   * @param context
   */
  private addToHistory(action: string, message: any, context: any = {}): void {
    this.messageHistory.push({
      action,
      type: message.type,
      messageId: message.messageId,
      timestamp: Date.now(),
      context
    });
    
    // 履歴サイズ制限
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }
  }

  /**
   * メッセージ履歴を取得
   * @param limit - 取得件数
   * @returns MessageHistoryEntry[]
   */
  getMessageHistory(limit: number = 50): MessageHistoryEntry[] {
    return this.messageHistory.slice(-limit);
  }

  /**
   * 統計情報を取得
   * @returns MessageStats
   */
  getStats(): MessageStats {
    const recent = this.messageHistory.slice(-100);
    const actionCounts: { [key: string]: number } = {};
    const typeCounts: { [key: string]: number } = {};
    
    recent.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1;
    });
    
    return {
      totalMessages: this.messageHistory.length,
      recentMessages: recent.length,
      registeredHandlers: this.messageHandlers.size,
      actionCounts,
      typeCounts,
      messageHistorySize: this.messageHistory.length
    };
  }

  /**
   * 全ハンドラーを削除
   */
  clearHandlers(): void {
    this.messageHandlers.clear();
  }

  /**
   * メッセージ履歴をクリア
   */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /**
   * 健全性チェック
   * @returns Promise<HealthCheckResult>
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const health: HealthCheckResult = {
      apiAvailable: false,
      messagingWorking: false,
      errors: []
    };
    
    try {
      this.validateChromeApi();
      health.apiAvailable = true;
      
      // メッセージング機能のテスト
      const testMessage = {
        type: '_healthCheck',
        data: { timestamp: Date.now() }
      };
      
      // エコーハンドラーを一時的に登録
      const removeHandler = this.onMessage('_healthCheck', (message) => {
        return { echo: message.data, status: 'ok' };
      });
      
      try {
        const response = await this.sendMessage(testMessage, { timeout: 2000 });
        if (response && response.status === 'ok') {
          health.messagingWorking = true;
        }
      } catch (error) {
        health.errors.push(`Messaging test failed: ${(error as Error).message}`);
      } finally {
        removeHandler();
      }
      
    } catch (error) {
      health.errors.push(`API error: ${(error as Error).message}`);
    }
    
    return health;
  }
}

/**
 * ChromeMessaging専用エラークラス
 */
class ChromeMessagingError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ChromeMessagingError';
    this.code = code;
  }
}

// ES6 Module export
export { 
  ChromeMessaging, 
  ChromeMessagingError,
  type ChromeMessagingOptions,
  type MessageSendOptions,
  type BroadcastOptions,
  type MessageHandler,
  type MessageStats,
  type HealthCheckResult
};