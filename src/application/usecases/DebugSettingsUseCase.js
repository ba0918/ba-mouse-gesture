/**
 * デバッグ設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 修正：統一されたストレージアクセスでpopup-content script同期問題を解決
 */

const DebugSettingsEntity = require('../../domain/entities/DebugSettingsEntity')
const DebugStorageAdapter = require('../../infrastructure/adapters/DebugStorageAdapter')

class DebugSettingsUseCase {
  constructor() {
    // 統一されたストレージアダプターを使用
    this.storageAdapter = new DebugStorageAdapter()
    
    // 同期リスナーの状態管理
    this.isListenerStarted = false
    this.syncCallbacks = new Set()
  }

  /**
   * デバッグ設定を取得（popup/content script共通）
   */
  async getDebugSettings() {
    try {
      console.log('🔧 DebugSettingsUseCase: Loading debug settings from unified storage')
      
      // 統一されたストレージから設定を読み込み
      const settingsData = await this.storageAdapter.loadSettings()
      const entity = DebugSettingsEntity.fromPlainObject(settingsData)
      
      console.log('✅ DebugSettingsUseCase: Loaded debug settings:', entity.getSyncInfo())
      return entity
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to load debug settings:', error)
      // フォールバックとしてデフォルト設定を返す
      return DebugSettingsEntity.getDefault()
    }
  }

  /**
   * デバッグ設定を保存（popup/content script共通）
   */
  async saveDebugSettings(debugSettings) {
    try {
      console.log('🔧 DebugSettingsUseCase: Saving debug settings to unified storage')
      
      // エンティティの妥当性検証
      if (!(debugSettings instanceof DebugSettingsEntity)) {
        debugSettings = DebugSettingsEntity.fromPlainObject(debugSettings)
      }
      debugSettings.validate()
      
      // 統一されたストレージに保存（popup/content script両方で同期）
      const savedSettings = await this.storageAdapter.saveSettings(debugSettings.toStorageFormat())
      
      console.log('✅ DebugSettingsUseCase: Debug settings saved successfully:', savedSettings)
      
      // 設定変更通知（コールバック実行）
      this.notifySettingsChanged(debugSettings)
      
      return DebugSettingsEntity.fromPlainObject(savedSettings)
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to save debug settings:', error)
      throw new Error(`Failed to save debug settings: ${error.message}`)
    }
  }

