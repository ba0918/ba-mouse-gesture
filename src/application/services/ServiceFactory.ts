/**
 * ServiceFactory
 * クリーンアーキテクチャのサービス間依存関係を管理するファクトリクラス
 * 依存性注入とサービスライフサイクル管理を提供
 */

// Infrastructure layer imports
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository.js';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository.js';

// Application layer imports
import { GestureRecognitionUseCase } from '../usecases/GestureRecognitionUseCase.js';
import { SettingsManagementUseCase } from '../usecases/SettingsManagementUseCase.js';
import { CustomGestureManagementUseCase } from '../usecases/CustomGestureManagementUseCase.js';
import { GestureApplicationService } from './GestureApplicationService.js';

// Infrastructure services interfaces
interface InfrastructureServices {
  chromeStorage?: any;
  chromeMessaging?: any;
  chromeBrowser?: any;
}

interface RepositoryServices {
  settingsRepository?: SettingsRepository;
  gestureRepository?: GestureRepository;
}

interface UseCaseServices {
  gestureRecognitionUseCase?: GestureRecognitionUseCase;
  settingsManagementUseCase?: SettingsManagementUseCase;
  customGestureManagementUseCase?: CustomGestureManagementUseCase;
}

interface ApplicationServices {
  gestureApplicationService?: GestureApplicationService;
  systemApplicationService?: any;
}

interface ServiceImplementations {
  gestureService?: any;
  settingsService?: any;
  systemService?: any;
}

interface FactoryConfig {
  enableDebug?: boolean;
  skipHealthChecks?: boolean;
  customSettings?: Record<string, unknown>;
}

interface FactoryStatus {
  isInitialized: boolean;
  hasInitializationPromise: boolean;
  componentCounts: {
    infrastructure: number;
    repositories: number;
    useCases: number;
    applicationServices: number;
    serviceImplementations: number;
  };
  timestamp: string;
}

interface HealthCheck {
  isHealthy: boolean;
  message?: string;
}

/**
 * サービスファクトリ - シングルトンパターン
 */
export class ServiceFactory {
  private static instance: ServiceFactory | null = null;
  
  // 各層のインスタンス管理
  private infrastructure: InfrastructureServices = {};
  private repositories: RepositoryServices = {};
  private useCases: UseCaseServices = {};
  private applicationServices: ApplicationServices = {};
  private serviceImplementations: ServiceImplementations = {};
  
