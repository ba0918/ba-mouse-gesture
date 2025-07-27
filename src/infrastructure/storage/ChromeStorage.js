/**
 * ChromeStorage インフラストラクチャ
 * chrome.storage API の統一インターフェース
 */
class ChromeStorage {
  /**
   * @param {Object} options - 設定オプション
   */
  constructor(options = {}) {
    this.defaultArea = options.defaultArea || 'sync'
    this.errorHandler = options.errorHandler || this.defaultErrorHandler
    this.retryAttempts = options.retryAttempts || 3
    this.retryDelay = options.retryDelay || 1000
  }

  /**
   * データを取得
   * @param {string|string[]|Object} keys - 取得するキー
   * @param {string} area - ストレージエリア ('sync' | 'local')
   * @returns {Promise<Object>}
   */
  get(keys, area = this.defaultArea) {
    return this.withRetry(() => {
      this.validateChromeApi()
      
      const storage = this.getStorageArea(area)
      
      return new Promise((resolve, reject) => {
        storage.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            // ログ出力（デバッグ用）
            this.logOperation('get', { keys, area, resultKeys: Object.keys(result) })
            resolve(result)
          }
        })
      })
    })
  }

  /**
   * データを保存
   * @param {Object} items - 保存するデータ
   * @param {string} area - ストレージエリア
   * @returns {Promise<void>}
   */
  set(items, area = this.defaultArea) {
    return this.withRetry(() => {
      this.validateChromeApi()
      this.validateItems(items)
      
      const storage = this.getStorageArea(area)
      
      return new Promise((resolve, reject) => {
        storage.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            this.logOperation('set', { keys: Object.keys(items), area })
            resolve()
          }
        })
      })
    })
  }

  /**
   * データを削除
   * @param {string|string[]} keys - 削除するキー
   * @param {string} area - ストレージエリア
   * @returns {Promise<void>}
   */
  remove(keys, area = this.defaultArea) {
    return this.withRetry(() => {
      this.validateChromeApi()
      
      const storage = this.getStorageArea(area)
      
      return new Promise((resolve, reject) => {
        storage.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            this.logOperation('remove', { keys, area })
            resolve()
          }
        })
      })
    })
  }

  /**
   * 全データを削除
   * @param {string} area - ストレージエリア
   * @returns {Promise<void>}
   */
  clear(area = this.defaultArea) {
    return this.withRetry(() => {
      this.validateChromeApi()
      
      const storage = this.getStorageArea(area)
      
      return new Promise((resolve, reject) => {
        storage.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            this.logOperation('clear', { area })
            resolve()
          }
        })
      })
    })
  }

  /**
   * 使用容量を取得
   * @param {string|string[]} keys - 対象キー（null で全体）
   * @param {string} area - ストレージエリア
   * @returns {Promise<number>} バイト数
   */
  getBytesInUse(keys = null, area = this.defaultArea) {
    return this.withRetry(() => {
      this.validateChromeApi()
      
      const storage = this.getStorageArea(area)
      
      return new Promise((resolve, reject) => {
        if (!storage.getBytesInUse) {
          // getBytesInUse が利用できない場合の代替実装
          storage.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(this.calculateDataSize(result))
            }
          })
        } else {
          storage.getBytesInUse(keys, (bytesInUse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(bytesInUse)
            }
          })
        }
      })
    })
  }

  /**
   * ストレージ変更を監視
   * @param {Function} callback - 変更時コールバック
   * @param {string} area - 監視対象エリア
   * @returns {Function} リスナー削除関数
   */
  onChanged(callback, area = null) {
    this.validateChromeApi()
    
    const wrappedCallback = (changes, namespace) => {
      // エリア指定がある場合はフィルタリング
      if (area && namespace !== area) return
      
      this.logOperation('changed', { 
        changedKeys: Object.keys(changes), 
        namespace 
      })
      
      callback(changes, namespace)
    }
    
    chrome.storage.onChanged.addListener(wrappedCallback)
    
    // リスナー削除関数を返す
    return () => {
      chrome.storage.onChanged.removeListener(wrappedCallback)
    }
  }

  /**
   * データの一括更新（マージ）
   * @param {Object} updates - 更新データ
   * @param {string} area - ストレージエリア
   * @returns {Promise<Object>} 更新後のデータ
   */
  // eslint-disable-next-line require-await
  async update(updates, area = this.defaultArea) {
    return this.withRetry(async () => {
      // 既存データを取得
      const keys = Object.keys(updates)
      const existing = await this.get(keys, area)
      
      // マージ処理
      const merged = {}
      for (const key of keys) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          // オブジェクトの場合は深いマージ
          merged[key] = { ...existing[key], ...updates[key] }
        } else {
          // プリミティブまたは配列の場合は置換
          merged[key] = updates[key]
        }
      }
      
      await this.set(merged, area)
      return merged
    })
  }

  /**
   * 安全なデータ取得（デフォルト値付き）
   * @param {string} key - 取得するキー
   * @param {*} defaultValue - デフォルト値
   * @param {string} area - ストレージエリア
   * @returns {Promise<*>}
   */
  async getSafe(key, defaultValue, area = this.defaultArea) {
    try {
      const result = await this.get(key, area)
      return result[key] !== undefined ? result[key] : defaultValue
    } catch (error) {
      this.errorHandler(error, 'getSafe', { key, area })
      return defaultValue
    }
  }

  /**
   * ストレージエリアを取得
   * @param {string} area
   * @returns {Object}
   */
  getStorageArea(area) {
    if (area === 'sync') return chrome.storage.sync
    if (area === 'local') return chrome.storage.local
    if (area === 'session') return chrome.storage.session
    
    throw new Error(`Invalid storage area: ${area}`)
  }

  /**
   * Chrome API の可用性をチェック
   */
  validateChromeApi() {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API is not available')
    }
  }

  /**
   * 保存データの妥当性をチェック
   * @param {Object} items
   */
  validateItems(items) {
    if (!items || typeof items !== 'object') {
      throw new Error('Items must be an object')
    }
    
    // データサイズのチェック（Chrome制限対応）
    const dataSize = this.calculateDataSize(items)
    const maxSize = this.defaultArea === 'sync' ? 8192 : 10485760 // 8KB(sync) or 10MB(local)
    
    if (dataSize > maxSize) {
      throw new Error(`Data size (${dataSize} bytes) exceeds limit (${maxSize} bytes)`)
    }
  }

  /**
   * データサイズを計算
   * @param {Object} data
   * @returns {number} バイト数
   */
  calculateDataSize(data) {
    return new window.Blob([JSON.stringify(data)]).size
  }

  /**
   * リトライ付きで操作を実行
   * @param {Function} operation
   * @returns {Promise<*>}
   */
  async withRetry(operation) {
    let lastError
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        // Chrome runtime エラーやvalidationエラーは即座に諦める
        if (error.message && (
          error.message.includes('Extension context invalidated') ||
          error.message.includes('Items must be an object') ||
          error.message.includes('Data size') ||
          error.message.includes('Invalid storage area')
        )) {
          throw error
        }
        
        // 最後の試行でなければリトライ
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt)
          continue
        }
      }
    }
    
    throw lastError
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
   * 操作ログ出力
   * @param {string} operation
   * @param {Object} details
   */
  logOperation(operation, details) {
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[ChromeStorage] ${operation}:`, details)
    }
  }

  /**
   * デフォルトエラーハンドラー
   * @param {Error} error
   * @param {string} operation
   * @param {Object} context
   */
  defaultErrorHandler(error, operation, context) {
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[ChromeStorage] Error in ${operation}:`, error, context)
    }
  }

  /**
   * ストレージ使用量の統計を取得
   * @returns {Promise<Object>}
   */
  async getUsageStats() {
    const stats = {}
    
    try {
      // 各エリアの使用量を取得
      for (const area of ['sync', 'local']) {
        try {
          const bytesInUse = await this.getBytesInUse(null, area)
          const quota = area === 'sync' ? chrome.storage.sync.QUOTA_BYTES : 
            chrome.storage.local.QUOTA_BYTES
          
          stats[area] = {
            bytesInUse,
            quota,
            percentUsed: Math.round((bytesInUse / quota) * 100)
          }
        } catch (error) {
          stats[area] = { error: error.message }
        }
      }
    } catch (error) {
      this.errorHandler(error, 'getUsageStats', {})
    }
    
    return stats
  }

  /**
   * ストレージの健全性チェック
   * @returns {Promise<Object>}
   */
  async healthCheck() {
    const health = {
      apiAvailable: false,
      syncWorking: false,
      localWorking: false,
      errors: []
    }
    
    try {
      // API可用性チェック
      this.validateChromeApi()
      health.apiAvailable = true
      
      // 各エリアの動作チェック
      const testKey = '_healthCheck_' + Date.now()
      const testValue = { timestamp: Date.now() }
      
      // Sync storage test
      try {
        await this.set({ [testKey]: testValue }, 'sync')
        const result = await this.get(testKey, 'sync')
        if (result[testKey]?.timestamp === testValue.timestamp) {
          health.syncWorking = true
        }
        await this.remove(testKey, 'sync')
      } catch (error) {
        health.errors.push(`Sync storage error: ${error.message}`)
      }
      
      // Local storage test
      try {
        await this.set({ [testKey]: testValue }, 'local')
        const result = await this.get(testKey, 'local')
        if (result[testKey]?.timestamp === testValue.timestamp) {
          health.localWorking = true
        }
        await this.remove(testKey, 'local')
      } catch (error) {
        health.errors.push(`Local storage error: ${error.message}`)
      }
      
    } catch (error) {
      health.errors.push(`API error: ${error.message}`)
    }
    
    return health
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChromeStorage }
}