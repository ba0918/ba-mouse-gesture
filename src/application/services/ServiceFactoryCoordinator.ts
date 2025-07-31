/**
 * ServiceFactoryCoordinator
 * Abstract Factory Patternによる層別ファクトリーの統合管理
 * 旧ServiceFactoryに代わる軽量なコーディネーター
 */

import { InfrastructureFactory, type InfrastructureServices } from '../factories/InfrastructureFactory'
import { RepositoryFactory, type RepositoryServices } from '../factories/RepositoryFactory'
import { UseCaseFactory, type UseCaseServices } from '../factories/UseCaseFactory'
import { DefaultGestureDefinitions } from '../../domain/definitions/DefaultGestureDefinitions'

export interface FactoryConfig {
  enableDebug?: boolean
  skipHealthChecks?: boolean
  customSettings?: Record<string, unknown>
}

export interface ServiceFactoryStatus {
  isInitialized: boolean
  componentCounts: {
    infrastructure: number
    repositories: number
    useCases: number
  }
  timestamp: string
}

/**
 * サービスファクトリーコーディネーター
 * 各層のファクトリーを統合し、依存関係を管理
 */
export class ServiceFactoryCoordinator {
  private static instance: ServiceFactoryCoordinator | null = null

  // 層別ファクトリー
  private infrastructureFactory = new InfrastructureFactory()
  private repositoryFactory = new RepositoryFactory()
  private useCaseFactory = new UseCaseFactory()

  // 初期化済みサービス
  private infrastructureServices: InfrastructureServices | null = null
  private repositoryServices: RepositoryServices | null = null
  private useCaseServices: UseCaseServices | null = null

  // 初期化状態
  private isInitialized = false
  private initializationPromise: Promise<void> | null = null

  /**
   * シングルトンコンストラクタ
   */
  constructor() {
    if (ServiceFactoryCoordinator.instance) {
      return ServiceFactoryCoordinator.instance
    }
    ServiceFactoryCoordinator.instance = this
  }

  /**
   * 全層を初期化
   */
  async initialize(config: FactoryConfig = {}): Promise<void> {
    if (this.isInitialized) {
      return
    }

    if (this.initializationPromise) {
      return this.initializationPromise
    }

    this.initializationPromise = this.performInitialization(config)
    await this.initializationPromise

    this.isInitialized = true
  }

  /**
   * 実際の初期化処理
   */
  private async performInitialization(_config: FactoryConfig): Promise<void> {
    try {
      // 1. Infrastructure層を初期化
      this.infrastructureServices = this.infrastructureFactory.createServices()

      // 2. Repository層を初期化（Infrastructure層に依存）
      this.repositoryServices = this.repositoryFactory.createServices(this.infrastructureServices)

      // 3. UseCase層を初期化（Repository層に依存）
      this.useCaseServices = this.useCaseFactory.createServices(this.repositoryServices)

    } catch (error) {
      console.error('ServiceFactoryCoordinator initialization failed:', error)
      throw new ServiceFactoryCoordinatorError('Failed to initialize ServiceFactoryCoordinator', error as Error)
    }
  }

  /**
   * SettingsManagementUseCaseを取得
   */
  createSettingsManagementUseCase() {
    this.ensureInitialized()
    if (!this.useCaseServices?.settingsManagementUseCase) {
      throw new ServiceFactoryCoordinatorError('SettingsManagementUseCase not initialized')
    }
    return this.useCaseServices.settingsManagementUseCase
  }

  /**
   * CustomGestureManagementUseCaseを取得
   */
  createCustomGestureManagementUseCase() {
    this.ensureInitialized()
    if (!this.useCaseServices?.customGestureManagementUseCase) {
      throw new ServiceFactoryCoordinatorError('CustomGestureManagementUseCase not initialized')
    }
    return this.useCaseServices.customGestureManagementUseCase
  }

