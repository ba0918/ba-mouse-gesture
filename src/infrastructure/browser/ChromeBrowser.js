/**
 * ChromeBrowser インフラストラクチャ
 * Chrome Browser API の統一インターフェース
 */
class ChromeBrowser {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.defaultTimeout = options.timeout || 5000
    this.debugMode = options.debugMode || false
    this.operationHistory = []
    this.maxHistorySize = 50
  }

  /**
   * タブ操作: 戻る
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async goBack(tabId = null) {
    return this.executeTabOperation('goBack', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.goBack(tab.id, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve()
        })
      })
    }, tabId)
  }

  /**
   * タブ操作: 進む
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async goForward(tabId = null) {
    return this.executeTabOperation('goForward', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.goForward(tab.id, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve()
        })
      })
    }, tabId)
  }

  /**
   * タブ操作: リロード
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @param {boolean} bypassCache - キャッシュをバイパスするか
   * @returns {Promise<void>}
   */
  async reload(tabId = null, bypassCache = false) {
    return this.executeTabOperation('reload', async (tab) => {
      this.validateChromeApi()
      
      const reloadProperties = { bypassCache }
      
      await new Promise((resolve, reject) => {
        chrome.tabs.reload(tab.id, reloadProperties, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve()
        })
      })
    }, tabId)
  }

  /**
   * タブ操作: スーパーリロード（キャッシュクリア付き）
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async superReload(tabId = null) {
    return this.reload(tabId, true)
  }

  /**
   * タブ操作: 新しいタブを開く
   * @param {string} url - 開くURL（省略時は新しいタブページ）
   * @param {Object} options - タブ作成オプション
   * @returns {Promise<Object>} 作成されたタブ情報
   */
  async createTab(url = null, options = {}) {
    return this.executeOperation('createTab', async () => {
      this.validateChromeApi()
      
      const createProperties = {
        url: url || 'chrome://newtab/',
        active: options.active !== false, // デフォルトでアクティブ
        ...options
      }
      
      return new Promise((resolve, reject) => {
        chrome.tabs.create(createProperties, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_CREATION_ERROR'
            ))
            return
          }
          resolve(tab)
        })
      })
    })
  }

  /**
   * タブ操作: タブを閉じる
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async closeTab(tabId = null) {
    return this.executeTabOperation('closeTab', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve()
        })
      })
    }, tabId)
  }

  /**
   * タブ操作: タブを複製
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<Object>} 複製されたタブ情報
   */
  async duplicateTab(tabId = null) {
    return this.executeTabOperation('duplicateTab', async (tab) => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.duplicate(tab.id, (duplicatedTab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(duplicatedTab)
        })
      })
    }, tabId)
  }

  /**
   * タブ操作: 前のタブに切り替え
   * @returns {Promise<Object>} 切り替え先タブ情報
   */
  async switchToPreviousTab() {
    return this.executeOperation('switchToPreviousTab', async () => {
      const tabs = await this.getAllTabs()
      const currentTab = await this.getActiveTab()
      
      if (tabs.length <= 1) {
        throw new ChromeBrowserError('No other tabs available', 'NO_TABS_ERROR')
      }
      
      const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id)
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
      const previousTab = tabs[previousIndex]
      
      await this.activateTab(previousTab.id)
      return previousTab
    })
  }

  /**
   * タブ操作: 次のタブに切り替え
   * @returns {Promise<Object>} 切り替え先タブ情報
   */
  async switchToNextTab() {
    return this.executeOperation('switchToNextTab', async () => {
      const tabs = await this.getAllTabs()
      const currentTab = await this.getActiveTab()
      
      if (tabs.length <= 1) {
        throw new ChromeBrowserError('No other tabs available', 'NO_TABS_ERROR')
      }
      
      const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id)
      const nextIndex = (currentIndex + 1) % tabs.length
      const nextTab = tabs[nextIndex]
      
      await this.activateTab(nextTab.id)
      return nextTab
    })
  }

  /**
   * タブ操作: タブをアクティブにする
   * @param {number} tabId - タブID
   * @returns {Promise<Object>} アクティブになったタブ情報
   */
  async activateTab(tabId) {
    return this.executeOperation('activateTab', async () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, { active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(tab)
        })
      })
    })
  }

  /**
   * ページ操作: 最上部にスクロール
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async scrollToTop(tabId = null) {
    return this.executeScriptInTab(tabId, () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  /**
   * ページ操作: 最下部にスクロール
   * @param {number} tabId - タブID（省略時は現在のタブ）
   * @returns {Promise<void>}
   */
  async scrollToBottom(tabId = null) {
    return this.executeScriptInTab(tabId, () => {
      window.scrollTo({ 
        top: document.documentElement.scrollHeight, 
        behavior: 'smooth' 
      })
    })
  }

  /**
   * タブでスクリプトを実行
   * @param {number} tabId - タブID
   * @param {Function} script - 実行するスクリプト
   * @returns {Promise<*>} スクリプトの実行結果
   */
  async executeScriptInTab(tabId, script) {
    return this.executeTabOperation('executeScript', async (tab) => {
      this.validateChromeApi()
      
      if (!chrome.scripting) {
        throw new ChromeBrowserError('Chrome scripting API is not available', 'API_UNAVAILABLE')
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: script
      })
      
      return results?.[0]?.result
    }, tabId)
  }

  /**
   * 現在のアクティブタブを取得
   * @returns {Promise<Object>} タブ情報
   */
  async getActiveTab() {
    return this.executeOperation('getActiveTab', async () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_QUERY_ERROR'
            ))
            return
          }
          
          if (tabs.length === 0) {
            reject(new ChromeBrowserError('No active tab found', 'NO_ACTIVE_TAB'))
            return
          }
          
          resolve(tabs[0])
        })
      })
    })
  }

  /**
   * 全タブを取得
   * @param {Object} query - クエリ条件
   * @returns {Promise<Object[]>} タブ配列
   */
  async getAllTabs(query = {}) {
    return this.executeOperation('getAllTabs', async () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.query(query, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_QUERY_ERROR'
            ))
            return
          }
          resolve(tabs)
        })
      })
    })
  }

  /**
   * タブ情報を取得
   * @param {number} tabId - タブID
   * @returns {Promise<Object>} タブ情報
   */
  async getTab(tabId) {
    return this.executeOperation('getTab', async () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message, 
              'TAB_QUERY_ERROR'
            ))
            return
          }
          resolve(tab)
        })
      })
    })
  }

  /**
   * タブ操作を実行（共通処理）
   * @param {string} operation - 操作名
   * @param {Function} executor - 実行関数
   * @param {number} tabId - タブID
   * @returns {Promise<*>}
   */
  async executeTabOperation(operation, executor, tabId = null) {
    return this.executeOperation(operation, async () => {
      const tab = tabId ? await this.getTab(tabId) : await this.getActiveTab()
      return executor(tab)
    })
  }

  /**
   * 操作を実行（共通処理）
   * @param {string} operation - 操作名
   * @param {Function} executor - 実行関数
   * @returns {Promise<*>}
   */
  async executeOperation(operation, executor) {
    const startTime = Date.now()
    
    try {
      this.logOperation('start', operation)
      const result = await executor()
      
      this.addToHistory({
        operation,
        status: 'success',
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      this.logOperation('success', operation, { duration: Date.now() - startTime })
      return result
      
    } catch (error) {
      this.addToHistory({
        operation,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      this.logOperation('error', operation, { 
        error: error.message, 
        duration: Date.now() - startTime 
      })
      
      throw error
    }
  }

  /**
   * Chrome API の可用性をチェック
   */
  validateChromeApi() {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      throw new ChromeBrowserError('Chrome tabs API is not available', 'API_UNAVAILABLE')
    }
  }

  /**
   * 操作ログ出力
   * @param {string} level - ログレベル
   * @param {string} operation - 操作名
   * @param {Object} details - 詳細情報
   */
  logOperation(level, operation, details = {}) {
    if (this.debugMode && typeof console !== 'undefined') {
      console.debug(`[ChromeBrowser] ${operation} ${level}:`, details)
    }
  }

  /**
   * 操作履歴に追加
   * @param {Object} entry - 履歴エントリ
   */
  addToHistory(entry) {
    this.operationHistory.push(entry)
    
    // 履歴サイズ制限
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift()
    }
  }

  /**
   * 操作履歴を取得
   * @param {number} limit - 取得件数
   * @returns {Object[]}
   */
  getOperationHistory(limit = 20) {
    return this.operationHistory.slice(-limit)
  }

  /**
   * 統計情報を取得
   * @returns {Object}
   */
  getStats() {
    const recent = this.operationHistory.slice(-50)
    const operationCounts = {}
    const successCount = recent.filter(entry => entry.status === 'success').length
    const errorCount = recent.filter(entry => entry.status === 'error').length
    
    recent.forEach(entry => {
      operationCounts[entry.operation] = (operationCounts[entry.operation] || 0) + 1
    })
    
    const totalDuration = recent.reduce((sum, entry) => sum + (entry.duration || 0), 0)
    const averageDuration = recent.length > 0 ? totalDuration / recent.length : 0
    
    return {
      totalOperations: this.operationHistory.length,
      recentOperations: recent.length,
      successRate: recent.length > 0 ? (successCount / recent.length) * 100 : 0,
      errorCount,
      operationCounts,
      averageDuration: Math.round(averageDuration)
    }
  }

  /**
   * 操作履歴をクリア
   */
  clearHistory() {
    this.operationHistory = []
  }

  /**
   * 健全性チェック
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const health = {
      apiAvailable: false,
      tabsAccessible: false,
      activeTabFound: false,
      errors: []
    }
    
    try {
      this.validateChromeApi()
      health.apiAvailable = true
      
      // タブアクセステスト
      try {
        const tabs = await this.getAllTabs()
        health.tabsAccessible = true
        
        if (tabs.length > 0) {
          const activeTab = await this.getActiveTab()
          health.activeTabFound = Boolean(activeTab)
        }
      } catch (error) {
        health.errors.push(`Tab access error: ${error.message}`)
      }
      
    } catch (error) {
      health.errors.push(`API error: ${error.message}`)
    }
    
    return health
  }
}

/**
 * ChromeBrowser専用エラークラス
 */
class ChromeBrowserError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'ChromeBrowserError'
    this.code = code
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChromeBrowser, ChromeBrowserError }
}