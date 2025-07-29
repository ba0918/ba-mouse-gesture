import { GesturePattern } from '../valueObjects/GesturePattern'
import { Threshold } from '../valueObjects/Threshold'

/**
 * アクションの型定義
 */
export type GestureAction = 
  | 'back' 
  | 'forward' 
  | 'scroll_up' 
  | 'scroll_down' 
  | 'close_tab' 
  | 'new_tab' 
  | 'refresh' 
  | 'duplicate_tab'
  | 'super_refresh'
  | 'prev_tab'
  | 'next_tab'

/**
 * Gesture エンティティ
 * ジェスチャーの基本概念を表現するドメインエンティティ
 */
export class Gesture {
  public id: string
  public name: string
  public pattern: GesturePattern
  public action: GestureAction
  public enabled: boolean
  public createdAt: string

  /**
   * @param id - ジェスチャーID
   * @param name - ジェスチャー名（表示用）
   * @param pattern - ジェスチャーパターン
   * @param action - 実行アクション
   * @param enabled - 有効/無効状態
   */
  constructor(id: string, name: string, pattern: GesturePattern, action: GestureAction, enabled: boolean = true) {
    this.id = id
    this.name = name
    this.pattern = pattern
    this.action = action
    this.enabled = enabled
    this.createdAt = new Date().toISOString()
  }

  /**
   * ジェスチャーが有効かチェック
   * @returns 有効な場合true
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * ジェスチャーを有効/無効切り替え
   * @param enabled - 有効/無効
   */
  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled)
  }

  /**
   * パターンマッチングを実行
   * @param inputPattern - 入力パターン
   * @param threshold - マッチング閾値
   * @returns マッチする場合true
   */
  matches(inputPattern: GesturePattern, threshold: Threshold): boolean {
    return this.pattern.matches(inputPattern, threshold)
  }

  /**
   * 基本ジェスチャーかどうか判定
   * @returns 基本ジェスチャーの場合true
   */
  isBasicGesture(): boolean {
    const basicGestures = ['left', 'right', 'up', 'down']
    return basicGestures.includes(this.id)
  }

  /**
   * 複合ジェスチャーかどうか判定  
   * @returns 複合ジェスチャーの場合true
   */
  isComplexGesture(): boolean {
    return !this.isBasicGesture()
  }

  /**
   * ジェスチャーの方向数取得
   * @returns 方向数
   */
  getComplexity(): number {
    return this.pattern.getLength()
  }

  /**
   * 表示用にフォーマットされたパターンを取得
   * @returns フォーマット済みパターン
   */
  getFormattedPattern(): string {
    return this.pattern.toString()
  }

  /**
   * アクションの表示名を取得
   * @returns アクション表示名
   */
  getActionDisplayName(): string {
    const actionNames: Record<GestureAction, string> = {
      back: 'ブラウザの戻る',
      forward: 'ブラウザの進む',
      scroll_up: 'ページ最上部スクロール',
      scroll_down: 'ページ最下部スクロール',
      close_tab: 'タブを閉じる',
      new_tab: '新しいタブを開く',
      refresh: 'ページ更新',
      duplicate_tab: 'タブ複製',
      super_refresh: 'スーパーリロード（キャッシュクリア付き）',
      prev_tab: '前のタブに切り替え',
      next_tab: '次のタブに切り替え'
    }
    return actionNames[this.action] || this.action
  }

  /**
   * エンティティの不変条件をチェック
   * @returns 有効な場合true
   */
  isValid(): boolean {
    const hasId = Boolean(this.id)
    const hasName = Boolean(this.name)
    const hasPattern = Boolean(this.pattern)
    const hasAction = Boolean(this.action)
    const patternIsValid = this.pattern ? this.pattern.isValid() : false
    
    return Boolean(
      hasId && 
      hasName && 
      hasPattern && 
      hasAction &&
      patternIsValid
    )
  }

  /**
   * エンティティの複製
   * @returns 複製されたジェスチャー
   */
  clone(): Gesture {
    return new Gesture(
      this.id,
      this.name,
      this.pattern.clone(),
      this.action,
      this.enabled
    )
  }

  /**
   * シリアライズ（永続化用）
   * @returns シリアライズされたデータ
   */
  toJSON(): {
    id: string
    name: string
    pattern: string[]
    action: GestureAction
    enabled: boolean
    createdAt: string
  } {
    return {
      id: this.id,
      name: this.name,
      pattern: this.pattern.toArray(),
      action: this.action,
      enabled: this.enabled,
      createdAt: this.createdAt
    }
  }

  /**
   * デシリアライズ（復元用）
   * @param data - シリアライズされたデータ
   * @returns 復元されたジェスチャー
   */
  static fromJSON(data: any): Gesture {
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
        console.warn('Gesture.fromJSON: Failed to deserialize pattern, using empty pattern:', patternError)
        pattern = GesturePattern.empty()
      }
      
      // デフォルト値の設定
      const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true
      
      const gesture = new Gesture(data.id, data.name, pattern, data.action as GestureAction, enabled)
      gesture.createdAt = data.createdAt || new Date().toISOString()
      return gesture
    } catch (error) {
      console.error('Gesture.fromJSON: Failed to deserialize gesture:', error, data)
      
      // フォールバック: 最小限の有効なジェスチャーを作成
      return new Gesture(
        data?.id || `fallback_${Date.now()}`,
        data?.name || 'Invalid Gesture',
        GesturePattern.empty(),
        (data?.action as GestureAction) || 'back',
        false // 無効状態で作成
      )
    }
  }
}