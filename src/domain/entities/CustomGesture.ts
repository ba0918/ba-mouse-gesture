import { Gesture, GestureAction } from './Gesture'
import { GesturePattern } from '../valueObjects/GesturePattern'

/**
 * 使用統計の型定義
 */
export interface UsageStats {
  totalCount: number
  successCount: number
  lastUsed: string | null
}

/**
 * メタデータの型定義
 */
export interface CustomGestureMetadata {
  isCustom: boolean
  version: string
}

/**
 * CustomGesture エンティティ
 * ユーザー定義カスタムジェスチャーを表現するドメインエンティティ
 */
export class CustomGesture extends Gesture {
  public priority: number
  public usage: UsageStats
  public metadata: CustomGestureMetadata

  /**
   * @param id - 一意ID
   * @param name - ユーザー定義名
   * @param pattern - ジェスチャーパターン
   * @param action - 実行アクション
   * @param enabled - 有効/無効状態
   * @param priority - 優先度（高いほど優先）
   */
  constructor(
    id: string, 
    name: string, 
    pattern: GesturePattern, 
    action: GestureAction, 
    enabled: boolean = true, 
    priority: number = 1
  ) {
    super(id, name, pattern, action, enabled)
    this.priority = priority
    this.usage = {
      totalCount: 0,
      successCount: 0,
      lastUsed: null
    }
    this.metadata = {
      isCustom: true,
      version: '1.0.0'
    }
  }

  /**
   * カスタムジェスチャーかどうか判定（常にtrue）
   * @returns 常にtrue
   */
  isCustomGesture(): boolean {
    return true
  }

  /**
   * 優先度を設定
   * @param priority - 優先度（1-10）
   */
  setPriority(priority: number): void {
    if (priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10')
    }
    this.priority = priority
  }

  /**
   * 使用統計を記録
   * @param success - 実行成功
   */
  recordUsage(success: boolean): void {
    this.usage.totalCount++
    if (success) {
      this.usage.successCount++
    }
    this.usage.lastUsed = new Date().toISOString()
  }

  /**
   * 成功率を取得
   * @returns 0-1の範囲の成功率
   */
  getSuccessRate(): number {
    if (this.usage.totalCount === 0) return 0
    return this.usage.successCount / this.usage.totalCount
  }

  /**
   * よく使われるジェスチャーかどうか判定
   * @returns よく使われる場合true
   */
  isFrequentlyUsed(): boolean {
    return this.usage.totalCount >= 10 && this.getSuccessRate() >= 0.8
  }

  /**
   * パターンの複雑さに基づく信頼度を計算
   * @returns 0-1の範囲の信頼度
   */
  getConfidence(): number {
    const baseConfidence = 0.5
    const complexityBonus = Math.min(0.3, this.getComplexity() * 0.05)
    const usageBonus = Math.min(0.2, this.getSuccessRate() * 0.2)
    
    return Math.min(1.0, baseConfidence + complexityBonus + usageBonus)
  }

  /**
   * カスタムジェスチャーの不変条件をチェック
   * @returns 有効な場合true
   */
  override isValid(): boolean {
    const superValid = super.isValid()
    const priorityValid = this.priority >= 1 && this.priority <= 10
    const metadataValid = this.metadata.isCustom === true
    
    return superValid && priorityValid && metadataValid
  }

  /**
   * 他のカスタムジェスチャーと比較（優先度ベース）
   * @param other - 比較対象
   * @returns -1: this > other, 0: equal, 1: this < other
   */
  comparePriority(other: CustomGesture): number {
    if (this.priority > other.priority) return -1
    if (this.priority < other.priority) return 1
    
    // 優先度が同じ場合は使用頻度で比較
    const thisScore = this.usage.totalCount * this.getSuccessRate()
    const otherScore = other.usage.totalCount * other.getSuccessRate()
    
    if (thisScore > otherScore) return -1
    if (thisScore < otherScore) return 1
    return 0
  }

  /**
   * エンティティの複製
   * @returns 複製されたカスタムジェスチャー
   */
  override clone(): CustomGesture {
    const cloned = new CustomGesture(
      this.id,
      this.name,
      this.pattern.clone(),
      this.action,
      this.enabled,
      this.priority
    )
    cloned.usage = { ...this.usage }
    cloned.metadata = { ...this.metadata }
    cloned.createdAt = this.createdAt
    return cloned
  }

  /**
   * シリアライズ（永続化用）
   * @returns シリアライズされたデータ
   */
  override toJSON(): {
    id: string
    name: string
    pattern: string[]
    action: GestureAction
    enabled: boolean
    createdAt: string
    priority: number
    usage: UsageStats
    metadata: CustomGestureMetadata
  } {
    return {
      ...super.toJSON(),
      priority: this.priority,
      usage: this.usage,
      metadata: this.metadata
    }
  }

  /**
   * デシリアライズ（復元用）
   * @param data - シリアライズされたデータ
   * @returns 復元されたカスタムジェスチャー
   */
  static override fromJSON(data: any): CustomGesture {
    try {
      // データ形式のバリデーション
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format: data must be an object')
      }
      
      // 必須フィールドのチェック
      if (!data.id || !data.name || !data.action) {
        throw new Error('Invalid data format: missing required fields (id, name, action)')
      }
      
      // パターンのデシリアライゼーション（エラー処理付き）
      let pattern: GesturePattern
      try {
        pattern = GesturePattern.fromArray(data.pattern)
      } catch (patternError) {
        console.warn('CustomGesture.fromJSON: Failed to deserialize pattern, using empty pattern:', patternError)
        pattern = GesturePattern.empty()
      }
      
      // デフォルト値の設定
      const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true
      const priority = (typeof data.priority === 'number' && data.priority >= 1 && data.priority <= 10) 
        ? data.priority 
        : 1
      
      const gesture = new CustomGesture(
        data.id, 
        data.name, 
        pattern, 
        data.action as GestureAction, 
        enabled, 
        priority
      )
      
      // オプショナルフィールドの設定
      gesture.usage = data.usage || { totalCount: 0, successCount: 0, lastUsed: null }
      gesture.metadata = data.metadata || { isCustom: true, version: '1.0.0' }
      gesture.createdAt = data.createdAt || new Date().toISOString()
      
      return gesture
    } catch (error) {
      console.error('CustomGesture.fromJSON: Failed to deserialize custom gesture:', error, data)
      
      // フォールバック: 最小限の有効なカスタムジェスチャーを作成
      return new CustomGesture(
        data?.id || `fallback_${Date.now()}`,
        data?.name || 'Invalid Gesture',
        GesturePattern.empty(),
        (data?.action as GestureAction) || 'back',
        false // 無効状態で作成
      )
    }
  }
}