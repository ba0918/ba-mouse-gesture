/**
 * CustomGestureManagementUseCase
 * カスタムジェスチャー管理のビジネスロジックを統合するUseCaseクラス
 */

import { CustomGesture, type GestureAction } from '../../domain/entities'
import { GesturePattern } from '../../domain/valueObjects'
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger'

// Repository interfaces
interface GestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>
  addCustomGesture(gesture: CustomGesture): Promise<void>
  updateCustomGesture(gestureId: string, updates: Record<string, unknown>): Promise<CustomGesture>
  deleteCustomGesture(gestureId: string): Promise<CustomGesture[]>
  toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture>
}



interface GestureCreationData {
  name: string
  pattern: string[]
  action: GestureAction
  description?: string
}

export class CustomGestureManagementUseCase {
  private isInitialized: boolean = false
  private logger: DebugLogger

  constructor(
    private gestureRepository: GestureRepository,
    logger?: DebugLogger
  ) {
    this.logger = logger || new DebugLogger(null)
  }

  /**
   * UseCaseの初期化
   */
  initialize(): void {
    try {
      this.isInitialized = true
    } catch (error) {
      throw new CustomGestureManagementError('Failed to initialize custom gesture use case', error as Error)
    }
  }

  /**
   * すべてのカスタムジェスチャーを取得
   */
  async getAllCustomGestures(): Promise<CustomGesture[]> {
    try {
      return await this.gestureRepository.getCustomGestures()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get all custom gestures', error as Error)
    }
  }

  /**
   * 有効なカスタムジェスチャーのみを取得
   */
  async getEnabledCustomGestures(): Promise<CustomGesture[]> {
    try {
      const allGestures = await this.gestureRepository.getCustomGestures()
      return allGestures.filter(gesture => gesture.enabled)
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get enabled custom gestures', error as Error)
    }
  }

  /**
   * 特定のカスタムジェスチャーを取得
   */
  async getCustomGesture(gestureId: string): Promise<CustomGesture> {
    try {
      const allGestures = await this.gestureRepository.getCustomGestures()
      const gesture = allGestures.find(g => g.id === gestureId)
      
      if (!gesture) {
        throw new Error(`カスタムジェスチャーが見つかりません: ${gestureId}`)
      }
      
      return gesture
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get custom gesture', error as Error)
    }
  }


  /**
   * 方向配列からカスタムジェスチャーを作成（UI向け）
   */
  async addCustomGesture({ name, pattern, action, description = '' }: GestureCreationData): Promise<CustomGesture> {
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      // 入力値の検証
      if (!name || typeof name !== 'string') {
        throw new Error('Gesture name is required and must be string')
      }
      if (!Array.isArray(pattern) || pattern.length === 0) {
        throw new Error('Pattern must be a non-empty array')
      }
      if (!action) {
        throw new Error('Action is required')
      }


      // 方向配列をGesturePatternに変換
      let gesturePattern: GesturePattern
      try {
        gesturePattern = GesturePattern.fromArray(pattern as any)
      } catch (patternError) {
        this.logger.error('Failed to create GesturePattern:', patternError)
        throw new Error(`Failed to create gesture pattern: ${(patternError as Error).message}`)
      }

      if (!gesturePattern || gesturePattern.isEmpty()) {
        throw new Error('Invalid gesture pattern. Pattern cannot be empty')
      }

      if (!gesturePattern.isValid()) {
        throw new Error('Invalid gesture pattern. Pattern validation failed')
      }


      // カスタムジェスチャーエンティティを作成
      const gestureId = this.generateGestureId(name)
      const customGesture = new CustomGesture(gestureId, name, gesturePattern, action, true, 1)

      // 保存
      await this.gestureRepository.addCustomGesture(customGesture)

      return customGesture

    } catch (error) {
      this.logger.error('CustomGestureManagementUseCase.addCustomGesture: Error details:', error)
      this.logger.error('CustomGestureManagementUseCase.addCustomGesture: Stack trace:', (error as Error).stack)
      this.logger.error('CustomGestureManagementUseCase.addCustomGesture: Input data:', { name, pattern, action, description })
      throw new CustomGestureManagementError(`Failed to add custom gesture: ${(error as Error).message}`, error as Error)
    }
  }

  /**
   * カスタムジェスチャーを更新
   */
  async updateCustomGesture(gestureId: string, updates: Record<string, unknown>): Promise<CustomGesture> {
    try {


      // 更新実行
      const updatedGesture = await this.gestureRepository.updateCustomGesture(gestureId, updates)

      return updatedGesture

    } catch (error) {
      throw new CustomGestureManagementError('Failed to update custom gesture', error as Error)
    }
  }

  /**
   * カスタムジェスチャーを削除
   */
  async deleteCustomGesture(gestureId: string): Promise<CustomGesture[]> {
    try {
      // 削除実行
      const remainingGestures = await this.gestureRepository.deleteCustomGesture(gestureId)

      return remainingGestures

    } catch (error) {
      this.logger.debug('deleteCustomGesture failed:', error)
      throw new CustomGestureManagementError('Failed to delete custom gesture', error as Error)
    }
  }

  /**
   * カスタムジェスチャーの有効/無効を切り替え
   */
  async toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture> {
    try {
      return await this.gestureRepository.toggleCustomGesture(gestureId, enabled)
    } catch (error) {
      throw new CustomGestureManagementError('Failed to toggle custom gesture', error as Error)
    }
  }





  // ========================================
  // Private methods
  // ========================================



  private generateGestureId(name: string): string {
    const timestamp = Date.now()
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)
    return `custom_${sanitized}_${timestamp}`
  }

}

/**
 * カスタムジェスチャー管理専用エラークラス
 */
export class CustomGestureManagementError extends Error {
  readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'CustomGestureManagementError'
    this.originalError = originalError
  }
}