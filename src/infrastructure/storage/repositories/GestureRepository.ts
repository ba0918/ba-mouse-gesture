/**
 * GestureRepository
 * ジェスチャーデータ（カスタムジェスチャー・学習データ）の永続化を担当するリポジトリ
 */

import { CustomGesture } from '../../../domain/entities/CustomGesture'
import type { ChromeStorageAdapter } from '../../adapters/ChromeStorageAdapter'

// Type definitions
interface CacheEntry {
  data: any
  timestamp: number
}

interface LearningData {
  [gestureId: string]: {
    lastUpdated?: string
    [key: string]: any
  }
}

interface UsageStats {
  id: string
  name: string
  totalUsage: number
  successRate: number
  enabled: boolean
}

interface PerformanceStats {
  totalCustomGestures: number
  enabledGestures: number
  totalUsage: number
  averageSuccessRate: number
  topPerformers: UsageStats[]
  learningDataSize: number
}

interface OptimizationResult {
  beforeSize: number
  afterSize: number
  optimizations: string[]
  error?: string
}

interface BackupData {
  timestamp: string
  version: string
  customGestures: any[]
  learningData: LearningData
}

interface RepositoryStatus {
  isHealthy: boolean
  customGesturesCount?: number
  learningDataEntries?: number
  cacheSize?: number
  storage?: any
  error?: string
}

type GestureChangeCallback = (changes: any) => void

export class GestureRepository {
  private readonly storage: ChromeStorageAdapter
  private readonly customGesturesKey: string = 'customGestures'
  private readonly learningDataKey: string = 'gestureLearningData'
  private readonly cache: Map<string, CacheEntry> = new Map()
  private readonly cacheTimeout: number = 3000 // 3秒でキャッシュ無効化

  constructor(storage: ChromeStorageAdapter) {
    this.storage = storage
  }

  /**
   * カスタムジェスチャーを全て取得
   */
  async getCustomGestures(): Promise<CustomGesture[]> {
    // キャッシュチェック
    const cachedData = this.cache.get(this.customGesturesKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.data
    }

    try {
      const result = await this.storage.get(this.customGesturesKey)
      const gesturesData = result[this.customGesturesKey] || []

      const gestures = gesturesData.map((data: any) => this.deserializeCustomGesture(data))

      // キャッシュに保存
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now()
      })

