/**
 * SystemApplicationService
 * システム全体の初期化、依存関係管理、ライフサイクル管理を担当するApplication Service
 */

// 依存関係のインポート
let GestureApplicationService, SettingsManagementUseCase
let ChromeStorage, SettingsRepository, GestureRepository
let ChromeMessaging, ChromeBrowser
if (typeof require !== 'undefined') {
  ({ GestureApplicationService } = require('./GestureApplicationService'));
  ({ SettingsManagementUseCase } = require('../usecases/SettingsManagementUseCase'));
  ({ ChromeStorage } = require('../../infrastructure/storage/ChromeStorage'));
  ({ SettingsRepository } = require('../../infrastructure/storage/repositories/SettingsRepository'));
  ({ GestureRepository } = require('../../infrastructure/storage/repositories/GestureRepository'));
  ({ ChromeMessaging } = require('../../infrastructure/messaging/ChromeMessaging'));
  ({ ChromeBrowser } = require('../../infrastructure/browser/ChromeBrowser'))
}

class SystemApplicationService {
  constructor() {
    // システム状態
    this.isInitialized = false
    this.initializationTime = null
    this.errorHistory = []
    
    // コンポーネント
    this.infrastructure = {}
    this.repositories = {}
    this.services = {}
    this.useCases = {}
    
    // 設定
    this.systemConfig = {
      enableDebugMode: true,
      maxErrorHistory: 50,
      healthCheckInterval: 300000, // 5分
      cleanupInterval: 3600000    // 1時間
    }
  }

  /**
   * システム全体の初期化
   * @param {Object} config - 初期化設定
   * @returns {Promise<SystemInitializationResult>}
   */
  async initializeSystem(config = {}) {
    const startTime = Date.now()
    const initializationId = `init_${startTime}_${Math.random().toString(36).substr(2, 9)}`
    
    try {
      // 設定をマージ
      this.systemConfig = { ...this.systemConfig, ...config }
      
      // 1. Infrastructure層の初期化
      this.initializeInfrastructure()
      
      // 2. Repository層の初期化
      this.initializeRepositories()
      
      // 3. UseCase層の初期化
      this.initializeUseCases()
      
      // 4. Application Service層の初期化
      await this.initializeApplicationServices()
      
      // 5. システム監視の開始
      this.startSystemMonitoring()
      
      // 6. 初期健全性チェック
      const healthCheck = await this.performInitialHealthCheck()
      
      this.isInitialized = true
      this.initializationTime = new Date().toISOString()
      
      const initializationTime = Date.now() - startTime
      
      return new SystemInitializationResult(
        initializationId,
        true,
        'System initialized successfully',
        initializationTime,
        healthCheck
      )
      
    } catch (error) {
      this.recordError('system_initialization', error)
      
      return new SystemInitializationResult(
        initializationId,
        false,
        `System initialization failed: ${error.message}`,
        Date.now() - startTime,
        null,
        error
      )
    }
  }

  /**
   * メインのジェスチャーアプリケーションサービスを取得
   * @returns {GestureApplicationService}
   */
  getGestureApplicationService() {
    if (!this.isInitialized) {
      throw new SystemApplicationServiceError('System not initialized. Call initializeSystem() first.')
    }
    return this.services.gestureApplicationService
  }

  /**
   * 設定管理UseCaseを取得
   * @returns {SettingsManagementUseCase}
   */
  getSettingsManagementUseCase() {
    if (!this.isInitialized) {
      throw new SystemApplicationServiceError('System not initialized. Call initializeSystem() first.')
    }
    return this.useCases.settingsManagementUseCase
  }

  /**
   * システム状態の取得
   * @returns {Promise<Object>}
   */
  async getSystemStatus() {
    try {
      const status = {
        isInitialized: this.isInitialized,
        initializationTime: this.initializationTime,
        uptime: this.isInitialized ? 
          Date.now() - new Date(this.initializationTime).getTime() : 0,
        components: {
          infrastructure: Object.keys(this.infrastructure),
          repositories: Object.keys(this.repositories),
          useCases: Object.keys(this.useCases),
          services: Object.keys(this.services)
        },
        recentErrors: this.errorHistory.slice(-5),
        timestamp: new Date().toISOString()
      }
      
      // 健全性チェックが利用可能な場合は追加
      if (this.isInitialized) {
        status.healthCheck = await this.services.gestureApplicationService.performHealthCheck()
      }
      
      return status
      
    } catch (error) {
      this.recordError('system_status', error)
      throw new SystemApplicationServiceError('Failed to get system status', error)
    }
  }

