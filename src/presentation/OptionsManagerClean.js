/**
 * クリーンアーキテクチャに基づくOptionsManager
 * Presentation層 - 依存関係注入とコンポーネント統合
 */

// Domain層
const GestureEntity = require('../domain/entities/GestureEntity')
const DebugSettingsEntity = require('../domain/entities/DebugSettingsEntity')

// Application層
const GestureListUseCase = require('../application/usecases/GestureListUseCase')
const DebugSettingsUseCase = require('../application/usecases/DebugSettingsUseCase')

// Infrastructure層
const SettingsRepository = require('../infrastructure/repositories/SettingsRepository')
const GestureRepository = require('../infrastructure/repositories/GestureRepository')
const ChromeStorageAdapter = require('../infrastructure/adapters/ChromeStorageAdapter')

// Presentation層
const GestureListController = require('./controllers/GestureListController')
const DebugSettingsController = require('./controllers/DebugSettingsController')

class OptionsManagerClean {
  constructor() {
    // 🔧 依存関係注入によるクリーンアーキテクチャの実現
    this.storageAdapter = null
    this.settingsRepository = null
    this.gestureRepository = null
    this.gestureListUseCase = null
    this.debugSettingsUseCase = null
    this.gestureListController = null
    this.debugSettingsController = null
    this.isInitialized = false
  }

  /**
   * 依存関係を注入し、アプリケーションを初期化
   */
  async initialize() {
    try {
      console.log('🔧 OptionsManagerClean: Starting initialization')
      
      // 🔧 Infrastructure層の初期化（外→内の依存関係）
      await this.initializeInfrastructure()
      
      // 🔧 Application層の初期化（ユースケース）
      await this.initializeApplication()
      
      // 🔧 Presentation層の初期化（コントローラー）
      await this.initializePresentation()
      
      // 🔧 レガシーサポート（既存機能との互換性）
      await this.initializeLegacySupport()
      
      this.isInitialized = true
      console.log('🔧 OptionsManagerClean: Initialization completed successfully')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Initialization failed:', error)
      this.showInitializationError(error)
      throw error
    }
  }

  /**
   * Infrastructure層の初期化
   */
  async initializeInfrastructure() {
    try {
      console.log('🔧 OptionsManagerClean: Initializing Infrastructure layer')
      
      // Chrome Storage アダプター
      this.storageAdapter = new ChromeStorageAdapter()
      
      if (!this.storageAdapter.isAvailable()) {
        throw new Error('Chrome Storage API not available')
      }
      
      // リポジトリ
      this.settingsRepository = new SettingsRepository(this.storageAdapter)
      this.gestureRepository = new GestureRepository(this.storageAdapter)
      
      console.log('🔧 OptionsManagerClean: Infrastructure layer initialized')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Infrastructure initialization failed:', error)
      throw new Error(`Infrastructure initialization failed: ${error.message}`)
    }
  }

  /**
   * Application層の初期化
   */
  async initializeApplication() {
    try {
      console.log('🔧 OptionsManagerClean: Initializing Application layer')
      
      // ユースケース
      this.gestureListUseCase = new GestureListUseCase(
        this.gestureRepository, 
        this.settingsRepository
      )
      this.debugSettingsUseCase = new DebugSettingsUseCase(this.settingsRepository)
      
      // デバッグ設定の初期化
      await this.debugSettingsUseCase.initializeDebugSettings()
      
      console.log('🔧 OptionsManagerClean: Application layer initialized')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Application initialization failed:', error)
      throw new Error(`Application initialization failed: ${error.message}`)
    }
  }

  /**
   * Presentation層の初期化
   */
  async initializePresentation() {
    try {
      console.log('🔧 OptionsManagerClean: Initializing Presentation layer')
      
      // コントローラー
      this.gestureListController = new GestureListController(this.gestureListUseCase)
      this.debugSettingsController = new DebugSettingsController(this.debugSettingsUseCase)
      
      // コントローラーの初期化
      await this.gestureListController.initialize()
      await this.debugSettingsController.initialize()
      
      console.log('🔧 OptionsManagerClean: Presentation layer initialized')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Presentation initialization failed:', error)
      throw new Error(`Presentation initialization failed: ${error.message}`)
    }
  }

  /**
   * レガシーサポートの初期化（既存機能との互換性）
   */
  async initializeLegacySupport() {
    try {
      console.log('🔧 OptionsManagerClean: Initializing legacy support')
      
      // 既存のOptionsManagerの機能をクリーンアーキテクチャにマッピング
      this.setupLegacyMethods()
      
      // 既存のイベントリスナーとの互換性
      this.setupLegacyEventListeners()
      
      console.log('🔧 OptionsManagerClean: Legacy support initialized')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Legacy support initialization failed:', error)
      // レガシーサポートのエラーは致命的ではない
      console.warn('⚠️ Some legacy features may not work properly')
    }
  }