  /**
   * ジェスチャー一覧UseCaseを作成（互換性用）
   */
  createGestureListUseCase() {
    this.ensureInitialized()

    if (!this.useCaseServices?.settingsManagementUseCase || !this.useCaseServices?.customGestureManagementUseCase) {
      throw new ServiceFactoryCoordinatorError('Required UseCases not initialized')
    }

    // ジェスチャー一覧取得用のラッパーオブジェクトを返す
    return {
      getAllGestures: async () => {
        const settingsUseCase = this.useCaseServices!.settingsManagementUseCase
        const customGestureUseCase = this.useCaseServices!.customGestureManagementUseCase

        try {
          // デフォルトジェスチャーの取得
          const settings = await settingsUseCase.getCurrentSettings()
          const defaultGestures = this.getDefaultGesturesFromUnifiedDefinition(settings)

          // カスタムジェスチャーの取得
          const customGestures = await customGestureUseCase.getAllCustomGestures()
          const customGestureItems = customGestures.map((gesture: unknown) => {
            const typedGesture = gesture as { id: string; name: string; pattern?: { toString(): string }; action: string; enabled: boolean }
            
            // アクション名を日本語に変換
            const actionNames: Record<string, string> = {
              back: 'ブラウザの戻る',
              forward: 'ブラウザの進む',
              scroll_top: 'ページ最上部スクロール',
              scroll_bottom: 'ページ最下部スクロール',
              scroll_up: 'ページ最上部スクロール',
              scroll_down: 'ページ最下部スクロール',
              close_tab: 'タブを閉じる',
              new_tab: '新しいタブを開く',
              duplicate_tab: 'タブ複製',
              refresh: 'ページ更新',
              super_refresh: 'スーパーリロード（キャッシュクリア付き）',
              prev_tab: '前のタブに切り替え',
              next_tab: '次のタブに切り替え'
            }

            const actionDescription = actionNames[typedGesture.action] || typedGesture.action

            return {
              id: typedGesture.id,
              name: typedGesture.name,
              pattern: typedGesture.pattern?.toString() || '',
              action: typedGesture.action,
              type: 'custom' as const,
              category: 'custom',
              description: actionDescription,
              enabled: typedGesture.enabled
            }
          })

          return [...defaultGestures, ...customGestureItems]
        } catch (error) {
          console.error('Failed to get all gestures:', error)
          return []
        }
      }
    }
  }

  /**
   * デフォルトジェスチャーの定義を取得（統一定義使用）
   */
  private getDefaultGesturesFromUnifiedDefinition(settings: unknown): unknown[] {
    const typedSettings = settings as { defaultGestureStates?: Record<string, boolean> }
    const defaultGestureStates = typedSettings.defaultGestureStates || {}

    // 統一定義から状態付きジェスチャーリストを生成
    const gesturesWithState = DefaultGestureDefinitions.createGestureListItems(defaultGestureStates)

    console.log('✅ UNIFIED - ServiceFactoryCoordinator default gestures from central definition:')
    gesturesWithState.slice(0, 3).forEach((gesture, index) => {
      const typedGesture = gesture as { id: string; action: string; enabled: boolean }
      console.log(`  [${index}] id: "${typedGesture.id}", action: "${typedGesture.action}", enabled: ${typedGesture.enabled}`)
    })

    return gesturesWithState
  }

  /**
   * ファクトリーの状態を取得
   */
  getFactoryStatus(): ServiceFactoryStatus {
    return {
      isInitialized: this.isInitialized,
      componentCounts: {
        infrastructure: this.infrastructureFactory.isInitialized() ? 3 : 0,
        repositories: this.repositoryFactory.isInitialized() ? 2 : 0,
        useCases: this.useCaseFactory.isInitialized() ? 2 : 0
      },
      timestamp: new Date().toISOString()
    }
  }

  /**
   * ファクトリーをリセット
   */
  async reset(): Promise<void> {
    try {
      // 各ファクトリーをリセット
      this.useCaseFactory.reset()
      this.repositoryFactory.reset()
      this.infrastructureFactory.reset()

      // 状態をリセット
      this.useCaseServices = null
      this.repositoryServices = null
      this.infrastructureServices = null
      this.isInitialized = false
      this.initializationPromise = null

    } catch (error) {
      console.error('ServiceFactoryCoordinator reset failed:', error)
      throw new ServiceFactoryCoordinatorError('Failed to reset ServiceFactoryCoordinator', error as Error)
    }
  }

  /**
   * ファクトリーを破棄
   */
  async dispose(): Promise<void> {
    await this.reset()
    ServiceFactoryCoordinator.instance = null
  }

  /**
   * 初期化状態をチェック
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new ServiceFactoryCoordinatorError('ServiceFactoryCoordinator not initialized. Call initialize() first.')
    }
  }
}

/**
 * ServiceFactoryCoordinator専用エラークラス
 */
export class ServiceFactoryCoordinatorError extends Error {
  public readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'ServiceFactoryCoordinatorError'
    this.originalError = originalError
  }
}

/**
 * コーディネーターのインスタンス取得（ファクトリー関数）
 */
export async function createServiceFactoryCoordinator(config: FactoryConfig = {}): Promise<ServiceFactoryCoordinator> {
  const coordinator = new ServiceFactoryCoordinator()
  await coordinator.initialize(config)
  return coordinator
}