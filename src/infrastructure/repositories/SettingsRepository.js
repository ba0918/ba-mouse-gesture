/**
 * 設定リポジトリ
 * Infrastructure層 - 外部システムとのインターフェース
 */

class SettingsRepository {
  constructor(storageAdapter) {
    this.storageAdapter = storageAdapter
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      defaultGestureStates: {
        // 基本ジェスチャー
        left: true,
        right: true,
        up: true,
        down: true,
        // 複合ジェスチャー
        downright: true,
        upright: true,
        rightdown: true,
        updown: true,
        // Phase 10新機能
        super_refresh: true,
        prev_tab: true,
        next_tab: true
      },
      debugSettings: {
        enabled: true,
        logLevel: 2, // INFO
        showStatus: true,
        statusPosition: 'top-right'
      }
    }
  }

  /**
   * 設定を取得
   */
  async getSettings() {
    try {
      console.log('🔧 SettingsRepository: Loading settings')
      
      const settings = await this.storageAdapter.get(Object.keys(this.defaultSettings))
      
      // デフォルト値とマージ
      const mergedSettings = { ...this.defaultSettings, ...settings }
      
      console.log('🔧 SettingsRepository: Settings loaded successfully')
      return mergedSettings
      
    } catch (error) {
      console.error('🚨 SettingsRepository: Failed to load settings:', error)
      // フォールバックとしてデフォルト設定を返す
      return { ...this.defaultSettings }
    }
  }

  /**
   * 設定を保存
   */
  async saveSettings(settings) {
    try {
      console.log('🔧 SettingsRepository: Saving settings')
      
      // 妥当性検証
      this.validateSettings(settings)
      
      await this.storageAdapter.set(settings)
      
      console.log('🔧 SettingsRepository: Settings saved successfully')
      return true
      
    } catch (error) {
      console.error('🚨 SettingsRepository: Failed to save settings:', error)
      throw new Error(`Failed to save settings: ${error.message}`)
    }
  }

  /**
   * 特定の設定項目を更新
   */
  async updateSetting(key, value) {
    try {
      const currentSettings = await this.getSettings()
      currentSettings[key] = value
      
      await this.saveSettings(currentSettings)
      return true
      
    } catch (error) {
      console.error('🚨 SettingsRepository: Failed to update setting:', error)
      throw error
    }
  }

  /**
   * デバッグ設定を同期（content_script通知用）
   */
  async syncDebugSettings(debugSettings) {
    try {
      console.log('🔧 SettingsRepository: Syncing debug settings to content script')
      
      // Chrome storage.sync経由で通知
      // DebugLoggerがstorage.onChangedリスナーで反応
      await this.storageAdapter.syncSet({ debugSettings })
      
      console.log('🔧 SettingsRepository: Debug settings synced successfully')
      return true
      
    } catch (error) {
      console.error('🚨 SettingsRepository: Failed to sync debug settings:', error)
      throw error
    }
  }

  /**
   * 設定のリセット
   */
  async resetSettings() {
    try {
      console.log('🔧 SettingsRepository: Resetting settings to defaults')
      
      await this.saveSettings(this.defaultSettings)
      
      console.log('🔧 SettingsRepository: Settings reset successfully')
      return true
      
    } catch (error) {
      console.error('🚨 SettingsRepository: Failed to reset settings:', error)
      throw error
    }
  }

  /**
   * 設定の妥当性検証
   */
  validateSettings(settings) {
    if (!settings || typeof settings !== 'object') {
      throw new Error('Settings must be an object')
    }

    // 必須フィールドの検証
    const requiredFields = ['enabled', 'strokeColor', 'strokeWidth', 'gestureThreshold']
    for (const field of requiredFields) {
      if (settings[field] === undefined) {
        throw new Error(`Required field missing: ${field}`)
      }
    }

    // 型の検証
    if (typeof settings.enabled !== 'boolean') {
      throw new Error('enabled must be boolean')
    }
    
    if (typeof settings.strokeColor !== 'string') {
      throw new Error('strokeColor must be string')
    }
    
    if (!Number.isInteger(settings.strokeWidth) || settings.strokeWidth < 1 || settings.strokeWidth > 10) {
      throw new Error('strokeWidth must be integer between 1-10')
    }
    
    if (!Number.isInteger(settings.gestureThreshold) || settings.gestureThreshold < 5 || settings.gestureThreshold > 50) {
      throw new Error('gestureThreshold must be integer between 5-50')
    }

    // 除外リストの検証
    if (settings.excludeList && !Array.isArray(settings.excludeList)) {
      throw new Error('excludeList must be array')
    }

    // デフォルトジェスチャー状態の検証
    if (settings.defaultGestureStates && typeof settings.defaultGestureStates !== 'object') {
      throw new Error('defaultGestureStates must be object')
    }

    // デバッグ設定の検証
    if (settings.debugSettings) {
      const debug = settings.debugSettings
      if (typeof debug !== 'object') {
        throw new Error('debugSettings must be object')
      }
      
      if (debug.enabled !== undefined && typeof debug.enabled !== 'boolean') {
        throw new Error('debugSettings.enabled must be boolean')
      }
      
      if (debug.logLevel !== undefined && (!Number.isInteger(debug.logLevel) || debug.logLevel < 0 || debug.logLevel > 3)) {
        throw new Error('debugSettings.logLevel must be integer between 0-3')
      }
    }

    return true
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsRepository }
}