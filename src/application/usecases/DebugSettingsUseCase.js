/**
 * デバッグ設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 */

const DebugSettingsEntity = require('../../domain/entities/DebugSettingsEntity')

class DebugSettingsUseCase {
  constructor(settingsRepository) {
    this.settingsRepository = settingsRepository
  }

  /**
   * デバッグ設定を取得
   */
  async getDebugSettings() {
    try {
      console.log('🔧 DebugSettingsUseCase: Loading debug settings')
      
      const settings = await this.settingsRepository.getSettings()
      const debugSettings = settings.debugSettings || {}
      
      const entity = DebugSettingsEntity.fromPlainObject(debugSettings)
      entity.validate()
      
      console.log('🔧 DebugSettingsUseCase: Loaded debug settings:', entity.toPlainObject())
      return entity
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to load debug settings:', error)
      // フォールバックとしてデフォルト設定を返す
      return DebugSettingsEntity.getDefault()
    }
  }

  /**
   * デバッグ設定を保存
   */
  async saveDebugSettings(debugSettings) {
    try {
      console.log('🔧 DebugSettingsUseCase: Saving debug settings:', debugSettings.toPlainObject())
      
      // エンティティの妥当性検証
      debugSettings.validate()
      
      // 現在の設定を取得（デフォルト設定を含む完全な設定オブジェクト）
      const currentSettings = await this.settingsRepository.getSettings()
      
      // デバッグ設定のみを更新（既存の設定構造を保持）
      currentSettings.debugSettings = {
        ...currentSettings.debugSettings,
        ...debugSettings.toPlainObject()
      }
      
      console.log('🔧 DebugSettingsUseCase: Prepared settings for validation:', {
        hasEnabled: currentSettings.enabled !== undefined,
        hasStrokeColor: currentSettings.strokeColor !== undefined,
        hasStrokeWidth: currentSettings.strokeWidth !== undefined,
        hasGestureThreshold: currentSettings.gestureThreshold !== undefined,
        debugSettings: currentSettings.debugSettings
      })
      
      // 永続化（SettingsRepositoryのvalidateSettingsが実行される）
      await this.settingsRepository.saveSettings(currentSettings)
      
      // content_scriptに同期通知
      await this.syncDebugSettingsToContentScript(debugSettings)
      
      console.log('🔧 DebugSettingsUseCase: Debug settings saved successfully')
      return true
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to save debug settings:', error)
      console.error('🚨 DebugSettingsUseCase: Error details:', {
        message: error.message,
        stack: error.stack
      })
      throw new Error(`Failed to save debug settings: ${error.message}`)
    }
  }

  /**
   * デバッグモードの有効/無効を切り替え
   */
  async toggleDebugEnabled() {
    try {
      const debugSettings = await this.getDebugSettings()
      const newState = debugSettings.toggleEnabled()
      
      await this.saveDebugSettings(debugSettings)
      
      console.log('🔧 DebugSettingsUseCase: Debug enabled toggled:', newState)
      return newState
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to toggle debug enabled:', error)
      throw error
    }
  }

  /**
   * デバッグ画面表示の有効/無効を切り替え
   */
  async toggleShowStatus() {
    try {
      const debugSettings = await this.getDebugSettings()
      const newState = debugSettings.toggleShowStatus()
      
      await this.saveDebugSettings(debugSettings)
      
      console.log('🔧 DebugSettingsUseCase: Show status toggled:', newState)
      return newState
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to toggle show status:', error)
      throw error
    }
  }

  /**
   * ログレベルを更新
   */
  async updateLogLevel(level) {
    try {
      const debugSettings = await this.getDebugSettings()
      debugSettings.setLogLevel(level)
      
      await this.saveDebugSettings(debugSettings)
      
      console.log('🔧 DebugSettingsUseCase: Log level updated:', level)
      return true
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to update log level:', error)
      throw error
    }
  }

  /**
   * 表示位置を更新
   */
  async updateStatusPosition(position) {
    try {
      const debugSettings = await this.getDebugSettings()
      debugSettings.setStatusPosition(position)
      
      await this.saveDebugSettings(debugSettings)
      
      console.log('🔧 DebugSettingsUseCase: Status position updated:', position)
      return true
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to update status position:', error)
      throw error
    }
  }

  /**
   * content_scriptにデバッグ設定を同期
   * 🔧 重要: popup設定とcontent_script表示の同期問題を解決
   */
  async syncDebugSettingsToContentScript(debugSettings) {
    try {
      console.log('🔧 DebugSettingsUseCase: Syncing to content script:', debugSettings.toPlainObject())
      
      // Chrome storage.sync経由でcontent_scriptに通知
      // DebugLoggerがstorage.onChangedリスナーで反応する
      await this.settingsRepository.syncDebugSettings(debugSettings.toPlainObject())
      
      console.log('🔧 DebugSettingsUseCase: Sync to content script completed')
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to sync to content script:', error)
      // 同期失敗はエラーを投げずに警告のみ
      console.warn('⚠️ Debug settings sync failed, but settings were saved locally')
    }
  }

  /**
   * デバッグ設定を初期化（初回起動時）
   */
  async initializeDebugSettings() {
    try {
      console.log('🔧 DebugSettingsUseCase: Initializing debug settings')
      
      const existingSettings = await this.getDebugSettings()
      
      // 既に設定が存在する場合はそのまま使用
      if (existingSettings && Object.keys(existingSettings.toPlainObject()).length > 0) {
        console.log('🔧 DebugSettingsUseCase: Using existing debug settings')
        return existingSettings
      }
      
      // デフォルト設定を保存
      const defaultSettings = DebugSettingsEntity.getDefault()
      await this.saveDebugSettings(defaultSettings)
      
      console.log('🔧 DebugSettingsUseCase: Debug settings initialized with defaults')
      return defaultSettings
      
    } catch (error) {
      console.error('🚨 DebugSettingsUseCase: Failed to initialize debug settings:', error)
      throw error
    }
  }
}

module.exports = DebugSettingsUseCase