      return gestures
    } catch (error) {
      console.error('Failed to load custom gestures:', error)
      return []
    }
  }

  /**
   * カスタムジェスチャーを保存
   * @param gestures - カスタムジェスチャー配列
   */
  async saveCustomGestures(gestures: CustomGesture[]): Promise<void> {
    try {
      // バリデーション
      if (!Array.isArray(gestures)) {
        throw new Error('Gestures must be an array')
      }

      for (const gesture of gestures) {
        // バリデーション実行
        
        if (!gesture) {
          console.error('❌ Gesture is null/undefined')
          throw new Error('Invalid gesture: gesture is null/undefined')
        }
        
        if (typeof gesture.isValid !== 'function') {
          console.error('❌ Gesture does not have isValid method:', typeof gesture.isValid)
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - no isValid method`)
        }
        
        const isValidResult = gesture.isValid()
        
        if (!isValidResult) {
          console.error('❌ Gesture.isValid() returned false for:', gesture?.id)
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - isValid() returned false`)
        }
      }

      const serializedData = gestures.map(gesture => this.serializeCustomGesture(gesture))
      await this.storage.set({ [this.customGesturesKey]: serializedData })

      // キャッシュ更新
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to save custom gestures:', error)
      throw new GestureRepositoryError('Failed to save custom gestures', error)
    }
  }

  /**
   * カスタムジェスチャーを追加
   * @param gesture - 追加するジェスチャー
   */
  async addCustomGesture(gesture: CustomGesture): Promise<void> {
    
    const gestures = await this.getCustomGestures()

    // 重複チェック
    const existingGesture = gestures.find(g => g.id === gesture.id || g.name === gesture.name)
    
    if (existingGesture) {
      const errorMessage = `Gesture with id '${gesture.id}' or name '${gesture.name}' already exists`
      console.error('🔧 [Debug] Duplicate gesture error:', errorMessage)
      throw new Error(errorMessage)
    }

    gestures.push(gesture)
    
    await this.saveCustomGestures(gestures)
  }

  /**
   * カスタムジェスチャーを更新
   * @param gestureId - ジェスチャーID
   * @param updates - 更新データ
   */
  async updateCustomGesture(gestureId: string, updates: Partial<CustomGesture>): Promise<CustomGesture> {
    const gestures = await this.getCustomGestures()
    const gestureIndex = gestures.findIndex(g => g.id === gestureId)

    if (gestureIndex === -1) {
      throw new Error(`Gesture with id '${gestureId}' not found`)
    }

    const gesture = gestures[gestureIndex]

    // 更新の適用
    Object.keys(updates).forEach(key => {
      if (key in gesture && key !== 'id') { // IDは変更不可
        (gesture as any)[key] = updates[key as keyof CustomGesture]
      }
    })

    await this.saveCustomGestures(gestures)
    return gesture
  }

  /**
   * カスタムジェスチャーを削除
   * @param gestureId - ジェスチャーID
   */
  async deleteCustomGesture(gestureId: string): Promise<CustomGesture[]> {
    
    const gestures = await this.getCustomGestures()
    
    const filteredGestures = gestures.filter(g => g.id !== gestureId)

    if (filteredGestures.length === gestures.length) {
      const errorMessage = `Gesture with id '${gestureId}' not found`
      console.error('🔧 [Debug] Delete failed - gesture not found:', errorMessage)
      throw new Error(errorMessage)
    }

    await this.saveCustomGestures(filteredGestures)
    
    return filteredGestures
  }

  /**
   * カスタムジェスチャーの有効/無効を切り替え
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   */
  async toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture> {
    return await this.updateCustomGesture(gestureId, { enabled })
  }

  /**
   * ジェスチャー使用統計を記録
   * @param gestureId - ジェスチャーID
   * @param success - 実行成功
   */
  async recordGestureUsage(gestureId: string, success: boolean): Promise<void> {
    const gestures = await this.getCustomGestures()
    const gesture = gestures.find(g => g.id === gestureId)

    if (gesture) {
      gesture.recordUsage(success)
      await this.saveCustomGestures(gestures)
    }
  }

  /**
   * 学習データを取得
   */
  async getLearningData(): Promise<LearningData> {
    // キャッシュチェック
    const cachedData = this.cache.get(this.learningDataKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.data
    }

    try {
      const result = await this.storage.get(this.learningDataKey)
      const learningData = result[this.learningDataKey] || {}

      // キャッシュに保存
      this.cache.set(this.learningDataKey, {
        data: learningData,
        timestamp: Date.now()
      })

      return learningData
    } catch (error) {
      console.error('Failed to load learning data:', error)
      return {}
    }
  }

  /**
   * 学習データを保存
   * @param learningData - 学習データ
   */
  async saveLearningData(learningData: LearningData): Promise<void> {
    try {
      if (!learningData || typeof learningData !== 'object') {
        throw new Error('Learning data must be an object')
      }

      await this.storage.set({ [this.learningDataKey]: learningData })

      // キャッシュ更新
      this.cache.set(this.learningDataKey, {
        data: learningData,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to save learning data:', error)
      throw new GestureRepositoryError('Failed to save learning data', error)
    }
  }

  /**
   * 学習データをリセット
   * @param gestureId - 特定ジェスチャーのリセット（省略時は全体）
   */
  async resetLearningData(gestureId: string | null = null): Promise<void> {
    if (gestureId) {
      const learningData = await this.getLearningData()
      delete learningData[gestureId]
      await this.saveLearningData(learningData)
    } else {
      await this.saveLearningData({})
    }
  }

  /**
   * ジェスチャーパフォーマンス統計を取得
   */
  async getPerformanceStats(): Promise<Record<string, unknown>> {
    const customGestures = await this.getCustomGestures()
    const learningData = await this.getLearningData()

    const stats: PerformanceStats = {
      totalCustomGestures: customGestures.length,
      enabledGestures: customGestures.filter(g => g.enabled).length,
      totalUsage: 0,
      averageSuccessRate: 0,
      topPerformers: [],
      learningDataSize: Object.keys(learningData).length
    }

    // 使用統計の計算
    const usageStats: UsageStats[] = customGestures.map(gesture => ({
      id: gesture.id,
      name: gesture.name,
      totalUsage: gesture.usage.totalCount,
      successRate: gesture.getSuccessRate(),
      enabled: gesture.enabled
    }))

    stats.totalUsage = usageStats.reduce((sum, stat) => sum + stat.totalUsage, 0)

    const enabledStats = usageStats.filter(stat => stat.enabled && stat.totalUsage > 0)
    if (enabledStats.length > 0) {
      stats.averageSuccessRate = enabledStats.reduce((sum, stat) =>
        sum + stat.successRate, 0) / enabledStats.length
    }

    // トップパフォーマーの特定
    stats.topPerformers = usageStats
      .filter(stat => stat.totalUsage >= 5) // 十分な使用回数がある
      .sort((a, b) => (b.successRate * b.totalUsage) - (a.successRate * a.totalUsage))
      .slice(0, 5)

    return stats as Record<string, unknown>
  }

  /**
   * データ容量の最適化
   */
  async optimizeStorage(): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      beforeSize: 0,
      afterSize: 0,
      optimizations: []
    }

    try {
      // 現在のサイズを測定
      result.beforeSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
        this.learningDataKey
      ])

      // カスタムジェスチャーの最適化
      const gestures = await this.getCustomGestures()
      const optimizedGestures = gestures.filter(gesture => {
        // 使用されていないジェスチャーを除去（長期間未使用）
        if (!gesture.enabled && gesture.usage.totalCount === 0) {
          result.optimizations.push(`Removed unused gesture: ${gesture.name}`)
          return false
        }
        return true
      })

      if (optimizedGestures.length !== gestures.length) {
        await this.saveCustomGestures(optimizedGestures)
      }

      // 学習データの最適化
      const learningData = await this.getLearningData()
      const optimizedLearningData: LearningData = {}

      Object.keys(learningData).forEach(gestureId => {
        const data = learningData[gestureId]
        // 古いデータの除去（30日以上前）
        if (data.lastUpdated) {
          const daysSinceUpdate = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceUpdate <= 30) {
            optimizedLearningData[gestureId] = data
          } else {
            result.optimizations.push(`Removed old learning data: ${gestureId}`)
          }
        } else {
          optimizedLearningData[gestureId] = data
        }
      })

      if (Object.keys(optimizedLearningData).length !== Object.keys(learningData).length) {
        await this.saveLearningData(optimizedLearningData)
      }

      // 最適化後のサイズを測定
      result.afterSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
        this.learningDataKey
      ])

    } catch (error) {
      result.error = (error as Error).message
    }

    return result
  }

  /**
   * データのバックアップを作成
   */
  async createBackup(): Promise<BackupData> {
    const customGestures = await this.getCustomGestures()
    const learningData = await this.getLearningData()

    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      customGestures: customGestures.map(g => this.serializeCustomGesture(g)),
      learningData: learningData
    }
  }

  /**
   * バックアップからデータを復元
   * @param backup - バックアップデータ
   */
  async restoreFromBackup(backup: BackupData): Promise<void> {
    if (!backup.customGestures && !backup.learningData) {
      throw new Error('Invalid backup data')
    }

    if (backup.customGestures) {
      const gestures = backup.customGestures.map((data: any) =>
        this.deserializeCustomGesture(data))
      await this.saveCustomGestures(gestures)
    }

    if (backup.learningData) {
      await this.saveLearningData(backup.learningData)
    }
  }

  /**
   * ジェスチャー変更を監視
   * @param callback - 変更時コールバック
   * @returns リスナー削除関数
   */
  onGesturesChanged(callback: GestureChangeCallback): () => void {
    return this.storage.addChangeListener((changes, namespace) => {
      if (namespace === 'sync') {
        let changed = false

        if (this.customGesturesKey in changes) {
          this.cache.delete(this.customGesturesKey)
          changed = true
        }

        if (this.learningDataKey in changes) {
          this.cache.delete(this.learningDataKey)
          changed = true
        }

        if (changed) {
          callback(changes)
        }
      }
    })
  }

  /**
   * カスタムジェスチャーをシリアライズ
   */
  private serializeCustomGesture(gesture: CustomGesture): any {
    return gesture.toJSON()
  }

  /**
   * カスタムジェスチャーをデシリアライズ
   */
  private deserializeCustomGesture(data: any): CustomGesture {
    return CustomGesture.fromJSON(data)
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * リポジトリの状態確認
   */
  async getRepositoryStatus(): Promise<RepositoryStatus> {
    try {
      const customGestures = await this.getCustomGestures()
      const learningData = await this.getLearningData()
      // ChromeStorageAdapterにはgetUsageStatsメソッドがないため、getBytesInUseを使用
      const storageUsage = await this.storage.getBytesInUse()

      return {
        isHealthy: true,
        customGesturesCount: customGestures.length,
        learningDataEntries: Object.keys(learningData).length,
        cacheSize: this.cache.size,
        storage: { bytesInUse: storageUsage }
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: (error as Error).message,
        cacheSize: this.cache.size
      }
    }
  }
}

/**
 * GestureRepository専用エラークラス
 */
export class GestureRepositoryError extends Error {
  readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message)
    this.name = 'GestureRepositoryError'
    this.originalError = originalError
  }
}

