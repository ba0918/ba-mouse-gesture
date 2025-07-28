/**
 * Chrome Storage API アダプター
 * Infrastructure層 - 外部システムとのインターフェース
 */

// Chrome Storage API専用アダプター

class ChromeStorageAdapter {
  constructor(logger = null) {
    this.storage = chrome?.storage
    this.logger = logger // DebugLoggerインスタンス
    
    if (!this.storage) {
      if (this.logger) {
        this.logger.warn('Chrome storage API not available')
      } else {
        console.warn('⚠️ Chrome storage API not available')
      }
    }
  }
  
  /**
   * DebugLoggerを設定
   */
  setLogger(logger) {
    this.logger = logger
  }
  
  /**
   * 静的ログ制御を使用してログを出力
   * DebugLogger未初期化時でもlogLevel=0設定を尊重
   */
  logWithLevel(level, message, ...args) {
    if (this.logger) {
      // DebugLoggerが利用可能な場合はそれを使用
      switch(level) {
      case 0: this.logger.error(message, ...args); break
      case 1: this.logger.warn(message, ...args); break
      case 2: this.logger.info(message, ...args); break
      case 3: this.logger.debug(message, ...args); break
      }
    } else if (level === 0) {
      // DebugLogger未初期化時はERRORレベル（0）のみ出力
      // より厳しい制御: logLevel設定がない限りINFO/DEBUGログは出力しない
      console.error(`❌ ${message}`, ...args)
    }
    // レベルが許可されていない場合は何も出力しない
  }

  /**
   * データを取得（chrome.storage.sync）
   */
  async get(keys = null) {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Getting data from sync storage:', keys)
      
      const result = await new Promise((resolve, reject) => {
        this.storage.sync.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(result)
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Data retrieved successfully')
      return result
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to get data:', error)
      throw new Error(`Failed to get data from storage: ${error.message}`)
    }
  }

  /**
   * データを保存（chrome.storage.sync）
   */
  async set(data) {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Setting data to sync storage')
      
      await new Promise((resolve, reject) => {
        this.storage.sync.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Data saved successfully')
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to set data:', error)
      throw new Error(`Failed to set data to storage: ${error.message}`)
    }
  }

  /**
   * 同期設定専用（content_script通知用）
   * 🔧 重要: デバッグ設定同期問題の解決
   */
  async syncSet(data) {
    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Syncing data for content script notification')
      
      // まずsync storageに保存
      await this.set(data)
      
      // storage.onChangedイベントが発火され、content_scriptが反応する
      this.logWithLevel(2, 'ChromeStorageAdapter: Sync data saved, content script will be notified')
      
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to sync data:', error)
      throw error
    }
  }

  /**
   * データを削除
   */
  async remove(keys) {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Removing data from sync storage:', keys)
      
      await new Promise((resolve, reject) => {
        this.storage.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Data removed successfully')
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to remove data:', error)
      throw new Error(`Failed to remove data from storage: ${error.message}`)
    }
  }

  /**
   * 全データをクリア
   */
  async clear() {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Clearing all sync storage data')
      
      await new Promise((resolve, reject) => {
        this.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: All data cleared successfully')
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to clear data:', error)
      throw new Error(`Failed to clear storage: ${error.message}`)
    }
  }

  /**
   * ローカルストレージからデータを取得（chrome.storage.local）
   */
  async getLocal(keys = null) {
    if (!this.storage?.local) {
      throw new Error('Chrome storage.local not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Getting data from local storage:', keys)
      
      const result = await new Promise((resolve, reject) => {
        this.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(result)
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Local data retrieved successfully')
      return result
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to get local data:', error)
      throw new Error(`Failed to get data from local storage: ${error.message}`)
    }
  }

  /**
   * ローカルストレージにデータを保存（chrome.storage.local）
   */
  async setLocal(data) {
    if (!this.storage?.local) {
      throw new Error('Chrome storage.local not available')
    }

    try {
      this.logWithLevel(2, 'ChromeStorageAdapter: Setting data to local storage')
      
      await new Promise((resolve, reject) => {
        this.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Local data saved successfully')
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to set local data:', error)
      throw new Error(`Failed to set data to local storage: ${error.message}`)
    }
  }

  /**
   * ストレージの使用量を取得
   */
  async getBytesInUse(keys = null) {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      const bytesInUse = await new Promise((resolve, reject) => {
        this.storage.sync.getBytesInUse(keys, (bytesInUse) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(bytesInUse)
          }
        })
      })
      
      this.logWithLevel(2, 'ChromeStorageAdapter: Storage usage:', bytesInUse, 'bytes')
      return bytesInUse
      
    } catch (error) {
      this.logWithLevel(0, 'ChromeStorageAdapter: Failed to get storage usage:', error)
      throw error
    }
  }

  /**
   * アダプターの可用性チェック
   */
  isAvailable() {
    return Boolean(this.storage?.sync && this.storage?.local)
  }

  /**
   * ストレージ変更リスナーを設定
   * @param {Function} callback - 変更時のコールバック関数
   * @returns {Function} リスナー削除関数
   */
  addChangeListener(callback) {
    if (!this.storage?.onChanged) {
      this.logWithLevel(1, 'Chrome storage.onChanged not available')
      return () => {} // 空の削除関数を返す
    }

    this.storage.onChanged.addListener(callback)
    this.logWithLevel(2, 'ChromeStorageAdapter: Change listener added')
    
    // リスナー削除関数を返す
    return () => {
      this.removeChangeListener(callback)
    }
  }

  /**
   * ストレージ変更リスナーを削除
   */
  removeChangeListener(callback) {
    if (!this.storage?.onChanged) {
      this.logWithLevel(1, 'Chrome storage.onChanged not available')
      return
    }

    this.storage.onChanged.removeListener(callback)
    this.logWithLevel(2, 'ChromeStorageAdapter: Change listener removed')
  }
}

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ChromeStorageAdapter }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.ChromeStorageAdapter = ChromeStorageAdapter
}