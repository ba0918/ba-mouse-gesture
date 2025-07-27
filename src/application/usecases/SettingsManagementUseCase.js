/**
 * SettingsManagementUseCase
 * 設定管理のビジネスロジックを統合するUseCaseクラス
 */

// 依存関係のインポート
let Settings
if (typeof require !== 'undefined') {
  ({ Settings } = require('../../domain/entities/Settings'))
}

class SettingsManagementUseCase {
  /**
   * @param {SettingsRepository} settingsRepository
   */
  constructor(settingsRepository) {
    this.settingsRepository = settingsRepository
  }

  /**
   * 現在の設定を取得
   * @returns {Promise<Settings>}
   */
  async getCurrentSettings() {
    try {
      return await this.settingsRepository.getSettings()
    } catch (error) {
      throw new SettingsManagementError('Failed to get current settings', error)
    }
  }

  /**
   * 機能の有効/無効を切り替え
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<Settings>}
   */
  async toggleExtension(enabled) {
    try {
      const result = await this.settingsRepository.updateSetting('enabled', enabled)
      
      // 設定変更通知（必要に応じて）
      await this.notifySettingsChange('extension_toggled', { enabled })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to toggle extension', error)
    }
  }

  /**
   * 軌跡表示設定を更新
   * @param {string} color - 色（例: '#FF0000'）
   * @param {number} width - 線の太さ（1-10）
   * @returns {Promise<Settings>}
   */
  async updateStrokeSettings(color, width) {
    try {
      // 入力値の検証
      this.validateStrokeSettings(color, width)
      
      const result = await this.settingsRepository.updateStrokeSettings(color, width)
      
      // 設定変更通知
      await this.notifySettingsChange('stroke_settings_updated', { color, width })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to update stroke settings', error)
    }
  }

