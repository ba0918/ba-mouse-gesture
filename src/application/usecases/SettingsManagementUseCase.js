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
      console.log('🔧 [Debug] SettingsManagementUseCase.updateDebugSettings called:', {
        debugConfig: debugConfig,
        logLevel: debugConfig.logLevel,
        logLevelType: typeof debugConfig.logLevel
      })
      
      // デバッグ設定の検証
      this.validateDebugSettings(debugConfig)
      
      const result = await this.settingsRepository.updateDebugSettings(debugConfig)
      
      console.log('🔧 [Debug] SettingsRepository.updateDebugSettings result:', {
        resultDebugSettings: result.debugSettings,
        logLevel: result.debugSettings?.logLevel
      })
      
      // 設定変更通知
      await this.notifySettingsChange('debug_settings_updated', debugConfig)
      
      return result
    } catch (error) {
      console.error('❌ SettingsManagementUseCase.updateDebugSettings error:', error)
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
      // Infrastructure層のChromeMessagingを使用（Clean Architecture準拠）
      if (this.messagingAdapter) {
        await this.messagingAdapter.sendMessage({
          type: 'settings_changed',
          changeType: type,
          data: data,
          timestamp: new Date().toISOString()
        }, { expectResponse: false }).catch(error => {
          // エラーは無視（リスナーがない場合は正常）
          console.log('Settings change notification failed:', error)
        })
      }
    } catch (error) {
      console.error('Failed to notify settings change:', error)
    }
  }

  // ========================================
  // 旧SettingsUseCase互換メソッド（統合後）
  // ========================================

  /**
   * 設定を取得（旧SettingsUseCaseインターフェース互換）
   * @returns {Promise<Object>}
   */
  async getSettings() {
    try {
      const settings = await this.getCurrentSettings()
      const settingsJSON = settings.toJSON()
      
      console.log('🔧 [Debug] SettingsManagementUseCase.getSettings result:', {
        settingsEntity: settings,
        settingsJSON: settingsJSON,
        debugSettings: settingsJSON.debugSettings,
        debugLogLevel: settingsJSON.debugSettings?.logLevel,
        debugLogLevelType: typeof settingsJSON.debugSettings?.logLevel
      })
      
      return settingsJSON
    } catch (error) {
      console.error('❌ SettingsManagementUseCase: Failed to load settings:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * 設定を保存（旧SettingsUseCaseインターフェース互換）
   * @param {Object} settings - 設定オブジェクト
   * @returns {Promise<Object>}
   */
  async saveSettings(settings) {
    try {
      // 設定の各フィールドをそれぞれ更新
      if (settings.enabled !== undefined) {
        await this.toggleExtension(settings.enabled)
      }
      
      if (settings.strokeColor !== undefined || settings.strokeWidth !== undefined) {
        const currentSettings = await this.getCurrentSettings()
        const color = settings.strokeColor || currentSettings.strokeColor
        const width = settings.strokeWidth || currentSettings.strokeWidth
        await this.updateStrokeSettings(color, width)
      }
      
      if (settings.gestureThreshold !== undefined) {
        await this.updateGestureThreshold(settings.gestureThreshold)
      }
      
      if (settings.excludeList !== undefined) {
        // 現在の除外リストをクリアして新しいものを設定
        const currentSettings = await this.getCurrentSettings()
        const currentList = currentSettings.getExcludeList()
        
        // 既存のアイテムを削除
        for (const item of currentList) {
          await this.removeExcludeSite(item)
        }
        
        // 新しいアイテムを追加
        for (const item of settings.excludeList) {
          await this.addExcludeSite(item)
        }
      }
      
      if (settings.defaultGestureStates !== undefined) {
        // 各ジェスチャーの状態を更新
        for (const [gestureId, enabled] of Object.entries(settings.defaultGestureStates)) {
          await this.toggleGesture(gestureId, enabled)
        }
      }
      
      console.log('✅ SettingsManagementUseCase: Settings saved successfully')
      
      // バックグラウンドスクリプトに設定変更を通知（Infrastructure層経由）
      if (this.messagingAdapter) {
        try {
          await this.messagingAdapter.sendMessage({
            type: 'SETTINGS_UPDATED',
            settings: settings
          }, { expectResponse: false })
        } catch (error) {
          // メッセージング失敗は無視（リスナーがない場合は正常）
          console.log('Settings update notification failed:', error)
        }
      }
      
      // 更新後の設定を返す
      const updatedSettings = await this.getCurrentSettings()
      return updatedSettings.toJSON()
      
    } catch (error) {
      console.error('❌ SettingsManagementUseCase: Failed to save settings:', error)
      throw error
    }
  }

  /**
   * デフォルト設定を取得（旧SettingsUseCaseインターフェース互換）
   * @returns {Object}
   */
  getDefaultSettings() {
    return {
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
   * Chrome Storage APIの統一インターフェース（旧SettingsUseCaseインターフェース互換）
   * Repository経由でアクセス（Clean Architecture準拠）
   * @param {Array|string} keys
   * @returns {Promise<Object>}
   */
  async chromeStorageGet(keys) {
    try {
      if (this.settingsRepository && this.settingsRepository.storageAdapter) {
        return await this.settingsRepository.storageAdapter.get(keys)
      } else {
        throw new Error('Storage adapter is not available')
      }
    } catch (error) {
      console.error('chromeStorageGet failed:', error)
      throw error
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース（旧SettingsUseCaseインターフェース互換）
   * Repository経由でアクセス（Clean Architecture準拠）
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async chromeStorageSet(data) {
    try {
      if (this.settingsRepository && this.settingsRepository.storageAdapter) {
        return await this.settingsRepository.storageAdapter.set(data)
      } else {
        throw new Error('Storage adapter is not available')
      }
    } catch (error) {
      console.error('chromeStorageSet failed:', error)
      throw error
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

// モジュールとして使用可能にする（window登録）
if (typeof window !== 'undefined') {
  window.SettingsUseCase = window.SettingsUseCase || SettingsManagementUseCase
  window.SettingsManagementUseCase = window.SettingsManagementUseCase || SettingsManagementUseCase
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsManagementUseCase, SettingsManagementError }
}