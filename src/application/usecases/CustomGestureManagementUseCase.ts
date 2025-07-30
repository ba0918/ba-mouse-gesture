/**
 * CustomGestureManagementUseCase
 * カスタムジェスチャー管理のビジネスロジックを統合するUseCaseクラス
 */

import { CustomGesture, type GestureAction } from '../../domain/entities'
import { GesturePattern, Point, Threshold } from '../../domain/valueObjects'
import { PatternMatcher } from '../../domain/services/PatternMatcher'
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger'

// Repository interfaces
interface GestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>
  addCustomGesture(gesture: CustomGesture): Promise<void>
  updateCustomGesture(gestureId: string, updates: Record<string, unknown>): Promise<CustomGesture>
  deleteCustomGesture(gestureId: string): Promise<CustomGesture[]>
  toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture>
  recordGestureUsage(gestureId: string, success: boolean): Promise<void>
  getPerformanceStats(): Promise<Record<string, unknown>>
  createBackup(): Promise<GestureBackupData>
  restoreFromBackup(backup: GestureBackupData): Promise<void>
  optimizeStorage(): Promise<Record<string, unknown>>
}

interface SettingsRepository {
  getSettings(): Promise<SettingsEntity>
}

interface SettingsEntity {
  getThreshold(): Threshold
}

// Types for internal use
interface RawPoint {
  x: number
  y: number
  timestamp?: number
}

interface PatternMatchResult {
  match: CustomGesture | null
  similarity: number
  confidence: number
  message: string
}

interface GestureStatistics {
  performance: Record<string, unknown>
  timestamp: string
}

interface GestureBackupData {
  timestamp: string
  version: string
  customGestures: unknown[]
}

interface GestureCreationData {
  name: string
  pattern: string[]
  action: GestureAction
  description?: string
}

export class CustomGestureManagementUseCase {
  private patternMatcher: PatternMatcher
  private isInitialized: boolean = false
  private logger: DebugLogger