  // 初期化状態
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance;
    }
    
    // シングルトンインスタンスを保存
    ServiceFactory.instance = this;
  }

  /**
   * ファクトリの初期化
   */
  async initialize(config: FactoryConfig = {}): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this._performInitialization(config);
    await this.initializationPromise;
    
    this.isInitialized = true;
  }

  /**
   * 実際の初期化処理
   */
  private async _performInitialization(config: FactoryConfig): Promise<void> {
    try {
      // 1. Infrastructure層の初期化
      this._initializeInfrastructure();
      
      // 2. Repository層の初期化
      this._initializeRepositories();
      
      // 3. UseCase層の初期化
      this._initializeUseCases();
      
      // 4. Application Service層の初期化
      await this._initializeApplicationServices(config);
      
      // 5. Service Implementation層の初期化
      this._initializeServiceImplementations();
      
    } catch (error) {
      console.error('ServiceFactory initialization failed:', error);
      throw new ServiceFactoryError('Failed to initialize ServiceFactory', error as Error);
    }
  }

  /**
   * Infrastructure層の初期化
   */
  private _initializeInfrastructure(): void {
    // Chrome Storage
    this.infrastructure.chromeStorage = {
      // Chrome Storage のスタブ実装
      get: async (key: string) => ({}),
      set: async (key: string, value: unknown) => {},
      remove: async (key: string) => {}
    };
    
    // Chrome Messaging
    this.infrastructure.chromeMessaging = {
      sendMessage: async (message: unknown) => ({}),
      onMessage: {
        addListener: (callback: (message: unknown) => void) => {}
      }
    };
    
    // Chrome Browser
    this.infrastructure.chromeBrowser = {
      navigateToUrl: async (tabId: number, url: string) => {},
      executeScript: async (tabId: number, script: string) => {},
      goBack: async (tabId: number) => {},
      goForward: async (tabId: number) => {},
      createTab: async () => ({ id: 1 }),
      closeTab: async (tabId: number) => {},
      duplicateTab: async (tabId: number) => ({ id: 2 }),
      reloadTab: async (tabId: number, bypassCache: boolean) => {},
      switchToPreviousTab: async () => {},
      switchToNextTab: async () => {}
    };
  }

  /**
   * Repository層の初期化
   */
  private _initializeRepositories(): void {
    // Settings Repository
    if (this.infrastructure.chromeStorage) {
      this.repositories.settingsRepository = new SettingsRepository(
        this.infrastructure.chromeStorage
      );
    }
    
    // Gesture Repository
    if (this.infrastructure.chromeStorage) {
      this.repositories.gestureRepository = new GestureRepository(
        this.infrastructure.chromeStorage
      );
    }
  }

  /**
   * UseCase層の初期化
   */
  private _initializeUseCases(): void {
    // Gesture Recognition UseCase
    if (this.repositories.settingsRepository && this.repositories.gestureRepository) {
      this.useCases.gestureRecognitionUseCase = new GestureRecognitionUseCase(
        this.repositories.settingsRepository as any,
        this.repositories.gestureRepository as any
      );
    }
    
    // Settings Management UseCase
    if (this.repositories.settingsRepository) {
      this.useCases.settingsManagementUseCase = new SettingsManagementUseCase(
        this.repositories.settingsRepository as any
      );
    }
    
    // Custom Gesture Management UseCase
    if (this.repositories.gestureRepository && this.repositories.settingsRepository) {
      this.useCases.customGestureManagementUseCase = new CustomGestureManagementUseCase(
        this.repositories.gestureRepository as any,
        this.repositories.settingsRepository as any
      );
    }
  }

  /**
   * Application Service層の初期化
   */
  private async _initializeApplicationServices(config: FactoryConfig): Promise<void> {
    // Gesture Application Service
    if (
      this.repositories.gestureRepository &&
      this.repositories.settingsRepository &&
      this.infrastructure.chromeMessaging &&
      this.infrastructure.chromeBrowser
    ) {
      this.applicationServices.gestureApplicationService = new GestureApplicationService(
        this.repositories.gestureRepository,
        this.repositories.settingsRepository,
        this.infrastructure.chromeMessaging,
        this.infrastructure.chromeBrowser
      );
      
      // システム初期化
      await this.applicationServices.gestureApplicationService.initialize();
    }
    
    // System Application Service (スタブ実装)
    this.applicationServices.systemApplicationService = {
      initializeSystem: async (config: FactoryConfig) => {},
      shutdown: async () => {},
      performHealthCheck: async (): Promise<HealthCheck> => ({ isHealthy: true }),
      getSystemMetrics: async () => ({})
    };
  }

  /**
   * Service Implementation層の初期化
   */
  private _initializeServiceImplementations(): void {
    // Gesture Service Implementation (スタブ)
    this.serviceImplementations.gestureService = {
      processGesture: async (data: unknown) => ({}),
      getAvailableGestures: async () => []
    };
    
    // Settings Service Implementation (スタブ)
    this.serviceImplementations.settingsService = {
      getCurrentSettings: async () => ({}),
      updateSettings: async (settings: unknown) => ({})
    };
    
    // System Service Implementation (スタブ)
    this.serviceImplementations.systemService = {
      getSystemInfo: async () => ({}),
      performHealthCheck: async (): Promise<HealthCheck> => ({ isHealthy: true }),
      getSystemMetrics: async () => ({})
    };
  }

  // Public API - Service access methods

  /**
   * ジェスチャーサービスを取得
   */
  getGestureService(): any {
    this._ensureInitialized();
    return this.serviceImplementations.gestureService;
  }

  /**
   * 設定サービスを取得
   */
  getSettingsService(): any {
    this._ensureInitialized();
    return this.serviceImplementations.settingsService;
  }

  /**
   * システムサービスを取得
   */
  getSystemService(): any {
    this._ensureInitialized();
    return this.serviceImplementations.systemService;
  }

  /**
   * Infrastructure層のコンポーネントを取得
   */
  getInfrastructure(): InfrastructureServices {
    this._ensureInitialized();
    return { ...this.infrastructure };
  }

  /**
   * Repository層のコンポーネントを取得
   */
  getRepositories(): RepositoryServices {
    this._ensureInitialized();
    return { ...this.repositories };
  }

  /**
   * UseCase層のコンポーネントを取得
   */
  getUseCases(): UseCaseServices {
    this._ensureInitialized();
    return { ...this.useCases };
  }

  /**
   * Application Service層のコンポーネントを取得
   */
  getApplicationServices(): ApplicationServices {
    this._ensureInitialized();
    return { ...this.applicationServices };
  }

  // Factory management methods

  /**
   * ファクトリのリセット
   */
  async reset(): Promise<void> {
    try {
      // 各層のクリーンアップ
      this._cleanupServiceImplementations();
      await this._cleanupApplicationServices();
      this._cleanupUseCases();
      this._cleanupRepositories();
      this._cleanupInfrastructure();
      
      // 状態をリセット
      this.isInitialized = false;
      this.initializationPromise = null;
      
    } catch (error) {
      console.error('ServiceFactory reset failed:', error);
      throw new ServiceFactoryError('Failed to reset ServiceFactory', error as Error);
    }
  }

  /**
   * ファクトリの破棄
   */
  async dispose(): Promise<void> {
    await this.reset();
    
    // シングルトンインスタンスをクリア
    ServiceFactory.instance = null;
  }

  /**
   * ファクトリの状態を取得
   */
  getFactoryStatus(): FactoryStatus {
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
    };
  }

  /**
   * 完全にセットアップされたサービス群を取得
   */
  getAllServices(): {
    gestureService: any;
    settingsService: any;
    systemService: any;
  } {
    this._ensureInitialized();
    
    return {
      gestureService: this.getGestureService(),
      settingsService: this.getSettingsService(),
      systemService: this.getSystemService()
    };
  }

  /**
   * 統計情報を取得
   */
  async getFactoryStatistics(): Promise<{
    isInitialized: boolean;
    services: Record<string, string> | null;
    health: HealthCheck;
    metrics?: unknown;
    error?: string;
  }> {
    try {
      const status = this.getFactoryStatus();
      
      if (!this.isInitialized) {
        return {
          ...status,
          services: null,
          health: { isHealthy: false, message: 'Factory not initialized' }
        };
      }
      
      const systemService = this.getSystemService();
      const healthCheck = await systemService.performHealthCheck();
      const metrics = await systemService.getSystemMetrics();
      
      return {
        ...status,
        services: {
          gestureService: 'available',
          settingsService: 'available',
          systemService: 'available'
        },
        health: healthCheck,
        metrics: metrics
      };
      
    } catch (error) {
      return {
        isInitialized: this.isInitialized,
        services: null,
        health: { isHealthy: false, message: `Statistics error: ${(error as Error).message}` },
        error: (error as Error).message
      };
    }
  }

  // Private helper methods

  /**
   * 初期化状態をチェック
   */
  private _ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ServiceFactoryError('ServiceFactory not initialized. Call initialize() first.');
    }
  }

  // Cleanup methods

  /**
   * Service Implementation層のクリーンアップ
   */
  private _cleanupServiceImplementations(): void {
    this.serviceImplementations = {};
  }

  /**
   * Application Service層のクリーンアップ
   */
  private async _cleanupApplicationServices(): Promise<void> {
    if (this.applicationServices.systemApplicationService) {
      await this.applicationServices.systemApplicationService.shutdown();
    }
    this.applicationServices = {};
  }

  /**
   * UseCase層のクリーンアップ
   */
  private _cleanupUseCases(): void {
    this.useCases = {};
  }

  /**
   * Repository層のクリーンアップ
   */
  private _cleanupRepositories(): void {
    // キャッシュのクリア（必要に応じて実装）
    this.repositories = {};
  }

  /**
   * Infrastructure層のクリーンアップ
   */
  private _cleanupInfrastructure(): void {
    this.infrastructure = {};
  }
}

/**
 * ServiceFactory専用エラークラス
 */
export class ServiceFactoryError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = 'ServiceFactoryError';
    this.originalError = originalError;
  }
}

/**
 * シングルトンアクセス用のファクトリインスタンス取得
 */
export async function createServiceFactory(config: FactoryConfig = {}): Promise<ServiceFactory> {
  const factory = new ServiceFactory();
  await factory.initialize(config);
  return factory;
}

/**
 * 既存のファクトリインスタンスを取得（初期化済みの場合のみ）
 */
export function getServiceFactory(): ServiceFactory | null {
  const instance = ServiceFactory['instance'];
  return instance && instance['isInitialized'] ? instance : null;
}