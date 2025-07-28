/**
 * デバッグ設定専用ストレージアダプター
 * popup-content script間の統一されたストレージアクセスを提供
 * 
 * 修正方針：
 * - 両方でsync storageを使用（統一）
 * - local storageは完全に廃止
 * - 設定変更の即座同期を保証
 */

// デバッグ設定専用ストレージアダプター

class DebugStorageAdapter {
  constructor(logger = null) {
    this.STORAGE_KEY = 'appSettings'
    this.defaultSettings = {
      enabled: false,
      logLevel: 2,
      showStatus: false,
      statusPosition: 'top-right'
    }
    
    // storage変更リスナーの管理
    this.changeListeners = new Set()
    this.logger = logger // DebugLoggerインスタンス
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
      console.error(`❌ ${message}`, ...args)
    }
    // レベルが許可されていない場合は何も出力しない
  }

  /**
   * デバッグ設定を読み込み（統一されたアクセス）
   * popup/content script両方で同じメソッドを使用
   */
  async loadSettings() {
    try {
      // 🎯 修正：appSettings.debugSettingsパスから読み込み
      const result = await this.chromeStorageGet(['appSettings'])
      
      if (result.appSettings && result.appSettings.debugSettings) {
        return {
          ...this.defaultSettings,
          ...result.appSettings.debugSettings
        }
      }
      
      // 初回読み込み時はデフォルト値を返す
      return { ...this.defaultSettings }
      
    } catch (error) {
      this.logWithLevel(0, 'DebugStorageAdapter: Failed to load settings:', error)
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
      
      this.logWithLevel(2, 'DebugStorageAdapter: Saving settings to sync storage:', settingsToSave)
      
      // 🎯 修正：既存のappSettingsを取得してdebugSettings部分のみ更新
      const result = await this.chromeStorageGet(['appSettings'])
      const currentAppSettings = result.appSettings || {}
      
      const updatedAppSettings = {
        ...currentAppSettings,
        debugSettings: settingsToSave
      }
      
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: updatedAppSettings 
      })
      
      this.logWithLevel(2, 'DebugStorageAdapter: Settings saved successfully')
      return settingsToSave
      
    } catch (error) {
      this.logWithLevel(0, 'DebugStorageAdapter: Failed to save settings:', error)
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
          const newAppSettings = changes[this.STORAGE_KEY].newValue
          const oldAppSettings = changes[this.STORAGE_KEY].oldValue
          
          const newSettings = newAppSettings?.debugSettings
          const oldSettings = oldAppSettings?.debugSettings
          
          // debugSettings部分に変更があった場合のみコールバックを実行
          if (newSettings !== oldSettings) {
            // ログは必要に応じてDebugLoggerで出力
            this.logWithLevel(2, 'DebugStorageAdapter: Settings changed:', {
              old: oldSettings,
              new: newSettings
            })
            
            // 全ての登録されたコールバックを実行
            this.changeListeners.forEach(listener => {
              try {
                listener(newSettings, oldSettings)
              } catch (error) {
                this.logWithLevel(0, 'DebugStorageAdapter: Listener callback failed:', error)
              }
            })
          }
        }
      })
    }
    
    this.logWithLevel(2, 'DebugStorageAdapter: Change listener started')
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
        settings: syncSettings[this.STORAGE_KEY]?.debugSettings || null,
        listenerCount: this.changeListeners.size,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      this.logWithLevel(0, 'DebugStorageAdapter: Failed to get current state:', error)
      return null
    }
  }

  /**
   * 旧形式のlocal storageデータの検出と移行
   */
  // eslint-disable-next-line require-await
  async checkLegacyData() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return { hasLegacyData: false, legacyData: null }
      }

      // local storageから旧形式のデータを確認
      return new Promise((resolve) => {
        chrome.storage.local.get(['debugSettings'], (result) => {
          if (chrome.runtime.lastError) {
            this.logWithLevel(0, 'DebugStorageAdapter: Failed to check legacy data:', chrome.runtime.lastError)
            resolve({ hasLegacyData: false, legacyData: null })
            return
          }

          const hasLegacyData = result.debugSettings && typeof result.debugSettings === 'object'
          
          this.logWithLevel(2, 'DebugStorageAdapter: Legacy data check result:', { hasLegacyData, legacyData: result.debugSettings })
          
          resolve({
            hasLegacyData,
            legacyData: hasLegacyData ? result.debugSettings : null
          })
        })
      })
    } catch (error) {
      this.logWithLevel(0, 'DebugStorageAdapter: Failed to check legacy data:', error)
      return { hasLegacyData: false, legacyData: null }
    }
  }

  /**
   * 旧形式のlocal storageデータを削除
   */
  // eslint-disable-next-line require-await
  async cleanupLegacyData() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return
      }

      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(['debugSettings'], () => {
          if (chrome.runtime.lastError) {
            this.logWithLevel(0, 'DebugStorageAdapter: Failed to cleanup legacy data:', chrome.runtime.lastError)
            reject(chrome.runtime.lastError)
          } else {
            this.logWithLevel(2, 'DebugStorageAdapter: Legacy data cleaned up successfully')
            resolve()
          }
        })
      })
    } catch (error) {
      this.logWithLevel(0, 'DebugStorageAdapter: Failed to cleanup legacy data:', error)
      throw error
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

}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugStorageAdapter = DebugStorageAdapter
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugStorageAdapter }
}