  constructor(
    private gestureRepository: GestureRepository,
    private settingsRepository: SettingsRepository,
    logger?: DebugLogger
  ) {
    this.patternMatcher = new PatternMatcher()
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
   * 新しいカスタムジェスチャーを作成
   */
  async createCustomGesture(name: string, rawPoints: RawPoint[], action: GestureAction): Promise<CustomGesture> {
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      // 入力値の検証
      this.validateGestureCreation(name, rawPoints, action)

      // 重複チェック
      await this.checkDuplicateName(name)

      // 軌跡をPointオブジェクトに変換
      const points = this.convertToPoints(rawPoints)

      // パターンを生成
      const threshold = await this.getThreshold()
      const pattern = GesturePattern.fromPoints(points, threshold)

      if (pattern.isEmpty()) {
        const errorMessage = 'Invalid gesture pattern. Insufficient movement detected'
        this.logger.debug('Pattern validation failed:', errorMessage)
        throw new Error(errorMessage)
      }

      // 既存パターンとの類似度チェック
      await this.checkPatternSimilarity(pattern, name)

      // カスタムジェスチャーエンティティを作成
      const gestureId = this.generateGestureId(name)
      const customGesture = new CustomGesture(gestureId, name, pattern, action, true, 1)

      // 保存
      await this.gestureRepository.addCustomGesture(customGesture)

      return customGesture

    } catch (error) {
      throw new CustomGestureManagementError('Failed to create custom gesture', error as Error)
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

      // 重複チェック
      await this.checkDuplicateName(name)

      // 方向配列をGesturePatternに変換
      let gesturePattern: GesturePattern
      try {
        gesturePattern = GesturePattern.fromArray(pattern)
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

      // 既存パターンとの類似度チェック
      await this.checkPatternSimilarity(gesturePattern, name)

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
      // 更新データの検証
      this.validateGestureUpdate(updates)

      // 名前の重複チェック（名前が変更される場合）
      if (updates.name) {
        await this.checkDuplicateName(updates.name as string, gestureId)
      }

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

  /**
   * パターンマッチングを実行
   */
  async matchPattern(rawPoints: RawPoint[]): Promise<PatternMatchResult> {
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      // 軌跡をPointオブジェクトに変換
      const points = this.convertToPoints(rawPoints)

      // パターンを生成
      const threshold = await this.getThreshold()
      const inputPattern = GesturePattern.fromPoints(points, threshold)

      if (inputPattern.isEmpty()) {
        return {
          match: null,
          similarity: 0,
          confidence: 0,
          message: 'No valid pattern detected'
        }
      }

      // カスタムジェスチャーとマッチング
      const customGestures = await this.getEnabledCustomGestures()
      let bestMatch: CustomGesture | null = null
      let bestSimilarity = 0
      let bestConfidence = 0

      for (const gesture of customGestures) {
        const similarity = this.patternMatcher.calculateSimilarity(inputPattern, gesture.pattern)
        
        if (similarity > bestSimilarity) {
          bestMatch = gesture
          bestSimilarity = similarity
          bestConfidence = similarity
        }
      }

      // マッチング結果
      const matchThreshold = 0.6
      const confidenceThreshold = 0.5

      if (bestSimilarity >= matchThreshold && bestConfidence >= confidenceThreshold) {
        // 使用統計を更新
        if (bestMatch) {
          await this.gestureRepository.recordGestureUsage(bestMatch.id, true)
        }

        return {
          match: bestMatch,
          similarity: bestSimilarity,
          confidence: bestConfidence,
          message: 'Pattern matched successfully'
        }
      } else {
        return {
          match: null,
          similarity: bestSimilarity,
          confidence: bestConfidence,
          message: 'No confident match found'
        }
      }

    } catch (error) {
      throw new CustomGestureManagementError('Failed to match pattern', error as Error)
    }
  }

  /**
   * カスタムジェスチャーの統計情報を取得
   */
  async getGestureStatistics(): Promise<GestureStatistics> {
    try {
      const performanceStats = await this.gestureRepository.getPerformanceStats()
      
      return {
        performance: performanceStats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get gesture statistics', error as Error)
    }
  }

  /**
   * カスタムジェスチャーのデータをエクスポート
   */
  async exportCustomGestures(): Promise<GestureBackupData> {
    try {
      return await this.gestureRepository.createBackup()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to export custom gestures', error as Error)
    }
  }

  /**
   * カスタムジェスチャーのデータをインポート
   */
  async importCustomGestures(backup: GestureBackupData): Promise<void> {
    try {
      // バックアップデータの検証
      this.validateBackupData(backup)

      // インポート実行
      await this.gestureRepository.restoreFromBackup(backup)

    } catch (error) {
      throw new CustomGestureManagementError('Failed to import custom gestures', error as Error)
    }
  }

  /**
   * ストレージ最適化を実行
   */
  async optimizeStorage(): Promise<Record<string, unknown>> {
    try {
      return await this.gestureRepository.optimizeStorage()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to optimize storage', error as Error)
    }
  }

  // ========================================
  // 旧CustomGestureUseCase互換メソッド（統合後）
  // ========================================

  /**
   * カスタムジェスチャーを取得（旧CustomGestureUseCaseインターフェース互換）
   */
  async getCustomGestures(): Promise<Record<string, unknown>[]> {
    try {
      const customGestures = await this.getAllCustomGestures()
      return customGestures.map(gesture => gesture.toJSON ? gesture.toJSON() : gesture as unknown as Record<string, unknown>)
    } catch (error) {
      this.logger.error('CustomGestureManagementUseCase: Failed to load custom gestures:', error)
      return []
    }
  }

  /**
   * カスタムジェスチャーを保存（旧CustomGestureUseCaseインターフェース互換）
   */
  async saveCustomGestures(customGestures: Record<string, unknown>[]): Promise<Record<string, unknown>[]> {
    try {
      // 既存の全カスタムジェスチャーを削除
      const existingGestures = await this.getAllCustomGestures()
      for (const gesture of existingGestures) {
        await this.deleteCustomGesture(gesture.id)
      }

      // 新しいジェスチャーを追加
      const savedGestures: Record<string, unknown>[] = []
      for (const gestureData of customGestures) {
        try {
          const savedGesture = await this.addCustomGesture({
            name: gestureData.name as string,
            pattern: gestureData.pattern as string[],
            action: gestureData.action as GestureAction,
            description: (gestureData.description as string) || ''
          })
          savedGestures.push(savedGesture.toJSON ? savedGesture.toJSON() : savedGesture as unknown as Record<string, unknown>)
        } catch (gestureError) {
          this.logger.warn('Failed to save individual gesture:', gestureData.name, gestureError)
        }
      }

      return savedGestures

    } catch (error) {
      this.logger.error('CustomGestureManagementUseCase: Failed to save custom gestures:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーを削除/リセット（旧CustomGestureUseCaseインターフェース互換）
   */
  async resetCustomGestures(): Promise<Record<string, unknown>[]> {
    try {
      // 全カスタムジェスチャーを削除
      const existingGestures = await this.getAllCustomGestures()
      for (const gesture of existingGestures) {
        await this.deleteCustomGesture(gesture.id)
      }

      return []

    } catch (error) {
      this.logger.error('CustomGestureManagementUseCase: Failed to reset custom gestures:', error)
      throw error
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
   */
  chromeStorageGet(keys: string | string[]): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }

  /**
   * Chrome Storage APIの統一インターフェース
   */
  chromeStorageSet(data: Record<string, unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }

  // ========================================
  // Private methods
  // ========================================

  private validateGestureCreation(name: string, rawPoints: RawPoint[], action: GestureAction): void {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Gesture name is required')
    }
    
    if (name.length > 50) {
      throw new Error('Gesture name too long (max 50 characters)')
    }

    if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
      throw new Error('Insufficient points for gesture creation')
    }

    if (!action) {
      throw new Error('Action is required')
    }

    // アクションの形式チェック
    const validActions = [
      'back', 'forward', 'refresh',
      'browser_back', 'browser_forward',
      'new_tab', 'close_tab', 'duplicate_tab',
      'prev_tab', 'next_tab', 'super_refresh',
      'scroll_up', 'scroll_down',
      'scroll_top', 'scroll_bottom',
      'url:', 'script:'
    ]
    const isValidAction = validActions.some(valid => action === valid || action.startsWith(valid))
    
    if (!isValidAction) {
      throw new Error(`Invalid action format: ${action}. Valid actions: ${validActions.filter(a => !a.includes(':')).join(', ')}`)
    }
  }

  private validateGestureUpdate(updates: Record<string, unknown>): void {
    if (updates.name !== undefined) {
      if (!updates.name || typeof updates.name !== 'string' || (updates.name as string).trim().length === 0) {
        throw new Error('Invalid gesture name')
      }
      if ((updates.name as string).length > 50) {
        throw new Error('Gesture name too long (max 50 characters)')
      }
    }

    if (updates.action !== undefined) {
      if (!updates.action) {
        throw new Error('Invalid action')
      }
    }

    if (updates.enabled !== undefined) {
      if (typeof updates.enabled !== 'boolean') {
        throw new Error('Invalid enabled value')
      }
    }
  }

  private async checkDuplicateName(name: string, excludeId: string | null = null): Promise<void> {
    const existingGestures = await this.gestureRepository.getCustomGestures()
    
    const duplicate = existingGestures.find(g => 
      g.name.toLowerCase() === name.toLowerCase() && g.id !== excludeId
    )
    
    if (duplicate) {
      const errorMessage = `Gesture name "${name}" already exists`
      this.logger.debug('Duplicate name error:', errorMessage)
      throw new Error(errorMessage)
    }
  }

  private async checkPatternSimilarity(pattern: GesturePattern, name: string): Promise<void> {
    const existingGestures = await this.gestureRepository.getCustomGestures()
    const similarityThreshold = 0.9
    
    for (const existing of existingGestures) {
      const similarity = this.patternMatcher.calculateSimilarity(pattern, existing.pattern)
      if (similarity >= similarityThreshold) {
        throw new Error(`Pattern too similar to existing gesture "${existing.name}" (${Math.round(similarity * 100)}% similarity)`)
      }
    }
  }

  private convertToPoints(rawPoints: RawPoint[]): Point[] {
    return rawPoints.map(point => new Point(point.x, point.y, point.timestamp))
  }

  private async getThreshold(): Promise<Threshold> {
    const settings = await this.settingsRepository.getSettings()
    return settings.getThreshold()
  }

  private generateGestureId(name: string): string {
    const timestamp = Date.now()
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)
    return `custom_${sanitized}_${timestamp}`
  }

  private validateBackupData(backup: GestureBackupData): void {
    if (!backup || !backup.customGestures) {
      throw new Error('Invalid backup data. Missing custom gestures')
    }
    
    if (!backup.timestamp || !backup.version) {
      throw new Error('Invalid backup data. Missing metadata')
    }

    if (!Array.isArray(backup.customGestures)) {
      throw new Error('Invalid backup data. Custom gestures must be array')
    }
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