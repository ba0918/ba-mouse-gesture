/**
 * 設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 デバッグ設定以外の全設定を管理
 */

class SettingsUseCase {
  constructor() {
    this.STORAGE_KEY = 'settings'
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      defaultGestureStates: {
        left: true,
        right: true,
        up: true,
        down: true,
        downright: true,
        upright: true,
        rightdown: true,
        updown: true,
        super_refresh: true,
        prev_tab: true,
        next_tab: true
      }
    }
  }

  /**
   * 設定を取得
   */
  async getSettings() {
    try {
      const result = await this.chromeStorageGet([this.STORAGE_KEY])
      
      if (result[this.STORAGE_KEY]) {
        return {
          ...this.defaultSettings,
          ...result[this.STORAGE_KEY]
        }
      }
      
      // デフォルト設定を返す
      return { ...this.defaultSettings }
      
    } catch (error) {
      console.error('❌ SettingsUseCase: Failed to load settings:', error)
      return { ...this.defaultSettings }
    }
  }

  /**
   * 設定を保存
   */
  async saveSettings(settings) {
    try {
      const settingsToSave = {
        ...this.defaultSettings,
        ...settings
      }
      
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: settingsToSave 
      })
      
      console.log('✅ SettingsUseCase: Settings saved successfully')
      
      // バックグラウンドスクリプトに設定変更を通知
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          settings: settingsToSave
        })
      }
      
      return settingsToSave
      
    } catch (error) {
      console.error('❌ SettingsUseCase: Failed to save settings:', error)
      throw error
    }
  }

  /**
   * デフォルト設定を取得
   */
  getDefaultSettings() {
    return { ...this.defaultSettings }
  }

  /**
   * Chrome Storage APIの統一インターフェース
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
  window.SettingsUseCase = window.SettingsUseCase || SettingsUseCase
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsUseCase
}