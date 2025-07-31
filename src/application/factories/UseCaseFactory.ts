/**
 * UseCaseFactory
 * UseCase層のサービス初期化・管理を担当
 * Abstract Factory Patternの具象ファクトリー
 */

import { SettingsManagementUseCase } from '../usecases/SettingsManagementUseCase'
import { CustomGestureManagementUseCase } from '../usecases/CustomGestureManagementUseCase'
import type { RepositoryServices } from './RepositoryFactory'

export interface UseCaseServices {
  settingsManagementUseCase: SettingsManagementUseCase
  customGestureManagementUseCase: CustomGestureManagementUseCase
}

/**
 * UseCase層専用ファクトリー
 */
export class UseCaseFactory {
  private services: UseCaseServices | null = null

  /**
   * UseCase層サービスを初期化
   */
  createServices(repositoryServices: RepositoryServices): UseCaseServices {
    if (this.services) {
      return this.services
    }

    this.services = {
      settingsManagementUseCase: this.createSettingsManagementUseCase(repositoryServices),
      customGestureManagementUseCase: this.createCustomGestureManagementUseCase(repositoryServices)
    }

    return this.services
  }

  /**
   * SettingsManagementUseCaseを作成
   */
  private createSettingsManagementUseCase(repositoryServices: RepositoryServices): SettingsManagementUseCase {
    return new SettingsManagementUseCase(
      repositoryServices.settingsRepository as never // 型キャストで互換性確保
    )
  }

  /**
   * CustomGestureManagementUseCaseを作成
   */
  private createCustomGestureManagementUseCase(repositoryServices: RepositoryServices): CustomGestureManagementUseCase {
    return new CustomGestureManagementUseCase(
      repositoryServices.gestureRepository as never, // 型キャストで互換性確保
      repositoryServices.settingsRepository as never
    )
  }

  /**
   * 初期化済みかチェック
   */
  isInitialized(): boolean {
    return this.services !== null
  }

  /**
   * サービスをリセット
   */
  reset(): void {
    this.services = null
  }
}