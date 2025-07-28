/**
 * Content Script用のストレージアダプター
 * Clean Architecture準拠 - Chrome Storage APIの抽象化
 */

class ContentStorageAdapter {
  constructor() {
    if (!chrome?.storage) {
      console.warn('⚠️ Chrome storage API not available')
    }
  }

  /**
   * データを取得（chrome.storage.sync）
   */
  async get(keys = null) {
    if (!chrome?.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      const result = await chrome.storage.sync.get(keys)
      return result
    } catch (error) {
      console.error('🚨 ContentStorageAdapter: Failed to get data:', error)
      throw new Error(`Failed to get data from storage: ${error.message}`)
    }
  }

  /**
   * データを保存（chrome.storage.sync）
   */
  async set(data) {
    if (!chrome?.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      await chrome.storage.sync.set(data)
      return true
    } catch (error) {
      console.error('🚨 ContentStorageAdapter: Failed to set data:', error)
      throw new Error(`Failed to set data to storage: ${error.message}`)
    }
  }

  /**
   * データを削除
   */
  async remove(keys) {
    if (!chrome?.storage?.sync) {
      throw new Error('Chrome storage.sync not available')
    }

    try {
      await chrome.storage.sync.remove(keys)
      return true
    } catch (error) {
      console.error('🚨 ContentStorageAdapter: Failed to remove data:', error)
      throw new Error(`Failed to remove data from storage: ${error.message}`)
    }
  }

  /**
   * アダプターの可用性チェック
   */
  isAvailable() {
    return Boolean(chrome?.storage?.sync)
  }
}

// Content Script環境でグローバルに公開
if (typeof window !== 'undefined') {
  window.ContentStorageAdapter = ContentStorageAdapter
}