  /**
   * ジェスチャー検出閾値を更新
   * @param {number} threshold - 閾値（5-100ピクセル）
   * @returns {Promise<Settings>}
   */
  async updateGestureThreshold(threshold) {
    try {
      // 入力値の検証
      this.validateThreshold(threshold)
      
      const result = await this.settingsRepository.updateThreshold(threshold)
      
      // 設定変更通知
      await this.notifySettingsChange('threshold_updated', { threshold })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to update gesture threshold', error)
    }
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<Settings>}
   */
  async toggleGesture(gestureId, enabled) {
    try {
      // ジェスチャーIDの検証
      this.validateGestureId(gestureId)
      
      const result = await this.settingsRepository.updateGestureState(gestureId, enabled)
      
      // 設定変更通知
      await this.notifySettingsChange('gesture_toggled', { gestureId, enabled })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to toggle gesture', error)
    }
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   * @returns {Promise<Settings>}
   */
  async addExcludeSite(pattern) {
    try {
      // パターンの検証
      this.validateUrlPattern(pattern)
      
      const result = await this.settingsRepository.addExcludeSite(pattern)
      
      // 設定変更通知
      await this.notifySettingsChange('exclude_site_added', { pattern })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to add exclude site', error)
    }
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   * @returns {Promise<Settings>}
   */
  async removeExcludeSite(pattern) {
    try {
      const result = await this.settingsRepository.removeExcludeSite(pattern)
      
      // 設定変更通知
      await this.notifySettingsChange('exclude_site_removed', { pattern })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to remove exclude site', error)
    }
  }

  /**
   * デバッグ設定を更新
   * @param {Object} debugConfig - デバッグ設定
   * @returns {Promise<Settings>}
   */
  async updateDebugSettings(debugConfig) {
    try {
      // デバッグ設定の検証
      this.validateDebugSettings(debugConfig)
      
      const result = await this.settingsRepository.updateDebugSettings(debugConfig)
      
      // 設定変更通知
      await this.notifySettingsChange('debug_settings_updated', debugConfig)
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to update debug settings', error)
    }
  }

  /**
   * 設定をデフォルトにリセット
   * @returns {Promise<Settings>}
   */
  async resetToDefaults() {
    try {
      const result = await this.settingsRepository.resetToDefaults()
      
      // 設定変更通知
      await this.notifySettingsChange('settings_reset', {})
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to reset settings to defaults', error)
    }
  }

  /**
   * 設定のバックアップを作成
   * @returns {Promise<Object>}
   */
  async createSettingsBackup() {
    try {
      return await this.settingsRepository.createBackup()
    } catch (error) {
      throw new SettingsManagementError('Failed to create settings backup', error)
    }
  }

  /**
   * バックアップから設定を復元
   * @param {Object} backup - バックアップデータ
   * @returns {Promise<Settings>}
   */
  async restoreSettingsFromBackup(backup) {
    try {
      // バックアップデータの検証
      this.validateBackupData(backup)
      
      const result = await this.settingsRepository.restoreFromBackup(backup)
      
      // 設定変更通知
      await this.notifySettingsChange('settings_restored', { timestamp: backup.timestamp })
      
      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to restore settings from backup', error)
    }
  }

  /**
   * 設定の整合性チェック
   * @returns {Promise<Object>}
   */
  async validateCurrentSettings() {
    try {
      return await this.settingsRepository.validateSettings()
    } catch (error) {
      throw new SettingsManagementError('Failed to validate settings', error)
    }
  }

  /**
   * 設定の使用統計を取得
   * @returns {Promise<Object>}
   */
  async getSettingsUsageStats() {
    try {
      const settings = await this.settingsRepository.getSettings()
      const repoStatus = await this.settingsRepository.getRepositoryStatus()
      
      return {
        enabled: settings.isEnabled(),
        enabledGestures: this.countEnabledGestures(settings),
        totalGestures: Object.keys(settings.defaultGestureStates).length,
        excludeListSize: settings.getExcludeList().length,
        strokeSettings: settings.getStrokeSettings(),
        threshold: settings.gestureThreshold,
        debugSettings: settings.getDebugSettings(),
        lastModified: settings.lastModified,
        repositoryStatus: repoStatus
      }
    } catch (error) {
      throw new SettingsManagementError('Failed to get settings usage stats', error)
    }
  }

  /**
   * 設定変更の監視を開始
   * @param {Function} callback - 変更時のコールバック関数
   * @returns {Function} 監視停止関数
   */
  watchSettingsChanges(callback) {
    try {
      return this.settingsRepository.onSettingsChanged((newSettings, oldSettings) => {
        callback({
          type: 'settings_changed',
          newSettings: newSettings.toJSON(),
          oldSettings: oldSettings ? oldSettings.toJSON() : null,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to watch settings changes:', error)
      return () => {} // 空の停止関数を返す
    }
  }

  /**
   * 軌跡設定の検証
   * @param {string} color
   * @param {number} width
   */
  validateStrokeSettings(color, width) {
    if (!Settings.prototype.isValidColor(color)) {
      throw new Error('Invalid color format. Expected hex color like #FF0000')
    }
    if (!Settings.prototype.isValidWidth(width)) {
      throw new Error('Invalid width. Expected integer between 1 and 10')
    }
  }

  /**
   * 閾値の検証
   * @param {number} threshold
   */
  validateThreshold(threshold) {
    if (!Number.isInteger(threshold) || threshold < 5 || threshold > 100) {
      throw new Error('Invalid threshold. Expected integer between 5 and 100')
    }
  }

  /**
   * ジェスチャーIDの検証
   * @param {string} gestureId
   */
  validateGestureId(gestureId) {
    const validGestureIds = [
      'left', 'right', 'up', 'down',
      'downright', 'upright', 'rightdown', 'updown',
      'super_refresh', 'prev_tab', 'next_tab'
    ]
    
    if (!validGestureIds.includes(gestureId)) {
      throw new Error(`Invalid gesture ID: ${gestureId}`)
    }
  }

  /**
   * URLパターンの検証
   * @param {string} pattern
   */
  validateUrlPattern(pattern) {
    if (!pattern || typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new Error('Invalid URL pattern. Pattern cannot be empty')
    }
    
    // 基本的な形式チェック
    if (pattern.length > 200) {
      throw new Error('URL pattern too long. Maximum 200 characters')
    }
  }

  /**
   * デバッグ設定の検証
   * @param {Object} debugConfig
   */
  validateDebugSettings(debugConfig) {
    if (!debugConfig || typeof debugConfig !== 'object') {
      throw new Error('Invalid debug config. Expected object')
    }
    
    const validLogLevels = [0, 1, 2, 3]
    if (debugConfig.logLevel !== undefined && !validLogLevels.includes(debugConfig.logLevel)) {
      throw new Error('Invalid log level. Expected 0-3')
    }
    
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    if (debugConfig.statusPosition && !validPositions.includes(debugConfig.statusPosition)) {
      throw new Error('Invalid status position')
    }
  }

  /**
   * バックアップデータの検証
   * @param {Object} backup
   */
  validateBackupData(backup) {
    if (!backup || !backup.settings) {
      throw new Error('Invalid backup data. Missing settings')
    }
    
    if (!backup.timestamp || !backup.version) {
      throw new Error('Invalid backup data. Missing metadata')
    }
  }

  /**
   * 有効なジェスチャー数をカウント
   * @param {Settings} settings
   * @returns {number}
   */
  countEnabledGestures(settings) {
    return Object.values(settings.defaultGestureStates).filter(Boolean).length
  }

  /**
   * 設定変更通知
   * @param {string} type - 変更タイプ
   * @param {Object} data - 変更データ
   * @returns {Promise<void>}
   */
  async notifySettingsChange(type, data) {
    try {
      // Chrome runtime メッセージによる通知（必要に応じて）
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'settings_changed',
          changeType: type,
          data: data,
          timestamp: new Date().toISOString()
        }).catch(error => {
          // エラーは無視（リスナーがない場合は正常）
          console.debug('Settings change notification failed:', error)
        })
      }
    } catch (error) {
      console.error('Failed to notify settings change:', error)
    }
  }
}

/**
 * 設定管理専用エラークラス
 */
class SettingsManagementError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'SettingsManagementError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManagementUseCase, SettingsManagementError }
}