/**
 * SimpleMessagingAdapter
 * Chromeランタイムメッセージングのシンプルなラッパー
 */

class SimpleMessagingAdapter {
  constructor() {
    this.defaultTimeout = 5000
  }

  /**
   * backgroundスクリプトにメッセージを送信
   * @param {Object} message - 送信メッセージ
   * @param {number} timeout - タイムアウト（ms）
   * @returns {Promise<Object>} レスポンス
   */
  sendMessage(message, timeout = this.defaultTimeout) {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({ 
          success: false, 
          error: 'Chrome runtime not available' 
        })
        return
      }

      // タイムアウト設定
      const timer = setTimeout(() => {
        resolve({ 
          success: false, 
          error: 'Message timeout' 
        })
      }, timeout)

      chrome.runtime.sendMessage(message, (response) => {
        clearTimeout(timer)
        
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          })
        } else {
          resolve(response || { 
            success: false, 
            error: 'No response' 
          })
        }
      })
    })
  }

  /**
   * content scriptsにメッセージを送信
   * @param {number} tabId - タブID
   * @param {Object} message - 送信メッセージ
   * @param {number} timeout - タイムアウト（ms）
   * @returns {Promise<Object>} レスポンス
   */
  sendMessageToTab(tabId, message, timeout = this.defaultTimeout) {
    return new Promise((resolve) => {
      if (!this.isAvailable() || !chrome.tabs) {
        resolve({ 
          success: false, 
          error: 'Chrome tabs API not available' 
        })
        return
      }

      // タイムアウト設定
      const timer = setTimeout(() => {
        resolve({ 
          success: false, 
          error: 'Message timeout' 
        })
      }, timeout)

      chrome.tabs.sendMessage(tabId, message, (response) => {
        clearTimeout(timer)
        
        if (chrome.runtime.lastError) {
          resolve({ 
            success: false, 
            error: chrome.runtime.lastError.message 
          })
        } else {
          resolve(response || { 
            success: true 
          })
        }
      })
    })
  }

  /**
   * メッセージリスナーを設定
   * @param {Function} handler - メッセージハンドラー
   */
  onMessage(handler) {
    if (this.isAvailable() && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          const result = handler(message, sender, sendResponse)
          // 非同期処理の場合は true を返す
          return Boolean(result)
        } catch (error) {
          console.error('Message handler error:', error)
          sendResponse({ 
            success: false, 
            error: error.message 
          })
          return false
        }
      })
    }
  }

  /**
   * Chrome runtime APIが利用可能かチェック
   * @returns {boolean}
   */
  isAvailable() {
    return typeof chrome !== 'undefined' && 
           chrome.runtime && 
           chrome.runtime.sendMessage
  }

  /**
   * デフォルトタイムアウトを設定
   * @param {number} timeout
   */
  setDefaultTimeout(timeout) {
    this.defaultTimeout = timeout
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      isAvailable: this.isAvailable(),
      hasTabsAPI: Boolean(chrome?.tabs),
      defaultTimeout: this.defaultTimeout,
      className: 'SimpleMessagingAdapter'
    }
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.SimpleMessagingAdapter = SimpleMessagingAdapter
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleMessagingAdapter }
}