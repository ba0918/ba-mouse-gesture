/**
 * Chrome Storage API アダプター
 * Infrastructure層 - 外部システムとのインターフェース
 */

class ChromeStorageAdapter {
  constructor() {
    this.storage = chrome?.storage
    if (!this.storage) {
      console.warn('⚠️ Chrome storage API not available')
    }
  }

  /**
   * データを取得（chrome.storage.sync）
   */
  async get(keys = null) {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      console.log('🔧 ChromeStorageAdapter: Getting data from sync storage:', keys)
      
      const result = await new Promise((resolve, reject) => {
        this.storage.sync.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(result)
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: Data retrieved successfully')
      return result
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to get data:', error)
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
      console.log('🔧 ChromeStorageAdapter: Setting data to sync storage')
      
      await new Promise((resolve, reject) => {
        this.storage.sync.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: Data saved successfully')
      return true
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to set data:', error)
      throw new Error(`Failed to set data to storage: ${error.message}`)
    }
  }

  /**
   * 同期設定専用（content_script通知用）
   * 🔧 重要: デバッグ設定同期問題の解決
   */
  async syncSet(data) {
    try {
      console.log('🔧 ChromeStorageAdapter: Syncing data for content script notification')
      
      // まずsync storageに保存
      await this.set(data)
      
      // storage.onChangedイベントが発火され、content_scriptが反応する
      console.log('🔧 ChromeStorageAdapter: Sync data saved, content script will be notified')
      
      return true
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to sync data:', error)
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
      console.log('🔧 ChromeStorageAdapter: Removing data from sync storage:', keys)
      
      await new Promise((resolve, reject) => {
        this.storage.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: Data removed successfully')
      return true
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to remove data:', error)
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
      console.log('🔧 ChromeStorageAdapter: Clearing all sync storage data')
      
      await new Promise((resolve, reject) => {
        this.storage.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: All data cleared successfully')
      return true
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to clear data:', error)
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
      console.log('🔧 ChromeStorageAdapter: Getting data from local storage:', keys)
      
      const result = await new Promise((resolve, reject) => {
        this.storage.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(result)
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: Local data retrieved successfully')
      return result
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to get local data:', error)
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
      console.log('🔧 ChromeStorageAdapter: Setting data to local storage')
      
      await new Promise((resolve, reject) => {
        this.storage.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve()
          }
        })
      })
      
      console.log('🔧 ChromeStorageAdapter: Local data saved successfully')
      return true
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to set local data:', error)
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
      
      console.log('🔧 ChromeStorageAdapter: Storage usage:', bytesInUse, 'bytes')
      return bytesInUse
      
    } catch (error) {
      console.error('🚨 ChromeStorageAdapter: Failed to get storage usage:', error)
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
   */
  addChangeListener(callback) {
    if (!this.storage?.onChanged) {
      console.warn('⚠️ Chrome storage.onChanged not available')
      return
    }

    this.storage.onChanged.addListener(callback)
    console.log('🔧 ChromeStorageAdapter: Change listener added')
  }

  /**
   * ストレージ変更リスナーを削除
   */
  removeChangeListener(callback) {
    if (!this.storage?.onChanged) {
      console.warn('⚠️ Chrome storage.onChanged not available')
      return
    }

    this.storage.onChanged.removeListener(callback)
    console.log('🔧 ChromeStorageAdapter: Change listener removed')
  }
}

module.exports = ChromeStorageAdapter