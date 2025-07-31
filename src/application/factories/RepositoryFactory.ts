/**
 * RepositoryFactory
 * Repository層のサービス初期化・管理を担当
 * Abstract Factory Patternの具象ファクトリー
 */

import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository'
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository'
import type { InfrastructureServices } from './InfrastructureFactory'

export interface RepositoryServices {
  settingsRepository: SettingsRepository
  gestureRepository: GestureRepository
}

/**
 * Repository層専用ファクトリー
 */
export class RepositoryFactory {
  private services: RepositoryServices | null = null

  /**
   * Repository層サービスを初期化
   */
  createServices(infrastructureServices: InfrastructureServices): RepositoryServices {
    if (this.services) {
      return this.services
    }

    this.services = {
      settingsRepository: this.createSettingsRepository(infrastructureServices),
      gestureRepository: this.createGestureRepository(infrastructureServices)
    }

    return this.services
  }

  /**
   * SettingsRepositoryを作成
   */
  private createSettingsRepository(infrastructureServices: InfrastructureServices): SettingsRepository {
    return new SettingsRepository(infrastructureServices.chromeStorage)
  }

  /**
   * GestureRepositoryを作成
   */
  private createGestureRepository(infrastructureServices: InfrastructureServices): GestureRepository {
    return new GestureRepository(infrastructureServices.chromeStorage)
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