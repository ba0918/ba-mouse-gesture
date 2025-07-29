/**
 * SystemApplicationService
 * システム全体の初期化、依存関係管理、ライフサイクル管理を担当するApplication Service
 */

// 依存関係のインポート
import { GestureApplicationService } from './GestureApplicationService.js';
import { SettingsManagementUseCase } from '../usecases/SettingsManagementUseCase.js';
import { ChromeStorage } from '../../infrastructure/storage/ChromeStorage.js';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository.js';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository.js';
import { ChromeMessaging } from '../../infrastructure/messaging/ChromeMessaging.js';
import { ChromeBrowser } from '../../infrastructure/browser/ChromeBrowser.js';

// 型定義
interface SystemConfig {
  enableDebugMode?: boolean;
  maxErrorHistory?: number;
  healthCheckInterval?: number;
  cleanupInterval?: number;
}

interface SystemComponents {
  infrastructure: Record<string, any>;
  repositories: Record<string, any>;
  useCases: Record<string, any>;
  services: Record<string, any>;
}

interface SystemStatus {
  isInitialized: boolean;
  initializationTime: string | null;
  uptime: number;
  components: {
    infrastructure: string[];
    repositories: string[];
    useCases: string[];
    services: string[];
  };
  recentErrors: ErrorRecord[];
  healthCheck?: any;
  timestamp: string;
}

interface ErrorRecord {
  context: string;
  message: string;
  stack?: string;
  timestamp: string;
}

interface HealthCheckResult {
  isHealthy: boolean;
  message?: string;
  timestamp: string;
  infrastructure?: any;
  repositories?: any;
  overall?: boolean;
}

interface InfrastructureHealthResult {
  isHealthy: boolean;
  components: {
    chromeStorage: boolean;
    chromeMessaging: boolean;
    chromeBrowser: boolean;
  };
  error?: string;
}

interface RepositoryHealthResult {
  isHealthy: boolean;
  components?: {
    settingsRepository: any;
    gestureRepository: any;
  };
  error?: string;
}

class SystemApplicationService {
  private isInitialized: boolean = false;
  private initializationTime: string | null = null;
  private errorHistory: ErrorRecord[] = [];
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  // コンポーネント
  private infrastructure: Record<string, any> = {};
  private repositories: Record<string, any> = {};
  private services: Record<string, any> = {};
  private useCases: Record<string, any> = {};
  
  // 設定
  private systemConfig: SystemConfig;

  constructor() {
    // 設定のデフォルト値
    this.systemConfig = {
      enableDebugMode: true,
      maxErrorHistory: 50,
      healthCheckInterval: 300000, // 5分
      cleanupInterval: 3600000    // 1時間
    };
  }

