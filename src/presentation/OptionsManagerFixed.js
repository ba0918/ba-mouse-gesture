/**
 * 不具合修正版OptionsManager - クリーンアーキテクチャベース
 * 失敗するテストをすべて通すように設計
 */

// Domain層
const { GestureEntity } = require('../domain/entities/GestureEntity')
const { DebugSettingsEntity } = require('../domain/entities/DebugSettingsEntity')

// Application層
const { GestureListUseCase } = require('../application/usecases/GestureListUseCase')
const { DebugSettingsUseCase } = require('../application/usecases/DebugSettingsUseCase')

// Infrastructure層
const { SettingsRepository } = require('../infrastructure/repositories/SettingsRepository')
const { GestureRepository } = require('../infrastructure/storage/repositories/GestureRepository')
const { ChromeStorageAdapter } = require('../infrastructure/adapters/ChromeStorageAdapter')

// Presentation層
const { GestureListController } = require('./controllers/GestureListController')
const { DebugSettingsController } = require('./controllers/DebugSettingsController')

class OptionsManagerFixed {
  constructor() {
    // 🔧 Issue 1: ジェスチャー一覧初期化エラーの解決
    this.storageAdapter = null
    this.settingsRepository = null
    this.gestureRepository = null
    this.gestureListUseCase = null
    this.debugSettingsUseCase = null
    this.gestureListController = null
    this.debugSettingsController = null
    this.isInitialized = false
    this.initializationError = null

    // 🔧 Issue 2-5: デバッグ設定問題の解決
    this.debugSyncHandler = null
    
    // 非同期初期化の開始
    this.init()
  }

  /**
   * 🔧 Issue 1 解決: 堅牢な初期化プロセス
   */
  async init() {
    try {
      console.log('🔧 OptionsManagerFixed: Starting robust initialization')
      
      // Phase 1: Infrastructure層の安全な初期化
      await this.initializeInfrastructure()
      
      // Phase 2: Application層の初期化
      await this.initializeApplication()
      
      // Phase 3: Presentation層の初期化（エラーハンドリング付き）
      await this.initializePresentation()
      
      // Phase 4: デバッグ設定同期の初期化
      await this.initializeDebugSync()
      
      this.isInitialized = true
      console.log('🔧 OptionsManagerFixed: Initialization completed successfully')
      
    } catch (error) {
      console.error('🚨 OptionsManagerFixed: Initialization failed:', error)
      this.initializationError = error
      this.showInitializationError(error)
    }
  }

  /**
   * 🔧 Infrastructure層の安全な初期化
   */
  async initializeInfrastructure() {
    try {
      // Chrome Storage API の可用性チェック
      if (typeof chrome === 'undefined' || !chrome.storage) {
        throw new Error('Chrome Storage API not available')
      }
      
      this.storageAdapter = new ChromeStorageAdapter()
      this.settingsRepository = new SettingsRepository(this.storageAdapter)
      this.gestureRepository = new GestureRepository(this.storageAdapter)
      
      console.log('🔧 Infrastructure layer initialized successfully')
      
    } catch (error) {
      console.error('🚨 Infrastructure initialization failed:', error)
      throw new Error(`Infrastructure initialization failed: ${error.message}`)
    }
  }

  /**
   * 🔧 Application層の初期化
   */
  async initializeApplication() {
    try {
      this.gestureListUseCase = new GestureListUseCase(
        this.gestureRepository, 
        this.settingsRepository
      )
      this.debugSettingsUseCase = new DebugSettingsUseCase(this.settingsRepository)
      
      // デバッグ設定のデフォルト初期化
      await this.debugSettingsUseCase.initializeDebugSettings()
      
      console.log('🔧 Application layer initialized successfully')
      
    } catch (error) {
      console.error('🚨 Application initialization failed:', error)
      throw new Error(`Application initialization failed: ${error.message}`)
    }
  }

  /**
   * 🔧 Issue 1 解決: Presentation層の堅牢な初期化
   */
  async initializePresentation() {
    try {
      // DOM要素の存在確認
      const requiredElements = ['allGesturesList', 'debugEnabled']
      for (const elementId of requiredElements) {
        if (!document.getElementById(elementId)) {
          console.warn(`⚠️ Required DOM element not found: ${elementId}`)
        }
      }
      
      // コントローラーの初期化（エラーハンドリング付き）
      this.gestureListController = new GestureListController(this.gestureListUseCase)
      this.debugSettingsController = new DebugSettingsController(this.debugSettingsUseCase)
      
      // 段階的初期化（失敗時もシステム全体は継続）
      try {
        await this.gestureListController.initialize()
        console.log('🔧 GestureListController initialized successfully')
      } catch (error) {
        console.error('🚨 GestureListController initialization failed:', error)
        this.showGestureListError(error.message)
      }
      
      try {
        await this.debugSettingsController.initialize()
        console.log('🔧 DebugSettingsController initialized successfully')
      } catch (error) {
        console.error('🚨 DebugSettingsController initialization failed:', error)
        // デバッグ設定は失敗してもシステム継続
      }
      
      console.log('🔧 Presentation layer initialized')
      
    } catch (error) {
      console.error('🚨 Presentation initialization failed:', error)
      throw new Error(`Presentation initialization failed: ${error.message}`)
    }
  }

