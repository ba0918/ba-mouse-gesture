/**
 * SettingsServiceImpl
 * ISettingsServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

// SettingsManagementUseCaseはコンストラクタの引数で受け取るためimportは不要

class SettingsServiceImpl {
  /**
   * @param {SettingsManagementUseCase} settingsManagementUseCase
   */
  constructor(settingsManagementUseCase) {
    this.settingsManagementUseCase = settingsManagementUseCase
  }

  /**
   * 現在の設定を取得
   * @returns {Promise<SettingsDTO>}
   */
  async getCurrentSettings() {
    const settings = await this.settingsManagementUseCase.getCurrentSettings()
    
    return {
      enabled: settings.isEnabled(),
      stroke: settings.getStrokeSettings(),
      gestureThreshold: settings.gestureThreshold,
      excludeList: settings.getExcludeList(),
      gestureStates: settings.defaultGestureStates,
      debugSettings: settings.getDebugSettings(),
      version: settings.version,
      lastModified: settings.lastModified
    }
  }

  /**
   * 拡張機能の有効/無効を切り替え
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<SettingsDTO>}
   */
  async toggleExtension(enabled) {
    const updatedSettings = await this.settingsManagementUseCase.toggleExtension(enabled)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 軌跡表示設定を更新
   * @param {string} color - 色（例: '#FF0000'）
   * @param {number} width - 線の太さ（1-10）
   * @returns {Promise<SettingsDTO>}
   */
  async updateStrokeSettings(color, width) {
    const updatedSettings = await this.settingsManagementUseCase.updateStrokeSettings(color, width)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * ジェスチャー検出閾値を更新
   * @param {number} threshold - 閾値（5-100ピクセル）
   * @returns {Promise<SettingsDTO>}
   */
  async updateGestureThreshold(threshold) {
    const updatedSettings = await this.settingsManagementUseCase.updateGestureThreshold(threshold)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<SettingsDTO>}
   */
  async toggleGesture(gestureId, enabled) {
    const updatedSettings = await this.settingsManagementUseCase.toggleGesture(gestureId, enabled)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   * @returns {Promise<SettingsDTO>}
   */
  async addExcludeSite(pattern) {
    const updatedSettings = await this.settingsManagementUseCase.addExcludeSite(pattern)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   * @returns {Promise<SettingsDTO>}
   */
  async removeExcludeSite(pattern) {
    const updatedSettings = await this.settingsManagementUseCase.removeExcludeSite(pattern)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * デバッグ設定を更新
   * @param {Object} debugConfig - デバッグ設定
   * @returns {Promise<SettingsDTO>}
   */
  async updateDebugSettings(debugConfig) {
    const updatedSettings = await this.settingsManagementUseCase.updateDebugSettings(debugConfig)
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 設定をデフォルトにリセット
   * @returns {Promise<SettingsDTO>}
   */
  async resetToDefaults() {
    const updatedSettings = await this.settingsManagementUseCase.resetToDefaults()
    
    return {
      enabled: updatedSettings.isEnabled(),
      stroke: updatedSettings.getStrokeSettings(),
      gestureThreshold: updatedSettings.gestureThreshold,
      excludeList: updatedSettings.getExcludeList(),
      gestureStates: updatedSettings.defaultGestureStates,
      debugSettings: updatedSettings.getDebugSettings(),
      version: updatedSettings.version,
      lastModified: updatedSettings.lastModified
    }
  }

  /**
   * 設定のバックアップを作成
   * @returns {Promise<SettingsBackupDTO>}
   */
  async createSettingsBackup() {
    const backup = await this.settingsManagementUseCase.createSettingsBackup()
    
    return {
      timestamp: backup.timestamp,
      version: backup.version,
      settings: backup.settings
    }
  }

  /**
   * バックアップから設定を復元
   * @param {SettingsBackupDTO} backup - バックアップデータ
   * @returns {Promise<SettingsDTO>}
   */
  async restoreSettingsFromBackup(backup) {
    const restoredSettings = await this.settingsManagementUseCase.restoreSettingsFromBackup(backup)
    
    return {
      enabled: restoredSettings.isEnabled(),
      stroke: restoredSettings.getStrokeSettings(),
      gestureThreshold: restoredSettings.gestureThreshold,
      excludeList: restoredSettings.getExcludeList(),
      gestureStates: restoredSettings.defaultGestureStates,
      debugSettings: restoredSettings.getDebugSettings(),
      version: restoredSettings.version,
      lastModified: restoredSettings.lastModified
    }
  }

  /**
   * 設定の整合性チェック
   * @returns {Promise<SettingsValidationDTO>}
   */
  async validateCurrentSettings() {
    const validation = await this.settingsManagementUseCase.validateCurrentSettings()
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    }
  }

  /**
   * 設定の使用統計を取得
   * @returns {Promise<SettingsUsageStatsDTO>}
   */
  async getSettingsUsageStats() {
    const stats = await this.settingsManagementUseCase.getSettingsUsageStats()
    
    return {
      enabled: stats.enabled,
      enabledGestures: stats.enabledGestures,
      totalGestures: stats.totalGestures,
      excludeListSize: stats.excludeListSize,
      strokeSettings: stats.strokeSettings,
      threshold: stats.threshold,
      debugSettings: stats.debugSettings,
      lastModified: stats.lastModified,
      repositoryStatus: stats.repositoryStatus
    }
  }

  /**
   * 設定変更の監視を開始
   * @param {Function} callback - 変更時のコールバック関数
   * @returns {Function} 監視停止関数
   */
  watchSettingsChanges(callback) {
    return this.settingsManagementUseCase.watchSettingsChanges((change) => {
      // Application層の変更イベントをPresentation層用に変換
      const dto = {
        type: 'settings_changed',
        newSettings: {
          enabled: change.newSettings.isEnabled(),
          stroke: change.newSettings.getStrokeSettings(),
          gestureThreshold: change.newSettings.gestureThreshold,
          excludeList: change.newSettings.getExcludeList(),
          gestureStates: change.newSettings.defaultGestureStates,
          debugSettings: change.newSettings.getDebugSettings(),
          version: change.newSettings.version,
          lastModified: change.newSettings.lastModified
        },
        oldSettings: change.oldSettings ? {
          enabled: change.oldSettings.isEnabled(),
          stroke: change.oldSettings.getStrokeSettings(),
          gestureThreshold: change.oldSettings.gestureThreshold,
          excludeList: change.oldSettings.getExcludeList(),
          gestureStates: change.oldSettings.defaultGestureStates,
          debugSettings: change.oldSettings.getDebugSettings(),
          version: change.oldSettings.version,
          lastModified: change.oldSettings.lastModified
        } : null,
        timestamp: change.timestamp
      }
      
      callback(dto)
    })
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsServiceImpl }
}