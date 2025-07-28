/**
 * ChromeMessaging インフラストラクチャ
 * chrome.runtime メッセージング API の統一インターフェース
 */
class ChromeMessaging {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 5000 // 5秒
    this.retryAttempts = options.retryAttempts || 2
    this.retryDelay = options.retryDelay || 1000
    this.messageHandlers = new Map()
    this.messageHistory = []
    this.maxHistorySize = 100
    this.debugMode = options.debugMode || false
    
    this.setupMessageListener()
  }

  /**
   * メッセージを送信
   * @param {Object} message - 送信するメッセージ
   * @param {Object} options - 送信オプション
   * @returns {Promise<*>} レスポンス
   */
  sendMessage(message, options = {}) {
    const config = {
      timeout: options.timeout || this.defaultTimeout,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      targetTab: options.targetTab || null,
      expectResponse: options.expectResponse !== false
    }

    return this.withRetry(() => {
      this.validateChromeApi()
      this.validateMessage(message)

      const messageWithId = {
        ...message,
        messageId: this.generateMessageId(),
        timestamp: Date.now()
      }

      this.logMessage('send', messageWithId, config)

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new ChromeMessagingError(`Message timeout after ${config.timeout}ms`, 'TIMEOUT'))
        }, config.timeout)

        const responseCallback = (response) => {
          clearTimeout(timer)
          
          if (chrome.runtime.lastError) {
            this.logMessage('error', messageWithId, { 
              error: chrome.runtime.lastError.message 
            })
            reject(new ChromeMessagingError(
              chrome.runtime.lastError.message, 
              'CHROME_ERROR'
            ))
            return
          }

          this.logMessage('response', messageWithId, { response })
          
          if (config.expectResponse && response === undefined) {
            reject(new ChromeMessagingError('No response received', 'NO_RESPONSE'))
            return
          }

          resolve(response)
        }

        // タブ指定メッセージ vs 拡張機能メッセージ
        if (config.targetTab) {
          chrome.tabs.sendMessage(config.targetTab, messageWithId, responseCallback)
        } else {
          chrome.runtime.sendMessage(messageWithId, responseCallback)
        }
      })
    }, config.retryAttempts)
  }

  /**
   * ブロードキャストメッセージを送信
   * @param {Object} message - 送信するメッセージ
   * @param {Object} options - 送信オプション
   * @returns {Promise<Object[]>} 全レスポンス
   */
  async broadcastMessage(message, options = {}) {
    const config = {
      timeout: options.timeout || this.defaultTimeout,
      includeBackground: options.includeBackground !== false,
      activeTabsOnly: options.activeTabsOnly || false
    }

    this.validateChromeApi()
    
    // 将来の機能拡張用に予約されたresponses配列
    const promises = []

    try {
      // 全タブに送信
      const tabs = await this.getAllTabs(config.activeTabsOnly)
      
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
            })
            return null
          })
          
          promises.push(promise)
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
          })
          return null
        })
        
        promises.push(bgPromise)
      }

      const results = await Promise.all(promises)
      return results.filter(result => result !== null)

    } catch (error) {
      throw new ChromeMessagingError(`Broadcast failed: ${error.message}`, 'BROADCAST_ERROR')
    }
  }

  /**
   * メッセージハンドラーを登録
   * @param {string} messageType - メッセージタイプ
   * @param {Function} handler - ハンドラー関数
   * @returns {Function} ハンドラー削除関数
   */
  onMessage(messageType, handler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set())
    }
    
    this.messageHandlers.get(messageType).add(handler)
    
    // ハンドラー削除関数を返す
    return () => {
      const handlers = this.messageHandlers.get(messageType)
      if (handlers) {
        handlers.delete(handler)
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType)
        }
      }
    }
  }

  /**
   * ワンタイムメッセージハンドラーを登録
   * @param {string} messageType - メッセージタイプ
   * @param {Function} handler - ハンドラー関数
   * @param {number} timeout - タイムアウト（ms）
   * @returns {Promise<*>}
   */
  onceMessage(messageType, handler, timeout = this.defaultTimeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        removeHandler()
        reject(new ChromeMessagingError(`Message wait timeout: ${messageType}`, 'WAIT_TIMEOUT'))
      }, timeout)

      const wrappedHandler = async (message, sender) => {
        try {
          clearTimeout(timer)
          const result = await handler(message, sender)
          removeHandler()
          resolve(result)
        } catch (error) {
          removeHandler()
          reject(error)
        }
      }

      const removeHandler = this.onMessage(messageType, wrappedHandler)
    })
  }

  /**
   * メッセージリクエスト/レスポンスパターン
   * @param {string} messageType - メッセージタイプ
   * @param {*} data - リクエストデータ
   * @param {Object} options - オプション
   * @returns {Promise<*>} レスポンス
   */
  request(messageType, data, options = {}) {
    const message = {
      type: messageType,
      data: data,
      isRequest: true
    }
    
    return this.sendMessage(message, options)
  }

  /**
   * メッセージリクエストハンドラーを登録
   * @param {string} messageType - メッセージタイプ
   * @param {Function} handler - レスポンス生成関数
   * @returns {Function} ハンドラー削除関数
   */
  onRequest(messageType, handler) {
    return this.onMessage(messageType, async (message, sender) => {
      if (message.isRequest) {
        try {
          const response = await handler(message.data, sender)
          return response
        } catch (error) {
          this.logMessage('request_error', message, { error: error.message })
          throw error
        }
      }
    })
  }

  /**
   * 全タブを取得
   * @param {boolean} activeOnly - アクティブタブのみ
   * @returns {Promise<Object[]>}
   */
  getAllTabs(activeOnly = false) {
    this.validateChromeApi()
    
    const query = activeOnly ? { active: true } : {}
    return new Promise((resolve, reject) => {
      chrome.tabs.query(query, (tabs) => {
        if (chrome.runtime.lastError) {
          reject(new ChromeMessagingError(
            chrome.runtime.lastError.message, 
            'TABS_ERROR'
          ))
          return
        }
        resolve(tabs)
      })
    })
  }

  /**
   * メッセージリスナーの設定
   */
  setupMessageListener() {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleIncomingMessage(message, sender, sendResponse)
        return true // 非同期レスポンスを許可
      })
    }
  }

  /**
   * 受信メッセージの処理
   * @param {Object} message - 受信メッセージ
   * @param {Object} sender - 送信者情報
   * @param {Function} sendResponse - レスポンス関数
   */
  async handleIncomingMessage(message, sender, sendResponse) {
    try {
      this.logMessage('receive', message, { sender })
      
      // メッセージ履歴に追加
      this.addToHistory('receive', message, sender)
      
      if (!message.type) {
        sendResponse({ error: 'Message type is required' })
        return
      }

      const handlers = this.messageHandlers.get(message.type)
      if (!handlers || handlers.size === 0) {
        this.logMessage('no_handler', message, { type: message.type })
        sendResponse({ error: `No handler for message type: ${message.type}` })
        return
      }

      // 複数のハンドラーがある場合は最初の有効なレスポンスを返す
      for (const handler of handlers) {
        try {
          const response = await handler(message, sender)
          if (response !== undefined) {
            sendResponse(response)
            return
          }
        } catch (error) {
          this.logMessage('handler_error', message, { 
            error: error.message,
            handler: handler.name || 'anonymous'
          })
          
          sendResponse({ 
            error: error.message,
            type: 'HANDLER_ERROR'
          })
          return
        }
      }

      // どのハンドラーもレスポンスしなかった場合
      sendResponse({ warning: 'No handler provided a response' })

    } catch (error) {
      this.logMessage('message_error', message, { error: error.message })
      sendResponse({ 
        error: error.message,
        type: 'MESSAGE_ERROR'
      })
    }
  }

  /**
   * リトライ付きで操作を実行
   * @param {Function} operation - 実行する操作
   * @param {number} attempts - 試行回数
   * @returns {Promise<*>}
   */
  async withRetry(operation, attempts) {
    let lastError
    
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // 拡張機能コンテキスト無効化エラーは即座に諦める
        if (error.code === 'CHROME_ERROR' && 
            error.message.includes('Extension context invalidated')) {
          throw error
        }
        
        // 最後の試行でなければリトライ
        if (attempt < attempts) {
          await this.delay(this.retryDelay * attempt)
          continue
        }
      }
    }
    
    throw lastError
  }

  /**
   * Chrome API の可用性をチェック
   */
  validateChromeApi() {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      throw new ChromeMessagingError('Chrome runtime API is not available', 'API_UNAVAILABLE')
    }
  }

  /**
   * メッセージの妥当性をチェック
   * @param {Object} message
   */
  validateMessage(message) {
    if (!message || typeof message !== 'object') {
      throw new ChromeMessagingError('Message must be an object', 'INVALID_MESSAGE')
    }
    
    if (!message.type) {
      throw new ChromeMessagingError('Message type is required', 'INVALID_MESSAGE')
    }
  }

  /**
   * メッセージIDを生成
   * @returns {string}
   */
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 遅延処理
   * @param {number} ms
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * メッセージログ出力
   * @param {string} action
   * @param {Object} message
   * @param {Object} details
   */
  logMessage(action, message, details = {}) {
    if (this.debugMode && typeof console !== 'undefined') {
      console.log(`[ChromeMessaging] ${action}:`, {
        type: message.type,
        messageId: message.messageId,
        ...details
      })
    }
  }

  /**
   * メッセージ履歴に追加
   * @param {string} action
   * @param {Object} message
   * @param {Object} context
   */
  addToHistory(action, message, context = {}) {
    this.messageHistory.push({
      action,
      type: message.type,
      messageId: message.messageId,
      timestamp: Date.now(),
      context
    })
    
    // 履歴サイズ制限
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift()
    }
  }

  /**
   * メッセージ履歴を取得
   * @param {number} limit - 取得件数
   * @returns {Object[]}
   */
  getMessageHistory(limit = 50) {
    return this.messageHistory.slice(-limit)
  }

  /**
   * 統計情報を取得
   * @returns {Object}
   */
  getStats() {
    const recent = this.messageHistory.slice(-100)
    const actionCounts = {}
    const typeCounts = {}
    
    recent.forEach(entry => {
      actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1
      typeCounts[entry.type] = (typeCounts[entry.type] || 0) + 1
    })
    
    return {
      totalMessages: this.messageHistory.length,
      recentMessages: recent.length,
      registeredHandlers: this.messageHandlers.size,
      actionCounts,
      typeCounts,
      messageHistorySize: this.messageHistory.length
    }
  }

  /**
   * 全ハンドラーを削除
   */
  clearHandlers() {
    this.messageHandlers.clear()
  }

  /**
   * メッセージ履歴をクリア
   */
  clearHistory() {
    this.messageHistory = []
  }

  /**
   * 健全性チェック
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const health = {
      apiAvailable: false,
      messagingWorking: false,
      errors: []
    }
    
    try {
      this.validateChromeApi()
      health.apiAvailable = true
      
      // メッセージング機能のテスト
      const testMessage = {
        type: '_healthCheck',
        data: { timestamp: Date.now() }
      }
      
      // エコーハンドラーを一時的に登録
      const removeHandler = this.onMessage('_healthCheck', (message) => {
        return { echo: message.data, status: 'ok' }
      })
      
      try {
        const response = await this.sendMessage(testMessage, { timeout: 2000 })
        if (response && response.status === 'ok') {
          health.messagingWorking = true
        }
      } catch (error) {
        health.errors.push(`Messaging test failed: ${error.message}`)
      } finally {
        removeHandler()
      }
      
    } catch (error) {
      health.errors.push(`API error: ${error.message}`)
    }
    
    return health
  }
}

/**
 * ChromeMessaging専用エラークラス
 */
class ChromeMessagingError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ChromeMessagingError'
    this.code = code
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChromeMessaging, ChromeMessagingError }
}