  /**
   * デバッグ設定の変更監視を開始（popup/content script共通）
   */
  startSyncListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback function is required')
    }
    
    // コールバックを登録
    this.syncCallbacks.add(callback)
    
    // 初回のみストレージリスナーを開始
    if (!this.isListenerStarted) {
      this.storageAdapter.startChangeListener((newSettings, oldSettings) => {
        console.log('🔧 DebugSettingsUseCase: Settings change detected:', {
          old: oldSettings,
          new: newSettings
        })
        
        try {
          const newEntity = DebugSettingsEntity.fromPlainObject(newSettings)
          const oldEntity = oldSettings ? DebugSettingsEntity.fromPlainObject(oldSettings) : null
          
          // 全ての登録されたコールバックを実行
          this.syncCallbacks.forEach(cb => {
            try {
              cb(newEntity, oldEntity)
            } catch (error) {
              console.error('❌ DebugSettingsUseCase: Callback failed:', error)
            }
          })
          
        } catch (error) {
          console.error('❌ DebugSettingsUseCase: Failed to process settings change:', error)
        }
      })
      
      this.isListenerStarted = true
      console.log('✅ DebugSettingsUseCase: Sync listener started')
    }
  }

  /**
   * デバッグ設定の変更監視を停止
   */
  stopSyncListener(callback) {
    if (callback) {
      this.syncCallbacks.delete(callback)
    } else {
      this.syncCallbacks.clear()
    }
    
    // 全てのコールバックが削除された場合はストレージリスナーも停止
    if (this.syncCallbacks.size === 0) {
      this.storageAdapter.stopChangeListener()
      this.isListenerStarted = false
      console.log('✅ DebugSettingsUseCase: Sync listener stopped')
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
      console.error('❌ DebugSettingsUseCase: Failed to toggle debug enabled:', error)
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
      console.error('❌ DebugSettingsUseCase: Failed to toggle show status:', error)
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
      console.error('❌ DebugSettingsUseCase: Failed to update log level:', error)
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
      console.error('❌ DebugSettingsUseCase: Failed to update status position:', error)
      throw error
    }
  }

  /**
   * 複数の設定を一括更新
   */
  async updateMultipleSettings(newSettings) {
    try {
      const currentSettings = await this.getDebugSettings()
      const updatedSettings = currentSettings.updateSettings(newSettings)
      
      await this.saveDebugSettings(updatedSettings)
      
      console.log('🔧 DebugSettingsUseCase: Multiple settings updated:', newSettings)
      return updatedSettings
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to update multiple settings:', error)
      throw error
    }
  }

  /**
   * 🎯 新機能：popup-content script間の同期状態を確認
   */
  async validateSyncConsistency() {
    try {
      const currentState = await this.storageAdapter.getCurrentState()
      
      if (!currentState) {
        return {
          isConsistent: false,
          error: 'Failed to get current state'
        }
      }
      
      return {
        isConsistent: true,
        storageType: currentState.storageType,
        settings: currentState.settings,
        timestamp: currentState.timestamp,
        listenerCount: currentState.listenerCount
      }
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to validate sync consistency:', error)
      return {
        isConsistent: false,
        error: error.message
      }
    }
  }

  /**
   * 🎯 新機能：旧形式データの確認と移行
   */
  async checkAndMigrateLegacyData() {
    try {
      const legacyCheck = await this.storageAdapter.checkLegacyData()
      
      if (legacyCheck.hasLegacyData) {
        console.warn('⚠️ DebugSettingsUseCase: Legacy local storage data detected')
        
        // 現在の設定と旧データを比較
        const currentSettings = await this.getDebugSettings()
        const legacyEntity = DebugSettingsEntity.fromPlainObject(legacyCheck.legacyData)
        
        const consistencyCheck = currentSettings.validateSyncConsistency(legacyEntity)
        
        if (!consistencyCheck.isConsistent) {
          console.warn('⚠️ DebugSettingsUseCase: Inconsistency detected, cleaning up legacy data')
          await this.storageAdapter.cleanupLegacyData()
        }
        
        return {
          hadLegacyData: true,
          wasInconsistent: !consistencyCheck.isConsistent,
          cleanedUp: !consistencyCheck.isConsistent
        }
      }
      
      return { hadLegacyData: false }
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to check/migrate legacy data:', error)
      return { hadLegacyData: false, error: error.message }
    }
  }

  /**
   * デバッグ設定を初期化（初回起動時）
   */
  async initializeDebugSettings() {
    try {
      console.log('🔧 DebugSettingsUseCase: Initializing debug settings')
      
      // 旧データの確認と移行
      await this.checkAndMigrateLegacyData()
      
      const existingSettings = await this.getDebugSettings()
      
      // 既に設定が存在する場合はそのまま使用
      if (existingSettings && existingSettings.enabled !== undefined) {
        console.log('✅ DebugSettingsUseCase: Using existing debug settings')
        return existingSettings
      }
      
      // デフォルト設定を保存
      const defaultSettings = DebugSettingsEntity.getDefault()
      const savedSettings = await this.saveDebugSettings(defaultSettings)
      
      console.log('✅ DebugSettingsUseCase: Debug settings initialized with defaults')
      return savedSettings
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to initialize debug settings:', error)
      throw error
    }
  }

  /**
   * 設定変更通知（内部用）
   */
  notifySettingsChanged(newSettings) {
    console.log('🔧 DebugSettingsUseCase: Notifying settings change:', newSettings.getSyncInfo())
  }

  /**
   * デバッグ情報の取得（診断用）
   */
  async getDebugInfo() {
    try {
      const settings = await this.getDebugSettings()
      const storageState = await this.storageAdapter.getCurrentState()
      
      return {
        useCase: 'DebugSettingsUseCase',
        settings: settings.getSyncInfo(),
        storage: storageState,
        listeners: {
          syncCallbacks: this.syncCallbacks.size,
          isListenerStarted: this.isListenerStarted
        },
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to get debug info:', error)
      return {
        useCase: 'DebugSettingsUseCase',
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }
}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugSettingsUseCase = DebugSettingsUseCase
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DebugSettingsUseCase
}