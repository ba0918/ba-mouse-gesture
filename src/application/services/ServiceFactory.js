/**
 * ServiceFactory
 * クリーンアーキテクチャのサービス間依存関係を管理するファクトリクラス
 * 依存性注入とサービスライフサイクル管理を提供
 */

// Infrastructure layer imports
let ChromeStorage, ChromeMessaging, ChromeBrowser
let SettingsRepository, GestureRepository

// Application layer imports
let GestureRecognitionUseCase, SettingsManagementUseCase, CustomGestureManagementUseCase
let GestureApplicationService, SystemApplicationService

// Service implementations
let GestureServiceImpl, SettingsServiceImpl, SystemServiceImpl

if (typeof require !== 'undefined') {
  // Infrastructure layer
  const ChromeStorageModule = require('../../infrastructure/storage/ChromeStorage')
  ChromeStorage = ChromeStorageModule.ChromeStorage
  
  const ChromeMessagingModule = require('../../infrastructure/messaging/ChromeMessaging')
  ChromeMessaging = ChromeMessagingModule.ChromeMessaging
  
  const ChromeBrowserModule = require('../../infrastructure/browser/ChromeBrowser')
  ChromeBrowser = ChromeBrowserModule.ChromeBrowser
  
  const SettingsRepositoryModule = require('../../infrastructure/storage/repositories/SettingsRepository')
  SettingsRepository = SettingsRepositoryModule.SettingsRepository
  
  const GestureRepositoryModule = require('../../infrastructure/storage/repositories/GestureRepository')
  GestureRepository = GestureRepositoryModule.GestureRepository
  
  // Application layer
  const GestureRecognitionUseCaseModule = require('../usecases/GestureRecognitionUseCase')
  GestureRecognitionUseCase = GestureRecognitionUseCaseModule.GestureRecognitionUseCase
  
  const SettingsManagementUseCaseModule = require('../usecases/SettingsManagementUseCase')
  SettingsManagementUseCase = SettingsManagementUseCaseModule.SettingsManagementUseCase
  
  const CustomGestureManagementUseCaseModule = require('../usecases/CustomGestureManagementUseCase')
  CustomGestureManagementUseCase = CustomGestureManagementUseCaseModule.CustomGestureManagementUseCase
  
  const GestureApplicationServiceModule = require('./GestureApplicationService')
  GestureApplicationService = GestureApplicationServiceModule.GestureApplicationService
  
  const SystemApplicationServiceModule = require('./SystemApplicationService')
  SystemApplicationService = SystemApplicationServiceModule.SystemApplicationService
  
  // Service implementations
  const GestureServiceImplModule = require('./implementations/GestureServiceImpl')
  GestureServiceImpl = GestureServiceImplModule.GestureServiceImpl
  
  const SettingsServiceImplModule = require('./implementations/SettingsServiceImpl')
  SettingsServiceImpl = SettingsServiceImplModule.SettingsServiceImpl
  
  const SystemServiceImplModule = require('./implementations/SystemServiceImpl')
  SystemServiceImpl = SystemServiceImplModule.SystemServiceImpl
}

/**
 * サービスファクトリ - シングルトンパターン
 */
class ServiceFactory {
  constructor() {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance
    }
    
    // シングルトンインスタンスを保存
    ServiceFactory.instance = this
    
    // 各層のインスタンス管理
    this.infrastructure = {}
    this.repositories = {}
    this.useCases = {}
    this.applicationServices = {}
    this.serviceImplementations = {}
    
