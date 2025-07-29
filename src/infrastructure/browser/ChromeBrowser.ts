/**
 * ChromeBrowser インフラストラクチャ
 * Chrome Browser API の統一インターフェース
 */

// 型定義
interface ChromeBrowserOptions {
  timeout?: number;
  debugMode?: boolean;
}

interface OperationHistoryEntry {
  operation: string;
  status: 'success' | 'error';
  duration: number;
  timestamp: number;
  error?: string;
}

interface TabCreateOptions {
  active?: boolean;
  [key: string]: any;
}

interface BrowserStats {
  totalOperations: number;
  recentOperations: number;
  successRate: number;
  errorCount: number;
  operationCounts: Record<string, number>;
  averageDuration: number;
}

interface HealthCheckResult {
  apiAvailable: boolean;
  tabsAccessible: boolean;
  activeTabFound: boolean;
  errors: string[];
}

class ChromeBrowser {
  private defaultTimeout: number;
  private debugMode: boolean;
  private operationHistory: OperationHistoryEntry[];
  private maxHistorySize: number;

  /**
   * @param options - 設定オプション
   */
  constructor(options: ChromeBrowserOptions = {}) {
    this.defaultTimeout = options.timeout || 5000;
    this.debugMode = options.debugMode || false;
    this.operationHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * タブ操作: 戻る
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  goBack(tabId?: number): Promise<void> {
    return this.executeTabOperation('goBack', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.goBack(tab.id!, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error' || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(undefined)
        })
      })
    }, tabId || undefined)
  }

  /**
   * タブ操作: 進む
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  goForward(tabId?: number): Promise<void> {
    return this.executeTabOperation('goForward', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.goForward(tab.id!, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error' || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(undefined)
        })
      })
    }, tabId || undefined)
  }

  /**
   * タブ操作: リロード
   * @param tabId - タブID（省略時は現在のタブ）
   * @param bypassCache - キャッシュをバイパスするか
   * @returns Promise<void>
   */
  reload(tabId: number | null = null, bypassCache: boolean = false): Promise<void> {
    return this.executeTabOperation('reload', async (tab) => {
      this.validateChromeApi()
      
      const reloadProperties = { bypassCache }
      
      await new Promise((resolve, reject) => {
        chrome.tabs.reload(tab.id!, reloadProperties, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error' || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(undefined)
        })
      })
    }, tabId || undefined)
  }

  /**
   * タブ操作: スーパーリロード（キャッシュクリア付き）
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  superReload(tabId: number | null = null): Promise<void> {
    return this.reload(tabId, true)
  }

  /**
   * タブ操作: 新しいタブを開く
   * @param url - 開くURL（省略時は新しいタブページ）
   * @param options - タブ作成オプション
   * @returns Promise<chrome.tabs.Tab> 作成されたタブ情報
   */
  createTab(url: string | null = null, options: TabCreateOptions = {}): Promise<chrome.tabs.Tab> {
    return this.executeOperation('createTab', () => {
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
              chrome.runtime.lastError.message || 'Unknown error' || 'Unknown error', 
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
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  closeTab(tabId?: number): Promise<void> {
    return this.executeTabOperation('closeTab', async (tab) => {
      this.validateChromeApi()
      
      await new Promise((resolve, reject) => {
        chrome.tabs.remove(tab.id!, () => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(undefined)
        })
      })
    }, tabId || undefined)
  }

  /**
   * タブ操作: タブを複製
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<chrome.tabs.Tab> 複製されたタブ情報
   */
  duplicateTab(tabId?: number): Promise<chrome.tabs.Tab> {
    return this.executeTabOperation('duplicateTab', (tab) => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.duplicate(tab.id!, (duplicatedTab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(duplicatedTab!)
        })
      })
    }, tabId || undefined)
  }

  /**
   * タブ操作: 前のタブに切り替え
   * @returns Promise<chrome.tabs.Tab> 切り替え先タブ情報
   */
  switchToPreviousTab(): Promise<chrome.tabs.Tab> {
    return this.executeOperation('switchToPreviousTab', async () => {
      const tabs = await this.getAllTabs()
      const currentTab = await this.getActiveTab()
      
      if (tabs.length <= 1) {
        throw new ChromeBrowserError('No other tabs available', 'NO_TABS_ERROR')
      }
      
      const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id!!)
      const previousIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
      const previousTab = tabs[previousIndex]
      
      await this.activateTab(previousTab.id!)
      return previousTab
    })
  }

  /**
   * タブ操作: 次のタブに切り替え
   * @returns Promise<chrome.tabs.Tab> 切り替え先タブ情報
   */
  switchToNextTab(): Promise<chrome.tabs.Tab> {
    return this.executeOperation('switchToNextTab', async () => {
      const tabs = await this.getAllTabs()
      const currentTab = await this.getActiveTab()
      
      if (tabs.length <= 1) {
        throw new ChromeBrowserError('No other tabs available', 'NO_TABS_ERROR')
      }
      
      const currentIndex = tabs.findIndex(tab => tab.id === currentTab.id!!)
      const nextIndex = (currentIndex + 1) % tabs.length
      const nextTab = tabs[nextIndex]
      
      await this.activateTab(nextTab.id!)
      return nextTab
    })
  }

  /**
   * タブ操作: タブをアクティブにする
   * @param tabId - タブID
   * @returns Promise<chrome.tabs.Tab> アクティブになったタブ情報
   */
  activateTab(tabId: number): Promise<chrome.tabs.Tab> {
    return this.executeOperation('activateTab', () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.update(tabId, { active: true }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
              'TAB_OPERATION_ERROR'
            ))
            return
          }
          resolve(tab!)
        })
      })
    })
  }

  /**
   * ページ操作: 最上部にスクロール
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  scrollToTop(tabId?: number): Promise<any> {
    return this.executeScriptInTab(tabId, () => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  /**
   * ページ操作: 最下部にスクロール
   * @param tabId - タブID（省略時は現在のタブ）
   * @returns Promise<void>
   */
  scrollToBottom(tabId?: number): Promise<any> {
    return this.executeScriptInTab(tabId, () => {
      window.scrollTo({ 
        top: document.documentElement.scrollHeight, 
        behavior: 'smooth' 
      })
    })
  }

  /**
   * タブでスクリプトを実行
   * @param tabId - タブID
   * @param script - 実行するスクリプト
   * @returns Promise<any> スクリプトの実行結果
   */
  executeScriptInTab(tabId: number | undefined, script: () => any): Promise<any> {
    return this.executeTabOperation('executeScript', async (tab) => {
      this.validateChromeApi()
      
      if (!chrome.scripting) {
        throw new ChromeBrowserError('Chrome scripting API is not available', 'API_UNAVAILABLE')
      }
      
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id! },
        func: script
      })
      
      return results?.[0]?.result
    }, tabId || undefined)
  }

  /**
   * 現在のアクティブタブを取得
   * @returns Promise<chrome.tabs.Tab> タブ情報
   */
  getActiveTab(): Promise<chrome.tabs.Tab> {
    return this.executeOperation('getActiveTab', () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
              'TAB_QUERY_ERROR'
            ))
            return
          }
          
          if (tabs.length === 0) {
            reject(new ChromeBrowserError('No active tab found', 'NO_ACTIVE_TAB'))
            return
          }
          
          resolve(tabs[0]!)
        })
      })
    })
  }

  /**
   * 全タブを取得
   * @param query - クエリ条件
   * @returns Promise<chrome.tabs.Tab[]> タブ配列
   */
  getAllTabs(query: chrome.tabs.QueryInfo = {}): Promise<chrome.tabs.Tab[]> {
    return this.executeOperation('getAllTabs', () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.query(query, (tabs) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
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
   * @param tabId - タブID
   * @returns Promise<chrome.tabs.Tab> タブ情報
   */
  getTab(tabId: number): Promise<chrome.tabs.Tab> {
    return this.executeOperation('getTab', () => {
      this.validateChromeApi()
      
      return new Promise((resolve, reject) => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new ChromeBrowserError(
              chrome.runtime.lastError.message || 'Unknown error', 
              'TAB_QUERY_ERROR'
            ))
            return
          }
          resolve(tab!)
        })
      })
    })
  }

  /**
   * タブ操作を実行（共通処理）
   * @param operation - 操作名
   * @param executor - 実行関数
   * @param tabId - タブID
   * @returns Promise<any>
   */
  executeTabOperation(operation: string, executor: (tab: chrome.tabs.Tab) => Promise<any>, tabId?: number): Promise<any> {
    return this.executeOperation(operation, async () => {
      const tab = tabId ? await this.getTab(tabId) : await this.getActiveTab()
      return executor(tab)
    })
  }

  /**
   * 操作を実行（共通処理）
   * @param operation - 操作名
   * @param executor - 実行関数
   * @returns Promise<any>
   */
  async executeOperation(operation: string, executor: () => Promise<any>): Promise<any> {
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
        error: (error as Error).message,
        duration: Date.now() - startTime,
        timestamp: Date.now()
      })
      
      this.logOperation('error', operation, { 
        error: (error as Error).message, 
        duration: Date.now() - startTime 
      })
      
      throw error
    }
  }

  /**
   * Chrome API の可用性をチェック
   */
  private validateChromeApi(): void {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      throw new ChromeBrowserError('Chrome tabs API is not available', 'API_UNAVAILABLE')
    }
  }

  /**
   * 操作ログ出力
   * @param level - ログレベル
   * @param operation - 操作名
   * @param details - 詳細情報
   */
  private logOperation(level: string, operation: string, details: any = {}): void {
    if (this.debugMode && typeof console !== 'undefined') {
      console.log(`[ChromeBrowser] ${operation} ${level}:`, details)
    }
  }

  /**
   * 操作履歴に追加
   * @param entry - 履歴エントリ
   */
  private addToHistory(entry: OperationHistoryEntry): void {
    this.operationHistory.push(entry)
    
    // 履歴サイズ制限
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift()
    }
  }

  /**
   * 操作履歴を取得
   * @param limit - 取得件数
   * @returns OperationHistoryEntry[]
   */
  getOperationHistory(limit: number = 20): OperationHistoryEntry[] {
    return this.operationHistory.slice(-limit)
  }

  /**
   * 統計情報を取得
   * @returns BrowserStats
   */
  getStats(): BrowserStats {
    const recent = this.operationHistory.slice(-50)
    const operationCounts: Record<string, number> = {}
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
  clearHistory(): void {
    this.operationHistory = []
  }

  /**
   * 健全性チェック
   * @returns Promise<HealthCheckResult>
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const health = {
      apiAvailable: false,
      tabsAccessible: false,
      activeTabFound: false,
      errors: [] as string[]
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
        health.errors.push(`Tab access error: ${(error as Error).message}`)
      }
      
    } catch (error) {
      health.errors.push(`API error: ${(error as Error).message}`)
    }
    
    return health
  }
}

/**
 * ChromeBrowser専用エラークラス
 */
class ChromeBrowserError extends Error {
  public code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ChromeBrowserError';
    this.code = code;
  }
}

// ES6 Module export
export { ChromeBrowser, ChromeBrowserError };