  /**
   * レガシーメソッドのマッピング
   */
  setupLegacyMethods() {
    // 既存のOptionsManagerとの互換性のためのメソッドマッピング
    
    this.loadSettings = async () => {
      return await this.settingsRepository.getSettings()
    }
    
    this.saveSettings = async (settings) => {
      return await this.settingsRepository.saveSettings(settings)
    }
    
    this.loadDebugSettings = async () => {
      const debugSettings = await this.debugSettingsUseCase.getDebugSettings()
      return debugSettings.toPlainObject()
    }
    
    this.saveDebugSettings = async () => {
      const currentSettings = this.debugSettingsController.getCurrentSettings()
      if (currentSettings) {
        await this.debugSettingsUseCase.saveDebugSettings(currentSettings)
      }
    }
    
    this.renderAllGesturesList = async () => {
      await this.gestureListController.refresh()
    }
    
    this.toggleGestureStatus = async (gestureId) => {
      return await this.gestureListController.toggleGestureStatus(gestureId)
    }
    
    this.showSaveStatus = (message, success) => {
      const type = success ? 'success' : 'error'
      this.gestureListController.showMessage(message, type)
      this.debugSettingsController.showMessage(message, type)
    }
  }

  /**
   * レガシーイベントリスナーの設定
   */
  setupLegacyEventListeners() {
    // 既存のDOMイベントとの互換性
    document.addEventListener('DOMContentLoaded', () => {
      console.log('🔧 OptionsManagerClean: DOM content loaded')
    })
  }

  /**
   * 初期化エラーの表示
   */
  showInitializationError(error) {
    const containers = [
      document.getElementById('allGesturesList'),
      document.getElementById('debugSettingsContainer')
    ]

    containers.forEach(container => {
      if (container) {
        container.innerHTML = `
          <div style="padding: 32px; text-align: center; color: #ea4335;">
            <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
            <div style="font-weight: 600; margin-bottom: 8px;">初期化エラー</div>
            <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px;">
              ${error.message || '不明なエラーが発生しました'}
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
    })
  }

  /**
   * アプリケーションの状態確認
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      hasStorageAdapter: Boolean(this.storageAdapter),
      hasRepositories: Boolean(this.settingsRepository && this.gestureRepository),
      hasUseCases: Boolean(this.gestureListUseCase && this.debugSettingsUseCase),
      hasControllers: Boolean(this.gestureListController && this.debugSettingsController),
      storageAvailable: this.storageAdapter?.isAvailable() || false
    }
  }

  /**
   * ヘルスチェック
   */
  async healthCheck() {
    try {
      const status = this.getStatus()
      
      if (!status.isInitialized) {
        throw new Error('Application not initialized')
      }
      
      if (!status.storageAvailable) {
        throw new Error('Chrome Storage not available')
      }
      
      // 基本的な機能テスト
      await this.settingsRepository.getSettings()
      await this.gestureListUseCase.getAllGestures()
      await this.debugSettingsUseCase.getDebugSettings()
      
      console.log('🔧 OptionsManagerClean: Health check passed')
      return { status: 'healthy', details: status }
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Health check failed:', error)
      return { status: 'unhealthy', error: error.message, details: this.getStatus() }
    }
  }

  /**
   * グレースフルシャットダウン
   */
  async shutdown() {
    try {
      console.log('🔧 OptionsManagerClean: Starting graceful shutdown')
      
      // クリーンアップ処理
      // イベントリスナーの削除、リソースの解放など
      
      this.isInitialized = false
      console.log('🔧 OptionsManagerClean: Graceful shutdown completed')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Shutdown failed:', error)
    }
  }
}

// モジュールとしてエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptionsManagerClean
}

// ブラウザ環境での自動初期化
if (typeof window !== 'undefined') {
  // DOMが読み込まれたら自動初期化
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      console.log('🔧 OptionsManagerClean: Auto-initializing')
      
      const optionsManager = new OptionsManagerClean()
      await optionsManager.initialize()
      
      // グローバルに公開（デバッグ用）
      window.optionsManagerClean = optionsManager
      
      console.log('🔧 OptionsManagerClean: Auto-initialization completed')
      
    } catch (error) {
      console.error('🚨 OptionsManagerClean: Auto-initialization failed:', error)
    }
  })
}