    // 初期化状態
    this.isInitialized = false
    this.initializationPromise = null
  }

  /**
   * ファクトリの初期化
   * @param {Object} config - 初期化設定
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    if (this.isInitialized) {
      return
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise
    }
    
    this.initializationPromise = this._performInitialization(config)
    await this.initializationPromise
    
    this.isInitialized = true
  }

  /**
   * 実際の初期化処理
   * @private
   * @param {Object} config
   */
  async _performInitialization(config) {
    try {
      // 1. Infrastructure層の初期化
      this._initializeInfrastructure()
      
      // 2. Repository層の初期化
      this._initializeRepositories()
      
      // 3. UseCase層の初期化
      this._initializeUseCases()
      
      // 4. Application Service層の初期化
      await this._initializeApplicationServices(config)
      
      // 5. Service Implementation層の初期化
      this._initializeServiceImplementations()
      
    } catch (error) {
      console.error('ServiceFactory initialization failed:', error)
      throw new ServiceFactoryError('Failed to initialize ServiceFactory', error)
    }
  }

  /**
   * Infrastructure層の初期化
   * @private
   */
  _initializeInfrastructure() {
    // Chrome Storage
    this.infrastructure.chromeStorage = new ChromeStorage()
    
    // Chrome Messaging
    this.infrastructure.chromeMessaging = new ChromeMessaging()
    
    // Chrome Browser
    this.infrastructure.chromeBrowser = new ChromeBrowser()
  }

  /**
   * Repository層の初期化
   * @private
   */
  _initializeRepositories() {
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
  _initializeUseCases() {
    // Gesture Recognition UseCase
    this.useCases.gestureRecognitionUseCase = new GestureRecognitionUseCase(
      this.repositories.gestureRepository,
      this.repositories.settingsRepository
    )
    
    // Settings Management UseCase
    this.useCases.settingsManagementUseCase = new SettingsManagementUseCase(
      this.repositories.settingsRepository
    )
    
    // Custom Gesture Management UseCase
    this.useCases.customGestureManagementUseCase = new CustomGestureManagementUseCase(
      this.repositories.gestureRepository
    )
  }

  /**
   * Application Service層の初期化
   * @private
   */
  async _initializeApplicationServices(config) {
    // Gesture Application Service
    this.applicationServices.gestureApplicationService = new GestureApplicationService(
      this.repositories.gestureRepository,
      this.repositories.settingsRepository,
      this.infrastructure.chromeMessaging,
      this.infrastructure.chromeBrowser
    )
    
    // システム初期化
    await this.applicationServices.gestureApplicationService.initialize()
    
    // System Application Service
    this.applicationServices.systemApplicationService = new SystemApplicationService()
    
    // SystemApplicationServiceの初期化
    await this.applicationServices.systemApplicationService.initializeSystem(config)
  }

  /**
   * Service Implementation層の初期化
   * @private
   */
  _initializeServiceImplementations() {
    // Gesture Service Implementation
    this.serviceImplementations.gestureService = new GestureServiceImpl(
      this.applicationServices.gestureApplicationService
    )
    
    // Settings Service Implementation
    this.serviceImplementations.settingsService = new SettingsServiceImpl(
      this.useCases.settingsManagementUseCase
    )
    
    // System Service Implementation
    this.serviceImplementations.systemService = new SystemServiceImpl(
      this.applicationServices.systemApplicationService
    )
  }

  // Public API - Service access methods

  /**
   * ジェスチャーサービスを取得
   * @returns {GestureServiceImpl}
   */
  getGestureService() {
    this._ensureInitialized()
    return this.serviceImplementations.gestureService
  }

  /**
   * 設定サービスを取得
   * @returns {SettingsServiceImpl}
   */
  getSettingsService() {
    this._ensureInitialized()
    return this.serviceImplementations.settingsService
  }

  /**
   * システムサービスを取得
   * @returns {SystemServiceImpl}
   */
  getSystemService() {
    this._ensureInitialized()
    return this.serviceImplementations.systemService
  }

  /**
   * 低レベルコンポーネントへのアクセス（デバッグ用）
   */

  /**
   * Infrastructure層のコンポーネントを取得
   * @returns {Object}
   */
  getInfrastructure() {
    this._ensureInitialized()
    return { ...this.infrastructure }
  }

  /**
   * Repository層のコンポーネントを取得
   * @returns {Object}
   */
  getRepositories() {
    this._ensureInitialized()
    return { ...this.repositories }
  }

  /**
   * UseCase層のコンポーネントを取得
   * @returns {Object}
   */
  getUseCases() {
    this._ensureInitialized()
    return { ...this.useCases }
  }

  /**
   * Application Service層のコンポーネントを取得
   * @returns {Object}
   */
  getApplicationServices() {
    this._ensureInitialized()
    return { ...this.applicationServices }
  }

  // Factory management methods

  /**
   * ファクトリのリセット
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      // 各層のクリーンアップ
      this._cleanupServiceImplementations()
      await this._cleanupApplicationServices()
      this._cleanupUseCases()
      this._cleanupRepositories()
      this._cleanupInfrastructure()
      
      // 状態をリセット
      this.isInitialized = false
      this.initializationPromise = null
      
    } catch (error) {
      console.error('ServiceFactory reset failed:', error)
      throw new ServiceFactoryError('Failed to reset ServiceFactory', error)
    }
  }

  /**
   * ファクトリの破棄
   * @returns {Promise<void>}
   */
  async dispose() {
    await this.reset()
    
    // シングルトンインスタンスをクリア
    ServiceFactory.instance = null
  }

  /**
   * ファクトリの状態を取得
   * @returns {Object}
   */
  getFactoryStatus() {
    return {
      isInitialized: this.isInitialized,
      hasInitializationPromise: Boolean(this.initializationPromise),
      componentCounts: {
        infrastructure: Object.keys(this.infrastructure).length,
        repositories: Object.keys(this.repositories).length,
        useCases: Object.keys(this.useCases).length,
        applicationServices: Object.keys(this.applicationServices).length,
        serviceImplementations: Object.keys(this.serviceImplementations).length
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * 依存関係グラフを取得（デバッグ用）
   * @returns {Object}
   */
  getDependencyGraph() {
    this._ensureInitialized()
    
    return {
      serviceImplementations: {
        gestureService: ['gestureApplicationService'],
        settingsService: ['settingsManagementUseCase'],
        systemService: ['systemApplicationService']
      },
      applicationServices: {
        gestureApplicationService: ['gestureRepository', 'settingsRepository', 'chromeMessaging', 'chromeBrowser'],
        systemApplicationService: ['全コンポーネント']
      },
      useCases: {
        gestureRecognitionUseCase: ['gestureRepository', 'settingsRepository'],
        settingsManagementUseCase: ['settingsRepository'],
        customGestureManagementUseCase: ['gestureRepository']
      },
      repositories: {
        settingsRepository: ['chromeStorage'],
        gestureRepository: ['chromeStorage']
      },
      infrastructure: {
        chromeStorage: [],
        chromeMessaging: [],
        chromeBrowser: []
      }
    }
  }

  // Private helper methods

  /**
   * 初期化状態をチェック
   * @private
   */
  _ensureInitialized() {
    if (!this.isInitialized) {
      throw new ServiceFactoryError('ServiceFactory not initialized. Call initialize() first.')
    }
  }

  // Cleanup methods

  /**
   * Service Implementation層のクリーンアップ
   * @private
   */
  _cleanupServiceImplementations() {
    this.serviceImplementations = {}
  }

  /**
   * Application Service層のクリーンアップ
   * @private
   */
  async _cleanupApplicationServices() {
    if (this.applicationServices.systemApplicationService) {
      await this.applicationServices.systemApplicationService.shutdown()
    }
    this.applicationServices = {}
  }

  /**
   * UseCase層のクリーンアップ
   * @private
   */
  _cleanupUseCases() {
    this.useCases = {}
  }

  /**
   * Repository層のクリーンアップ
   * @private
   */
  _cleanupRepositories() {
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
   * Infrastructure層のクリーンアップ
   * @private
   */
  _cleanupInfrastructure() {
    this.infrastructure = {}
  }

  // Factory convenience methods

  /**
   * 完全にセットアップされたサービス群を取得
   * @returns {Object}
   */
  getAllServices() {
    this._ensureInitialized()
    
    return {
      gestureService: this.getGestureService(),
      settingsService: this.getSettingsService(),
      systemService: this.getSystemService()
    }
  }

  /**
   * 統計情報を取得
   * @returns {Promise<Object>}
   */
  async getFactoryStatistics() {
    try {
      const status = this.getFactoryStatus()
      
      if (!this.isInitialized) {
        return {
          ...status,
          services: null,
          health: { isHealthy: false, message: 'Factory not initialized' }
        }
      }
      
      const systemService = this.getSystemService()
      const healthCheck = await systemService.performHealthCheck()
      const metrics = await systemService.getSystemMetrics()
      
      return {
        ...status,
        services: {
          gestureService: 'available',
          settingsService: 'available',
          systemService: 'available'
        },
        health: healthCheck,
        metrics: metrics
      }
      
    } catch (error) {
      return {
        isInitialized: this.isInitialized,
        services: null,
        health: { isHealthy: false, message: `Statistics error: ${error.message}` },
        metrics: null,
        error: error.message
      }
    }
  }
}

/**
 * ServiceFactory専用エラークラス
 */
class ServiceFactoryError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'ServiceFactoryError'
    this.originalError = originalError
  }
}

/**
 * シングルトンアクセス用のファクトリインスタンス取得
 * @param {Object} config - 初期化設定
 * @returns {Promise<ServiceFactory>}
 */
async function createServiceFactory(config = {}) {
  const factory = new ServiceFactory()
  await factory.initialize(config)
  return factory
}

/**
 * 既存のファクトリインスタンスを取得（初期化済みの場合のみ）
 * @returns {ServiceFactory|null}
 */
function getServiceFactory() {
  return ServiceFactory.instance && ServiceFactory.instance.isInitialized 
    ? ServiceFactory.instance 
    : null
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    ServiceFactory, 
    ServiceFactoryError,
    createServiceFactory,
    getServiceFactory
  }
}