/**
 * デバッグ設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 修正：統一されたストレージアクセスでpopup-content script同期問題を解決
 */

// ブラウザ環境では window オブジェクトから取得
// テスト環境での安全性を考慮して存在チェックを追加
const DebugSettingsEntity = (typeof window !== 'undefined' && window.DebugSettingsEntity) || 
  (typeof require !== 'undefined' ? require('../../domain/entities/DebugSettingsEntity').DebugSettingsEntity : null)
const DebugStorageAdapter = (typeof window !== 'undefined' && window.DebugStorageAdapter) || 
  (typeof require !== 'undefined' ? require('../../infrastructure/adapters/DebugStorageAdapter').DebugStorageAdapter : null)

class DebugSettingsUseCase {
  constructor(settingsRepository = null, logger = null) {
    // 引数が与えられた場合は互換性モード、そうでなければ独自実装
    if (settingsRepository) {
      this.settingsRepository = settingsRepository
      this.storageAdapter = null
    } else {
      // 統一されたストレージアダプターを使用
      if (!DebugStorageAdapter) {
        throw new Error('DebugStorageAdapter is not available')
      }
      this.storageAdapter = new DebugStorageAdapter(logger)
    }
    
    // 同期リスナーの状態管理
    this.isListenerStarted = false
    this.syncCallbacks = new Set()
    this.logger = logger // DebugLoggerインスタンス
  }
  
  /**
   * DebugLoggerを設定
   */
  setLogger(logger) {
    this.logger = logger
    if (this.storageAdapter) {
      this.storageAdapter.setLogger(logger)
    }
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
    } else if (DebugSettingsEntity && DebugSettingsEntity.shouldLogStatic(level)) {
      // DebugLogger未初期化時は静的ログ制御を使用
      switch(level) {
      case 0: console.error(`❌ ${message}`, ...args); break
      case 1: console.warn(`⚠️ ${message}`, ...args); break
      case 2: console.log(`🔧 ${message}`, ...args); break
      case 3: console.log(`🐛 ${message}`, ...args); break
      }
    }
    // レベルが許可されていない場合は何も出力しない
  }

  /**
   * デバッグ設定を取得（popup/content script共通）
   */
  async getDebugSettings() {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Loading debug settings from unified storage')
      
      // 統一されたストレージから設定を読み込み
      const settingsData = await this.storageAdapter.loadSettings()
      const entity = DebugSettingsEntity.fromPlainObject(settingsData)
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Loaded debug settings:', entity.getSyncInfo())
      return entity
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to load debug settings:', error)
      // フォールバックとしてデフォルト設定を返す
      return DebugSettingsEntity.getDefault()
    }
  }

  /**
   * デバッグが有効かチェック
   */
  async isDebugEnabled() {
    try {
      const debugSettings = await this.getDebugSettings()
      return debugSettings.enabled
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to check if debug enabled:', error)
      return false
    }
  }

  /**
   * デバッグ設定を保存（popup/content script共通）
   */
  async saveDebugSettings(debugSettings) {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Saving debug settings to unified storage')
      
      // エンティティの妥当性検証
      if (!(debugSettings instanceof DebugSettingsEntity)) {
        debugSettings = DebugSettingsEntity.fromPlainObject(debugSettings)
      }
      debugSettings.validate()
      
      // 統一されたストレージに保存（popup/content script両方で同期）
      const savedSettings = await this.storageAdapter.saveSettings(debugSettings.toStorageFormat())
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug settings saved successfully:', savedSettings)
      
      // 設定変更通知（コールバック実行）
      this.notifySettingsChanged(debugSettings)
      
      return DebugSettingsEntity.fromPlainObject(savedSettings)
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to save debug settings:', error)
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
        this.logWithLevel(2, 'DebugSettingsUseCase: Settings change detected:', {
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
              this.logWithLevel(0, 'DebugSettingsUseCase: Callback failed:', error)
            }
          })
          
        } catch (error) {
          this.logWithLevel(0, 'DebugSettingsUseCase: Failed to process settings change:', error)
        }
      })
      
      this.isListenerStarted = true
      this.logWithLevel(2, 'DebugSettingsUseCase: Sync listener started')
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
      this.logWithLevel(2, 'DebugSettingsUseCase: Sync listener stopped')
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug enabled toggled:', newState)
      return newState
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to toggle debug enabled:', error)
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Show status toggled:', newState)
      return newState
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to toggle show status:', error)
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Log level updated:', level)
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update log level:', error)
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Status position updated:', position)
      return true
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update status position:', error)
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Multiple settings updated:', newSettings)
      return updatedSettings
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update multiple settings:', error)
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
        this.logWithLevel(1, 'DebugSettingsUseCase: Legacy local storage data detected')
        
        // 現在の設定と旧データを比較
        const currentSettings = await this.getDebugSettings()
        const legacyEntity = DebugSettingsEntity.fromPlainObject(legacyCheck.legacyData)
        
        const consistencyCheck = currentSettings.validateSyncConsistency(legacyEntity)
        
        if (!consistencyCheck.isConsistent) {
          this.logWithLevel(1, 'DebugSettingsUseCase: Inconsistency detected, cleaning up legacy data')
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
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to check/migrate legacy data:', error)
      return { hadLegacyData: false, error: error.message }
    }
  }

  /**
   * デバッグ設定を初期化（初回起動時）
   */
  async initializeDebugSettings() {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Initializing debug settings')
      
      // 旧データの確認と移行
      await this.checkAndMigrateLegacyData()
      
      const existingSettings = await this.getDebugSettings()
      
      // 既に設定が存在する場合はそのまま使用
      if (existingSettings && existingSettings.enabled !== undefined) {
        this.logWithLevel(2, 'DebugSettingsUseCase: Using existing debug settings')
        return existingSettings
      }
      
      // デフォルト設定を保存
      const defaultSettings = DebugSettingsEntity.getDefault()
      const savedSettings = await this.saveDebugSettings(defaultSettings)
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug settings initialized with defaults')
      return savedSettings
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to initialize debug settings:', error)
      throw error
    }
  }

  /**
   * 設定変更通知（内部用）
   */
  notifySettingsChanged(newSettings) {
    this.logWithLevel(2, 'DebugSettingsUseCase: Notifying settings change:', newSettings.getSyncInfo())
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
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to get debug info:', error)
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
  module.exports = { DebugSettingsUseCase }
}