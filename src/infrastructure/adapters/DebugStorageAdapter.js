/**
 * デバッグ設定専用ストレージアダプター
 * popup-content script間の統一されたストレージアクセスを提供
 * 
 * 修正方針：
 * - 両方でsync storageを使用（統一）
 * - local storageは完全に廃止
 * - 設定変更の即座同期を保証
 */
class DebugStorageAdapter {
  constructor() {
    this.STORAGE_KEY = 'debugSettings'
    this.defaultSettings = {
      enabled: false,
      logLevel: 2,
      showStatus: false,
      statusPosition: 'top-right'
    }
    
    // storage変更リスナーの管理
    this.changeListeners = new Set()
  }

  /**
   * デバッグ設定を読み込み（統一されたアクセス）
   * popup/content script両方で同じメソッドを使用
   */
  async loadSettings() {
    try {
      // 🎯 修正：sync storageのみ使用
      const result = await this.chromeStorageGet(['debugSettings'])
      
      if (result.debugSettings) {
        return {
          ...this.defaultSettings,
          ...result.debugSettings
        }
      }
      
      // 初回読み込み時はデフォルト値を返す
      return { ...this.defaultSettings }
      
    } catch (error) {
      console.error('❌ DebugStorageAdapter: Failed to load settings:', error)
      return { ...this.defaultSettings }
    }
  }

  /**
   * デバッグ設定を保存（統一されたアクセス）
   * popup/content script両方で同じメソッドを使用
   */
  async saveSettings(settings) {
    try {
      const settingsToSave = {
        ...this.defaultSettings,
        ...settings
      }
      
      console.log('🔧 DebugStorageAdapter: Saving settings to sync storage:', settingsToSave)
      
      // 🎯 修正：sync storageのみ使用（local storageは完全廃止）
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: settingsToSave 
      })
      
      console.log('✅ DebugStorageAdapter: Settings saved successfully')
      return settingsToSave
      
    } catch (error) {
      console.error('❌ DebugStorageAdapter: Failed to save settings:', error)
      throw error
    }
  }

  /**
   * 設定変更の監視を開始
   * popup/content script両方で同期イベントを受信
   */
  startChangeListener(callback) {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback function is required')
    }
    
    this.changeListeners.add(callback)
    
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      // 統一されたchange listenerを設定
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes[this.STORAGE_KEY]) {
          const newSettings = changes[this.STORAGE_KEY].newValue
          const oldSettings = changes[this.STORAGE_KEY].oldValue
          
          console.log('🔧 DebugStorageAdapter: Settings changed:', {
            old: oldSettings,
            new: newSettings
          })
          
          // 全ての登録されたコールバックを実行
          this.changeListeners.forEach(listener => {
            try {
              listener(newSettings, oldSettings)
            } catch (error) {
              console.error('❌ DebugStorageAdapter: Listener callback failed:', error)
            }
          })
        }
      })
    }
    
    console.log('✅ DebugStorageAdapter: Change listener started')
  }

  /**
   * 設定変更の監視を停止
   */
  stopChangeListener(callback) {
    if (callback) {
      this.changeListeners.delete(callback)
    } else {
      this.changeListeners.clear()
    }
  }

  /**
   * 現在の設定状態を確認（デバッグ用）
   */
  async getCurrentState() {
    try {
      const syncSettings = await this.chromeStorageGet([this.STORAGE_KEY])
      
      return {
        storageType: 'sync-only',
        settings: syncSettings[this.STORAGE_KEY] || null,
        listenerCount: this.changeListeners.size,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error('❌ DebugStorageAdapter: Failed to get current state:', error)
      return null
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
   * テスト環境とブラウザ環境の両方に対応
   */
  chromeStorageGet(keys) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }

  chromeStorageSet(data) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * 旧形式からの移行（互換性維持）
   * local storageのデータを検出して警告を出す
   */
  async checkLegacyData() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return { hasLegacyData: false }
      }
      
      // local storageに古いデータがあるかチェック
      const localResult = await new Promise((resolve) => {
        chrome.storage.local.get([this.STORAGE_KEY], resolve)
      })
      
      if (localResult[this.STORAGE_KEY]) {
        console.warn('⚠️ DebugStorageAdapter: Legacy local storage data detected:', localResult[this.STORAGE_KEY])
        return {
          hasLegacyData: true,
          legacyData: localResult[this.STORAGE_KEY]
        }
      }
      
      return { hasLegacyData: false }
      
    } catch (error) {
      console.error('❌ DebugStorageAdapter: Failed to check legacy data:', error)
      return { hasLegacyData: false }
    }
  }

  /**
   * 旧形式データの削除（クリーンアップ）
   */
  async cleanupLegacyData() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return
      }
      
      await new Promise((resolve) => {
        chrome.storage.local.remove([this.STORAGE_KEY], resolve)
      })
      
      console.log('✅ DebugStorageAdapter: Legacy data cleaned up')
      
    } catch (error) {
      console.error('❌ DebugStorageAdapter: Failed to cleanup legacy data:', error)
    }
  }
}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugStorageAdapter = DebugStorageAdapter
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugStorageAdapter }
}