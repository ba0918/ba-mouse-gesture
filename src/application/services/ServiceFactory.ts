/**
 * ServiceFactory
 * 旧互換性ラッパー - 新しいServiceFactoryCoordinatorにデリゲート
 * 649行のGod Objectから、Abstract Factory PatternベースのCoordinatorに改善
 * 
 * @deprecated 新しいコードではServiceFactoryCoordinatorを直接使用してください
 */

import { ServiceFactoryCoordinator, type FactoryConfig, type ServiceFactoryStatus } from './ServiceFactoryCoordinator'

// 旧コードとの互換性のため、型を再エクスポート
export type { FactoryConfig }

/**
 * ServiceFactory - 互換性ラッパークラス
 * 649行のGod Objectから、Abstract Factory Patternベースの小さなデリゲートクラスに改善
 */
export class ServiceFactory {
  private static instance: ServiceFactory | null = null
  private coordinator: ServiceFactoryCoordinator

  constructor() {
    if (ServiceFactory.instance) {
      return ServiceFactory.instance
    }
    
    this.coordinator = new ServiceFactoryCoordinator()
    ServiceFactory.instance = this
  }

  /**
   * ファクトリの初期化
   * @deprecated ServiceFactoryCoordinator.initialize() を使用してください
   */
  async initialize(config: FactoryConfig = {}): Promise<void> {
    return this.coordinator.initialize(config)
  }

  /**
   * SettingsManagementUseCaseを作成/取得
   * @deprecated ServiceFactoryCoordinator.createSettingsManagementUseCase() を使用してください
   */
  createSettingsManagementUseCase() {
    return this.coordinator.createSettingsManagementUseCase()
  }

  /**
   * CustomGestureManagementUseCaseを作成/取得
   * @deprecated ServiceFactoryCoordinator.createCustomGestureManagementUseCase() を使用してください
   */
  createCustomGestureManagementUseCase() {
    return this.coordinator.createCustomGestureManagementUseCase()
  }

  /**
   * GestureListUseCaseを作成/取得（ジェスチャー一覧表示用）
   * @deprecated ServiceFactoryCoordinator.createGestureListUseCase() を使用してください
   */
  createGestureListUseCase() {
    return this.coordinator.createGestureListUseCase()
  }

  /**
   * ファクトリの状態を取得
   * @deprecated ServiceFactoryCoordinator.getFactoryStatus() を使用してください
   */
  getFactoryStatus(): ServiceFactoryStatus {
    return this.coordinator.getFactoryStatus()
  }

  /**
   * ファクトリのリセット
   * @deprecated ServiceFactoryCoordinator.reset() を使用してください
   */
  async reset(): Promise<void> {
    return this.coordinator.reset()
  }

  /**
   * ファクトリの破棄
   * @deprecated ServiceFactoryCoordinator.dispose() を使用してください
   */
  async dispose(): Promise<void> {
    await this.coordinator.dispose()
    ServiceFactory.instance = null
  }
}

/**
 * ServiceFactory専用エラークラス（互換性用）
 * @deprecated ServiceFactoryCoordinatorError を使用してください
 */
export class ServiceFactoryError extends Error {
  public readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'ServiceFactoryError'
    this.originalError = originalError
  }
}

/**
 * シングルトンアクセス用のファクトリインスタンス取得
 * @deprecated createServiceFactoryCoordinator() を使用してください
 */
export async function createServiceFactory(config: FactoryConfig = {}): Promise<ServiceFactory> {
  const factory = new ServiceFactory()
  await factory.initialize(config)
  return factory
}

/**
 * 既存のファクトリインスタンスを取得（初期化済みの場合のみ）
 * @deprecated ServiceFactoryCoordinator を直接使用してください
 */
export function getServiceFactory(): ServiceFactory | null {
  const instance = ServiceFactory['instance']
  return instance || null
}