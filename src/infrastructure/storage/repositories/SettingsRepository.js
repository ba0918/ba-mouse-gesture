/**
 * SettingsRepository
 * 設定データの永続化を担当するリポジトリ
 */
class SettingsRepository {
  /**
   * @param {ChromeStorage} storage - ストレージインターフェース
   */
  constructor(storage) {
    this.storage = storage
    this.settingsKey = 'appSettings'
    this.cache = new Map()
    this.cacheTimeout = 5000 // 5秒でキャッシュ無効化
  }

  /**
   * 設定を取得
   * @returns {Promise<Settings>}
   */
  async getSettings() {
    // キャッシュチェック
    const cachedData = this.cache.get(this.settingsKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return this.deserializeSettings(cachedData.data)
    }

    try {
      const result = await this.storage.get(this.settingsKey)
      const settingsData = result[this.settingsKey]
      
      if (settingsData) {
        // キャッシュに保存
        this.cache.set(this.settingsKey, {
          data: settingsData,
          timestamp: Date.now()
        })
        
        return this.deserializeSettings(settingsData)
      } else {
        // デフォルト設定を返す
        return this.getDefaultSettings()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * 設定を保存
   * @param {Settings} settings - 設定エンティティ
   * @returns {Promise<void>}
   */
  async saveSettings(settings) {
    try {
      // バリデーション
      if (!settings || typeof settings.isValid !== 'function' || !settings.isValid()) {
        throw new Error('Invalid settings object')
      }

      const serializedData = this.serializeSettings(settings)
      await this.storage.set({ [this.settingsKey]: serializedData })
      
      // キャッシュ更新
      this.cache.set(this.settingsKey, {
        data: serializedData,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new SettingsRepositoryError('Failed to save settings', error)
    }
  }

  /**
   * 特定の設定値を更新
   * @param {string} key - 設定キー
   * @param {*} value - 新しい値
   * @returns {Promise<Settings>}
   */
  async updateSetting(key, value) {
    const settings = await this.getSettings()
    
    // 設定値を更新
    if (key in settings) {
      settings[key] = value
      settings.updateModified()
      await this.saveSettings(settings)
    } else {
      throw new Error(`Setting key '${key}' does not exist`)
    }
    
    return settings
  }

  /**
   * ジェスチャーの有効/無効を更新
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<Settings>}
   */
  async updateGestureState(gestureId, enabled) {
    const settings = await this.getSettings()
    settings.setGestureEnabled(gestureId, enabled)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   * @returns {Promise<Settings>}
   */
  async addExcludeSite(pattern) {
    const settings = await this.getSettings()
    settings.addExcludeSite(pattern)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   * @returns {Promise<Settings>}
   */
  async removeExcludeSite(pattern) {
    const settings = await this.getSettings()
    settings.removeExcludeSite(pattern)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 軌跡設定を更新
   * @param {string} color - 色
   * @param {number} width - 太さ
   * @returns {Promise<Settings>}
   */
  async updateStrokeSettings(color, width) {
    const settings = await this.getSettings()
    settings.setStrokeSettings(color, width)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 閾値を更新
   * @param {number} threshold - 新しい閾値
   * @returns {Promise<Settings>}
   */
  async updateThreshold(threshold) {
    const settings = await this.getSettings()
    settings.setThreshold(threshold)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * デバッグ設定を更新
   * @param {Object} debugConfig - デバッグ設定
   * @returns {Promise<Settings>}
   */
  async updateDebugSettings(debugConfig) {
    const settings = await this.getSettings()
    settings.setDebugSettings(debugConfig)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 設定をデフォルトにリセット
   * @returns {Promise<Settings>}
   */
  async resetToDefaults() {
    const defaultSettings = this.getDefaultSettings()
    await this.saveSettings(defaultSettings)
    return defaultSettings
  }

  /**
   * 設定データのバックアップを作成
   * @returns {Promise<Object>}
   */
  async createBackup() {
    const settings = await this.getSettings()
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: this.serializeSettings(settings)
    }
  }

  /**
   * バックアップから設定を復元
   * @param {Object} backup - バックアップデータ
   * @returns {Promise<Settings>}
   */
  async restoreFromBackup(backup) {
    if (!backup.settings) {
      throw new Error('Invalid backup data')
    }
    
    const settings = this.deserializeSettings(backup.settings)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 設定変更を監視
   * @param {Function} callback - 変更時コールバック
   * @returns {Function} リスナー削除関数
   */
  onSettingsChanged(callback) {
    return this.storage.onChanged((changes, namespace) => {
      if (namespace === 'sync' && changes[this.settingsKey]) {
        // キャッシュを無効化
        this.cache.delete(this.settingsKey)
        
        const newSettings = this.deserializeSettings(changes[this.settingsKey].newValue)
        const oldSettings = changes[this.settingsKey].oldValue ? 
          this.deserializeSettings(changes[this.settingsKey].oldValue) : null
        
        callback(newSettings, oldSettings)
      }
    }, 'sync')
  }

  /**
   * 設定データをシリアライズ
   * @param {Settings} settings
   * @returns {Object}
   */
  serializeSettings(settings) {
    return settings.toJSON()
  }

  /**
   * 設定データをデシリアライズ
   * @param {Object} data
   * @returns {Settings}
   */
  deserializeSettings(data) {
    // Settings クラスのインポートが必要
    // 依存関係注入パターンで解決
    const { Settings } = require('../../../domain/entities/Settings')
    return Settings.fromJSON(data)
  }

  /**
   * デフォルト設定を取得
   * @returns {Settings}
   */
  getDefaultSettings() {
    const { Settings } = require('../../../domain/entities/Settings')
    return Settings.getDefaults()
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * リポジトリの状態確認
   * @returns {Promise<Object>}
   */
  async getRepositoryStatus() {
    try {
      const settings = await this.getSettings()
      const storageStats = await this.storage.getUsageStats()
      
      return {
        isHealthy: true,
        settingsLoaded: Boolean(settings),
        cacheSize: this.cache.size,
        storage: storageStats.sync || {},
        lastModified: settings ? settings.lastModified : null
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        cacheSize: this.cache.size
      }
    }
  }

  /**
   * 設定の整合性チェック
   * @returns {Promise<Object>}
   */
  async validateSettings() {
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    }
    
    try {
      const settings = await this.getSettings()
      
      // 基本バリデーション
      if (!settings.isValid()) {
        validation.isValid = false
        validation.errors.push('Settings object is invalid')
      }
      
      // 閾値範囲チェック
      if (settings.gestureThreshold < 5 || settings.gestureThreshold > 100) {
        validation.warnings.push('Gesture threshold is outside recommended range (5-100)')
      }
      
      // 除外リストチェック
      const excludeList = settings.getExcludeList()
      if (excludeList.length > 20) {
        validation.warnings.push('Exclude list is very long (>20 items)')
      }
      
      // 色設定チェック
      if (!settings.isValidColor(settings.strokeColor)) {
        validation.errors.push('Invalid stroke color format')
        validation.isValid = false
      }
      
    } catch (error) {
      validation.isValid = false
      validation.errors.push(`Validation error: ${error.message}`)
    }
    
    return validation
  }
}

/**
 * SettingsRepository専用エラークラス
 */
class SettingsRepositoryError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'SettingsRepositoryError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsRepository, SettingsRepositoryError }
}