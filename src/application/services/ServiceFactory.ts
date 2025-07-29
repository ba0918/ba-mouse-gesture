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
    // Chrome Storage - 実際のChrome APIを使用
    this.infrastructure.chromeStorage = {
      get: async (keys: string | string[] | null = null) => {
        return new Promise((resolve) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.get(keys, (result) => {
              resolve(result);
            });
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve({});
          }
        });
      },
      set: async (items: Record<string, unknown>) => {
        return new Promise<void>((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.set(items, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve();
          }
        });
      },
      remove: async (keys: string | string[]) => {
        return new Promise<void>((resolve, reject) => {
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
            chrome.storage.sync.remove(keys, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          } else {
            // テスト環境など、Chrome APIが使用できない場合
            resolve();
          }
        });
      }
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
   * SettingsManagementUseCaseを作成/取得
   */
  createSettingsManagementUseCase(): SettingsManagementUseCase {
    this._ensureInitialized();
    if (!this.useCases.settingsManagementUseCase) {
      throw new ServiceFactoryError('SettingsManagementUseCase not initialized');
    }
    return this.useCases.settingsManagementUseCase;
  }

  /**
   * CustomGestureManagementUseCaseを作成/取得
   */
  createCustomGestureManagementUseCase(): CustomGestureManagementUseCase {
    this._ensureInitialized();
    if (!this.useCases.customGestureManagementUseCase) {
      throw new ServiceFactoryError('CustomGestureManagementUseCase not initialized');
    }
    return this.useCases.customGestureManagementUseCase;
  }

  /**
   * GestureListUseCaseを作成/取得（ジェスチャー一覧表示用）
   */
  createGestureListUseCase(): any {
    this._ensureInitialized();
    
    // GestureListUseCaseは存在しないため、SettingsManagementUseCaseで代替
    if (!this.useCases.settingsManagementUseCase) {
      throw new ServiceFactoryError('SettingsManagementUseCase not initialized');
    }
    
    // ジェスチャー一覧取得用のラッパーオブジェクトを返す
    return {
      getAllGestures: async () => {
        const settingsUseCase = this.useCases.settingsManagementUseCase!;
        const customGestureUseCase = this.useCases.customGestureManagementUseCase!;
        
        try {
          // デフォルトジェスチャーの取得
          const settings = await settingsUseCase.getCurrentSettings();
          const defaultGestures = this._getDefaultGestures(settings);
          
          // カスタムジェスチャーの取得
          const customGestures = await customGestureUseCase.getAllCustomGestures();
          const customGestureItems = customGestures.map((gesture: any) => ({
            id: gesture.id,
            name: gesture.name,
            pattern: gesture.pattern?.toString() || '',
            action: gesture.action,
            type: 'custom' as const,
            category: 'custom',
            description: `カスタムジェスチャー: ${gesture.action}`,
            enabled: gesture.enabled
          }));
          
          return [...defaultGestures, ...customGestureItems];
        } catch (error) {
          console.error('Failed to get all gestures:', error);
          return [];
        }
      }
    };
  }

  /**
   * デフォルトジェスチャーの定義を取得
   */
  private _getDefaultGestures(settings: any): any[] {
    const defaultGestureStates = settings.defaultGestureStates || {};
    
    const defaultGestures = [
      { id: 'back', name: 'ブラウザの戻る', pattern: '←', action: 'back', category: 'basic', description: '前のページに戻る' },
      { id: 'forward', name: 'ブラウザの進む', pattern: '→', action: 'forward', category: 'basic', description: '次のページに進む' },
      { id: 'refresh', name: 'ページ更新', pattern: '↑↓', action: 'refresh', category: 'page', description: 'ページをリロード' },
      { id: 'super_refresh', name: 'スーパーリロード', pattern: '↑↓↑', action: 'super_refresh', category: 'page', description: 'キャッシュクリア付きリロード' },
      { id: 'close_tab', name: 'タブを閉じる', pattern: '↓→', action: 'close_tab', category: 'tab', description: '現在のタブを閉じる' },
      { id: 'new_tab', name: '新しいタブを開く', pattern: '↑→', action: 'new_tab', category: 'tab', description: '新しいタブを開く' },
      { id: 'duplicate_tab', name: 'タブ複製', pattern: '→↓', action: 'duplicate_tab', category: 'tab', description: '現在のタブを複製' },
      { id: 'scroll_top', name: 'ページ最上部スクロール', pattern: '↑', action: 'scroll_top', category: 'page', description: 'ページの先頭に移動' },
      { id: 'scroll_bottom', name: 'ページ最下部スクロール', pattern: '↓', action: 'scroll_bottom', category: 'page', description: 'ページの末尾に移動' },
      { id: 'prev_tab', name: '前のタブ', pattern: '←→', action: 'prev_tab', category: 'tab', description: '前のタブに切り替え' },
      { id: 'next_tab', name: '次のタブ', pattern: '→←', action: 'next_tab', category: 'tab', description: '次のタブに切り替え' }
    ];
    
    return defaultGestures.map(gesture => ({
      ...gesture,
      type: 'default' as const,
      enabled: defaultGestureStates[gesture.id] !== false // デフォルトは有効
    }));
  }

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