  /**
   * システム全体の初期化
   * @param config - 初期化設定
   * @returns Promise<SystemInitializationResult>
   */
  async initializeSystem(config: SystemConfig = {}): Promise<SystemInitializationResult> {
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
      this.recordError('system_initialization', error as Error)
      
      return new SystemInitializationResult(
        initializationId,
        false,
        `System initialization failed: ${(error as Error).message}`,
        Date.now() - startTime,
        null,
        error as Error | null | undefined
      )
    }
  }

  /**
   * メインのジェスチャーアプリケーションサービスを取得
   * @returns GestureApplicationService
   */
  getGestureApplicationService(): GestureApplicationService {
    if (!this.isInitialized) {
      throw new SystemApplicationServiceError('System not initialized. Call initializeSystem() first.')
    }
    return this.services.gestureApplicationService
  }

  /**
   * 設定管理UseCaseを取得
   * @returns SettingsManagementUseCase
   */
  getSettingsManagementUseCase(): SettingsManagementUseCase {
    if (!this.isInitialized) {
      throw new SystemApplicationServiceError('System not initialized. Call initializeSystem() first.')
    }
    return this.useCases.settingsManagementUseCase
  }

  /**
   * システム状態の取得
   * @returns Promise<SystemStatus>
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const status: SystemStatus = {
        isInitialized: this.isInitialized,
        initializationTime: this.initializationTime,
        uptime: this.isInitialized && this.initializationTime ? 
          Date.now() - new Date(this.initializationTime).getTime() : 0,
        components: {
          infrastructure: Object.keys(this.infrastructure),
          repositories: Object.keys(this.repositories),
          useCases: Object.keys(this.useCases),
          services: Object.keys(this.services)
        },
        recentErrors: this.errorHistory.slice(-5),
        timestamp: new Date().toISOString(),
        healthCheck: undefined
      }
      
      // 健全性チェックが利用可能な場合は追加
      if (this.isInitialized) {
        status.healthCheck = await this.services.gestureApplicationService.performHealthCheck()
      }
      
      return status
      
    } catch (error) {
      this.recordError('system_status', error as Error)
      throw new SystemApplicationServiceError('Failed to get system status', error as Error)
    }
  }

  /**
   * システムの健全性チェック
   * @returns Promise<HealthCheckResult>
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
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
      this.recordError('health_check', error as Error)
      return {
        isHealthy: false,
        message: `Health check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの優雅な停止
   * @returns Promise<void>
   */
  async shutdown(): Promise<void> {
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
      this.recordError('system_shutdown', error as Error)
      throw new SystemApplicationServiceError('Failed to shutdown system gracefully', error as Error)
    }
  }

  /**
   * システム設定の更新
   * @param newConfig - 新しい設定
   * @returns 設定更新結果
   */
  updateSystemConfiguration(newConfig: SystemConfig): { oldConfig: SystemConfig; newConfig: SystemConfig; timestamp: string } {
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
      this.recordError('system_configuration', error as Error)
      throw new SystemApplicationServiceError('Failed to update system configuration', error as Error)
    }
  }

  // Private initialization methods

  /**
   * Infrastructure層の初期化
   * @private
   */
  private initializeInfrastructure(): void {
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
  private initializeRepositories(): void {
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
  private initializeUseCases(): void {
    // Settings Management UseCase
    this.useCases.settingsManagementUseCase = new SettingsManagementUseCase(
      this.repositories.settingsRepository
    )
  }

  /**
   * Application Service層の初期化
   * @private
   */
  private async initializeApplicationServices(): Promise<void> {
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
  private startSystemMonitoring(): void {
    // 定期的な健全性チェック
    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthCheck = await this.performHealthCheck()
        if (!healthCheck.isHealthy) {
          this.recordError('periodic_health_check', new Error('System health check failed'))
        }
      } catch (error) {
        this.recordError('periodic_health_check', error as Error)
      }
    }, this.systemConfig.healthCheckInterval || 300000)
    
    // 定期的なクリーンアップ
    this.cleanupInterval = setInterval(async () => {
      try {
        await this.performPeriodicCleanup()
      } catch (error) {
        this.recordError('periodic_cleanup', error as Error)
      }
    }, this.systemConfig.cleanupInterval || 3600000)
  }

  /**
   * システム監視の停止
   * @private
   */
  private stopSystemMonitoring(): void {
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
  private async performInitialHealthCheck(): Promise<HealthCheckResult> {
    // Infrastructure の健全性
    const infraHealth = await this.checkInfrastructureHealth()
    
    // Repository の健全性
    const repoHealth = await this.checkRepositoryHealth()
    
    return {
      isHealthy: infraHealth.isHealthy && repoHealth.isHealthy,
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
  private async checkInfrastructureHealth(): Promise<InfrastructureHealthResult> {
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
        error: (error as Error).message,
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
  private async checkRepositoryHealth(): Promise<RepositoryHealthResult> {
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
        error: (error as Error).message
      }
    }
  }

  /**
   * Infrastructure の健全性検証
   * @private
   */
  private verifyInfrastructureHealth(): void {
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
  private async performPeriodicCleanup(): Promise<void> {
    // エラー履歴のクリーンアップ
    if (this.errorHistory.length > (this.systemConfig.maxErrorHistory || 50)) {
      this.errorHistory = this.errorHistory.slice(-(this.systemConfig.maxErrorHistory || 50))
    }
    
    // ストレージの最適化（必要に応じて）
    if (this.isInitialized) {
      try {
        await this.services.gestureApplicationService.optimizeRecognitionAccuracy()
      } catch (error) {
        this.recordError('periodic_optimization', error as Error)
      }
    }
  }

  /**
   * システム設定の検証
   * @private
   */
  private validateSystemConfig(config: SystemConfig): void {
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
  private reconfigureComponents(oldConfig: SystemConfig, newConfig: SystemConfig): void {
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
  private recordError(context: string, error: unknown): void {
    const errorObj = error as Error;
    const errorRecord = {
      context: context,
      message: errorObj.message || 'Unknown error',
      stack: errorObj.stack,
      timestamp: new Date().toISOString()
    }
    
    this.errorHistory.push(errorRecord)
    
    // エラー履歴の制限
    if (this.errorHistory.length > (this.systemConfig.maxErrorHistory || 50)) {
      this.errorHistory.shift()
    }
    
    // デバッグモードでは詳細ログ
    if (this.systemConfig.enableDebugMode) {
      console.error(`[SystemApplicationService] Error in ${context}:`, errorObj)
    }
  }

  // Cleanup methods

  /**
   * Application Services のクリーンアップ
   * @private
   */
  private cleanupApplicationServices(): void {
    // 必要に応じてクリーンアップ処理を追加
    this.services = {}
  }

  /**
   * UseCases のクリーンアップ
   * @private
   */
  private cleanupUseCases(): void {
    // 必要に応じてクリーンアップ処理を追加
    this.useCases = {}
  }

  /**
   * Repositories のクリーンアップ
   * @private
   */
  private cleanupRepositories(): void {
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
  private cleanupInfrastructure(): void {
    // 必要に応じてクリーンアップ処理を追加
    this.infrastructure = {}
  }
}

/**
 * システム初期化結果
 */
class SystemInitializationResult {
  public initializationId: string;
  public success: boolean;
  public message: string;
  public initializationTime: number;
  public healthCheck: any;
  public error: Error | null;
  public timestamp: string;

  constructor(initializationId: string, success: boolean, message: string, initializationTime: number, healthCheck: any, error: Error | null = null) {
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
   * @returns JSON形式の結果
   */
  toJSON(): any {
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
  public originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message)
    this.name = 'SystemApplicationServiceError'
    this.originalError = originalError
  }
}

// ES6 Module export
export { 
  SystemApplicationService, 
  SystemInitializationResult, 
  SystemApplicationServiceError 
};