  /**
   * システムの健全性チェック
   * @returns {Promise<Object>}
   */
  async performHealthCheck() {
    if (!this.isInitialized) {
      return {
        isHealthy: false,
        message: 'System not initialized',
        timestamp: new Date().toISOString()
      }
    }

    try {
      return await this.services.gestureApplicationService.performHealthCheck()
    } catch (error) {
      this.recordError('health_check', error)
      return {
        isHealthy: false,
        message: `Health check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの優雅な停止
   * @returns {Promise<void>}
   */
  async shutdown() {
    try {
      // 監視の停止
      this.stopSystemMonitoring()
      
      // 各コンポーネントのクリーンアップ
      await this.cleanupApplicationServices()
      await this.cleanupUseCases()
      await this.cleanupRepositories()
      await this.cleanupInfrastructure()
      
      // 状態をリセット
      this.isInitialized = false
      this.initializationTime = null
      
    } catch (error) {
      this.recordError('system_shutdown', error)
      throw new SystemApplicationServiceError('Failed to shutdown system gracefully', error)
    }
  }

  /**
   * システム設定の更新
   * @param {Object} newConfig - 新しい設定
   * @returns {Promise<Object>}
   */
  updateSystemConfiguration(newConfig) {
    try {
      // 設定の検証
      this.validateSystemConfig(newConfig)
      
      // 設定を更新
      const oldConfig = { ...this.systemConfig }
      this.systemConfig = { ...this.systemConfig, ...newConfig }
      
      // 影響を受けるコンポーネントの再設定
      this.reconfigureComponents(oldConfig, this.systemConfig)
      
      return {
        oldConfig: oldConfig,
        newConfig: this.systemConfig,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      this.recordError('system_configuration', error)
      throw new SystemApplicationServiceError('Failed to update system configuration', error)
    }
  }

  // Private initialization methods

  /**
   * Infrastructure層の初期化
   * @private
   */
  initializeInfrastructure() {
    // Chrome Storage
    this.infrastructure.chromeStorage = new ChromeStorage()
    
    // Chrome Messaging
    this.infrastructure.chromeMessaging = new ChromeMessaging()
    
    // Chrome Browser
    this.infrastructure.chromeBrowser = new ChromeBrowser()
    
    // インフラストラクチャの健全性チェック
    this.verifyInfrastructureHealth()
  }

  /**
   * Repository層の初期化
   * @private
   */
  initializeRepositories() {
    // Settings Repository
    this.repositories.settingsRepository = new SettingsRepository(
      this.infrastructure.chromeStorage
    )
    
    // Gesture Repository
    this.repositories.gestureRepository = new GestureRepository(
      this.infrastructure.chromeStorage
    )
  }

  /**
   * UseCase層の初期化
   * @private
   */
  initializeUseCases() {
    // Settings Management UseCase
    this.useCases.settingsManagementUseCase = new SettingsManagementUseCase(
      this.repositories.settingsRepository
    )
  }

  /**
   * Application Service層の初期化
   * @private
   */
  async initializeApplicationServices() {
    // Gesture Application Service
    this.services.gestureApplicationService = new GestureApplicationService(
      this.repositories.gestureRepository,
      this.repositories.settingsRepository,
      this.infrastructure.chromeMessaging,
      this.infrastructure.chromeBrowser
    )
    
    // サービスの初期化
    await this.services.gestureApplicationService.initialize()
  }

  /**
   * システム監視の開始
   * @private
   */
  startSystemMonitoring() {
    // 定期的な健全性チェック
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck()
        if (!healthCheck.isHealthy) {
          this.recordError('periodic_health_check', new Error('System health check failed'))
        }
      } catch (error) {
        this.recordError('periodic_health_check', error)
      }
    }, this.systemConfig.healthCheckInterval)
    
    // 定期的なクリーンアップ
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performPeriodicCleanup()
      } catch (error) {
        this.recordError('periodic_cleanup', error)
      }
    }, this.systemConfig.cleanupInterval)
  }

  /**
   * システム監視の停止
   * @private
   */
  stopSystemMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
  }

  /**
   * 初期健全性チェック
   * @private
   */
  async performInitialHealthCheck() {
    // Infrastructure の健全性
    const infraHealth = await this.checkInfrastructureHealth()
    
    // Repository の健全性
    const repoHealth = await this.checkRepositoryHealth()
    
    return {
      infrastructure: infraHealth,
      repositories: repoHealth,
      overall: infraHealth.isHealthy && repoHealth.isHealthy,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Infrastructure の健全性チェック
   * @private
   */
  async checkInfrastructureHealth() {
    try {
      // Chrome Storage のテスト
      await this.infrastructure.chromeStorage.get('health_check_test')
      
      return {
        isHealthy: true,
        components: {
          chromeStorage: true,
          chromeMessaging: true,
          chromeBrowser: true
        }
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        components: {
          chromeStorage: false,
          chromeMessaging: false,
          chromeBrowser: false
        }
      }
    }
  }

  /**
   * Repository の健全性チェック
   * @private
   */
  async checkRepositoryHealth() {
    try {
      const [settingsStatus, gestureStatus] = await Promise.all([
        this.repositories.settingsRepository.getRepositoryStatus(),
        this.repositories.gestureRepository.getRepositoryStatus()
      ])
      
      return {
        isHealthy: settingsStatus.isHealthy && gestureStatus.isHealthy,
        components: {
          settingsRepository: settingsStatus,
          gestureRepository: gestureStatus
        }
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message
      }
    }
  }

  /**
   * Infrastructure の健全性検証
   * @private
   */
  verifyInfrastructureHealth() {
    // Chrome API の利用可能性チェック
    if (typeof chrome === 'undefined') {
      throw new Error('Chrome APIs not available')
    }
    
    if (!chrome.storage || !chrome.runtime || !chrome.tabs) {
      throw new Error('Required Chrome APIs not available')
    }
  }

  /**
   * 定期的なクリーンアップ実行
   * @private
   */
  async performPeriodicCleanup() {
    // エラー履歴のクリーンアップ
    if (this.errorHistory.length > this.systemConfig.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.systemConfig.maxErrorHistory)
    }
    
    // ストレージの最適化（必要に応じて）
    if (this.isInitialized) {
      try {
        await this.services.gestureApplicationService.optimizeRecognitionAccuracy()
      } catch (error) {
        this.recordError('periodic_optimization', error)
      }
    }
  }

  /**
   * システム設定の検証
   * @private
   */
  validateSystemConfig(config) {
    if (config.maxErrorHistory !== undefined) {
      if (!Number.isInteger(config.maxErrorHistory) || config.maxErrorHistory < 1) {
        throw new Error('maxErrorHistory must be a positive integer')
      }
    }
    
    if (config.healthCheckInterval !== undefined) {
      if (!Number.isInteger(config.healthCheckInterval) || config.healthCheckInterval < 10000) {
        throw new Error('healthCheckInterval must be at least 10 seconds')
      }
    }
    
    if (config.cleanupInterval !== undefined) {
      if (!Number.isInteger(config.cleanupInterval) || config.cleanupInterval < 60000) {
        throw new Error('cleanupInterval must be at least 1 minute')
      }
    }
  }

  /**
   * コンポーネントの再設定
   * @private
   */
  reconfigureComponents(oldConfig, newConfig) {
    // 監視間隔が変更された場合は再起動
    if (oldConfig.healthCheckInterval !== newConfig.healthCheckInterval ||
        oldConfig.cleanupInterval !== newConfig.cleanupInterval) {
      this.stopSystemMonitoring()
      this.startSystemMonitoring()
    }
  }

  /**
   * エラーを記録
   * @private
   */
  recordError(context, error) {
    const errorRecord = {
      context: context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }
    
    this.errorHistory.push(errorRecord)
    
    // エラー履歴の制限
    if (this.errorHistory.length > this.systemConfig.maxErrorHistory) {
      this.errorHistory.shift()
    }
    
    // デバッグモードでは詳細ログ
    if (this.systemConfig.enableDebugMode) {
      console.error(`[SystemApplicationService] Error in ${context}:`, error)
    }
  }

  // Cleanup methods

  /**
   * Application Services のクリーンアップ
   * @private
   */
  cleanupApplicationServices() {
    // 必要に応じてクリーンアップ処理を追加
    this.services = {}
  }

  /**
   * UseCases のクリーンアップ
   * @private
   */
  cleanupUseCases() {
    // 必要に応じてクリーンアップ処理を追加
    this.useCases = {}
  }

  /**
   * Repositories のクリーンアップ
   * @private
   */
  cleanupRepositories() {
    // キャッシュのクリア
    if (this.repositories.settingsRepository) {
      this.repositories.settingsRepository.clearCache()
    }
    if (this.repositories.gestureRepository) {
      this.repositories.gestureRepository.clearCache()
    }
    
    this.repositories = {}
  }

  /**
   * Infrastructure のクリーンアップ
   * @private
   */
  cleanupInfrastructure() {
    // 必要に応じてクリーンアップ処理を追加
    this.infrastructure = {}
  }
}

/**
 * システム初期化結果
 */
class SystemInitializationResult {
  constructor(initializationId, success, message, initializationTime, healthCheck, error = null) {
    this.initializationId = initializationId
    this.success = success
    this.message = message
    this.initializationTime = initializationTime
    this.healthCheck = healthCheck
    this.error = error
    this.timestamp = new Date().toISOString()
  }

  /**
   * 結果をJSONに変換
   * @returns {Object}
   */
  toJSON() {
    return {
      initializationId: this.initializationId,
      success: this.success,
      message: this.message,
      initializationTime: this.initializationTime,
      healthCheck: this.healthCheck,
      error: this.error ? this.error.message : null,
      timestamp: this.timestamp
    }
  }
}

/**
 * システムアプリケーションサービス専用エラークラス
 */
class SystemApplicationServiceError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'SystemApplicationServiceError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    SystemApplicationService, 
    SystemInitializationResult, 
    SystemApplicationServiceError 
  }
}