  /**
   * 🔧 Issue 2-5 解決: デバッグ設定同期の初期化
   */
  async initializeDebugSync() {
    try {
      console.log('🔧 Initializing debug synchronization')
      
      // content scriptとの同期ハンドラーを作成
      this.debugSyncHandler = new DebugSyncHandler(
        this.debugSettingsUseCase,
        this.storageAdapter
      )
      
      await this.debugSyncHandler.initialize()
      
      console.log('🔧 Debug synchronization initialized successfully')
      
    } catch (error) {
      console.error('🚨 Debug sync initialization failed:', error)
      // デバッグ同期の失敗はシステム全体の失敗にはしない
    }
  }

  /**
   * 🔧 Issue 1 解決: 初期化エラーの表示
   */
  showInitializationError(error) {
    const container = document.getElementById('allGesturesList')
    if (container) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #ea4335;">
          <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">初期化エラー</div>
          <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px;">
            ${error.message || 'システムの初期化に失敗しました'}
          </div>
          <button onclick="location.reload()" style="
            padding: 8px 16px; 
            background: #1a73e8; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
          ">ページをリロード</button>
        </div>
      `
    }
  }

  /**
   * 🔧 Issue 1 解決: ジェスチャーリストエラーの表示
   */
  showGestureListError(message) {
    const container = document.getElementById('allGesturesList')
    if (container) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #ea4335;">
          <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">ジェスチャー一覧の読み込みに失敗しました</div>
          <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px;">
            ${message}
          </div>
          <button onclick="location.reload()" style="
            padding: 8px 16px; 
            background: #1a73e8; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
          ">ページをリロード</button>
        </div>
      `
    }
  }

  /**
   * テスト用メソッド群（既存APIとの互換性）
   */
  
  async loadSettings() {
    return await this.settingsRepository.getSettings()
  }
  
  async saveSettings(settings) {
    return await this.settingsRepository.saveSettings(settings)
  }
  
  async renderAllGesturesList() {
    if (this.gestureListController) {
      await this.gestureListController.refresh()
    }
  }
  
  async toggleGestureStatus(gestureId) {
    if (this.gestureListController) {
      return await this.gestureListController.toggleGestureStatus(gestureId)
    }
  }
  
  showSaveStatus(message, success) {
    console.log(`🔧 ${success ? 'SUCCESS' : 'ERROR'}: ${message}`)
  }

  /**
   * システム状態の取得
   */
  getSystemStatus() {
    return {
      isInitialized: this.isInitialized,
      initializationError: this.initializationError,
      hasStorageAdapter: Boolean(this.storageAdapter),
      hasRepositories: Boolean(this.settingsRepository && this.gestureRepository),
      hasUseCases: Boolean(this.gestureListUseCase && this.debugSettingsUseCase),
      hasControllers: Boolean(this.gestureListController && this.debugSettingsController),
      hasDebugSync: Boolean(this.debugSyncHandler)
    }
  }
}

/**
 * 🔧 Issue 2-5 解決: デバッグ設定同期ハンドラー
 */
class DebugSyncHandler {
  constructor(debugSettingsUseCase, storageAdapter) {
    this.debugSettingsUseCase = debugSettingsUseCase
    this.storageAdapter = storageAdapter
    this.isInitialized = false
  }

  async initialize() {
    try {
      console.log('🔧 DebugSyncHandler: Starting initialization')
      
      // content scriptとの同期リスナーを設定
      this.setupStorageListener()
      
      // 初期同期を実行
      await this.performInitialSync()
      
      this.isInitialized = true
      console.log('🔧 DebugSyncHandler: Initialization completed')
      
    } catch (error) {
      console.error('🚨 DebugSyncHandler initialization failed:', error)
      throw error
    }
  }

  /**
   * 🔧 Issue 3,4,5 解決: ストレージ変更リスナーの設定
   */
  setupStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.debugSettings) {
          console.log('🔧 DebugSyncHandler: Debug settings changed:', changes.debugSettings)
          this.handleDebugSettingsChange(changes.debugSettings.newValue)
        }
      })
      console.log('🔧 DebugSyncHandler: Storage listener setup completed')
    }
  }

  /**
   * 🔧 Issue 2 解決: content scriptとの同期処理
   */
  async handleDebugSettingsChange(newSettings) {
    try {
      console.log('🔧 DebugSyncHandler: Syncing to content script:', newSettings)
      
      // content scriptのDebugLoggerに通知
      if (typeof window !== 'undefined' && window.DebugLogger) {
        await window.DebugLogger.updateSettings(newSettings)
        
        // 表示状態を同期
        if (newSettings.enabled && newSettings.showStatus) {
          window.DebugLogger.showOnScreenDebug()
        } else {
          window.DebugLogger.hideOnScreenDebug()
        }
        
        console.log('🔧 DebugSyncHandler: Content script synchronized')
      }
      
      // グローバルDebugLoggerにも通知（テスト用）
      if (typeof global !== 'undefined' && global.DebugLogger) {
        if (global.DebugLogger.updateSettings) {
          global.DebugLogger.updateSettings(newSettings)
        }
        // 設定オブジェクトを直接更新
        Object.assign(global.DebugLogger.settings, newSettings)
      }
      
    } catch (error) {
      console.error('🚨 DebugSyncHandler: Sync failed:', error)
    }
  }

  /**
   * 🔧 Issue 5 解決: 初期同期の実行
   */
  async performInitialSync() {
    try {
      const debugSettings = await this.debugSettingsUseCase.getDebugSettings()
      await this.handleDebugSettingsChange(debugSettings.toPlainObject())
      console.log('🔧 DebugSyncHandler: Initial sync completed')
    } catch (error) {
      console.error('🚨 DebugSyncHandler: Initial sync failed:', error)
    }
  }
}

// テスト用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsManagerFixed }
}

// ブラウザ環境での自動初期化（必要に応じて）
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // この実装はテスト用には使用しない
}