/**
 * CustomGesture エンティティ
 * ユーザー定義カスタムジェスチャーを表現するドメインエンティティ
 */

// 依存関係のインポート
let Gesture, GesturePattern
if (typeof require !== 'undefined') {
  const GestureModule = require('./Gesture')
  Gesture = GestureModule.Gesture
  const GesturePatternModule = require('../valueObjects/GesturePattern')
  GesturePattern = GesturePatternModule.GesturePattern
}
class CustomGesture extends Gesture {
  /**
   * @param {string} id - 一意ID
   * @param {string} name - ユーザー定義名
   * @param {GesturePattern} pattern - ジェスチャーパターン
   * @param {string} action - 実行アクション
   * @param {boolean} enabled - 有効/無効状態
   * @param {number} priority - 優先度（高いほど優先）
   */
  constructor(id, name, pattern, action, enabled = true, priority = 1) {
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
   * @returns {boolean}
   */
  isCustomGesture() {
    return true
  }

  /**
   * 優先度を設定
   * @param {number} priority - 優先度（1-10）
   */
  setPriority(priority) {
    if (priority < 1 || priority > 10) {
      throw new Error('Priority must be between 1 and 10')
    }
    this.priority = priority
  }

  /**
   * 使用統計を記録
   * @param {boolean} success - 実行成功
   */
  recordUsage(success) {
    this.usage.totalCount++
    if (success) {
      this.usage.successCount++
    }
    this.usage.lastUsed = new Date().toISOString()
  }

  /**
   * 成功率を取得
   * @returns {number} 0-1の範囲
   */
  getSuccessRate() {
    if (this.usage.totalCount === 0) return 0
    return this.usage.successCount / this.usage.totalCount
  }

  /**
   * よく使われるジェスチャーかどうか判定
   * @returns {boolean}
   */
  isFrequentlyUsed() {
    return this.usage.totalCount >= 10 && this.getSuccessRate() >= 0.8
  }

  /**
   * パターンの複雑さに基づく信頼度を計算
   * @returns {number} 0-1の範囲
   */
  getConfidence() {
    const baseConfidence = 0.5
    const complexityBonus = Math.min(0.3, this.getComplexity() * 0.05)
    const usageBonus = Math.min(0.2, this.getSuccessRate() * 0.2)
    
    return Math.min(1.0, baseConfidence + complexityBonus + usageBonus)
  }

  /**
   * カスタムジェスチャーの不変条件をチェック
   * @returns {boolean}
   */
  isValid() {
    const superValid = super.isValid()
    const priorityValid = this.priority >= 1 && this.priority <= 10
    const metadataValid = this.metadata.isCustom === true
    
    console.log('🔍 CustomGesture.isValid() - Detailed validation:', {
      id: this.id,
      name: this.name,
      pattern: this.pattern,
      action: this.action,
      priority: this.priority,
      metadata: this.metadata,
      superValid: superValid,
      priorityValid: priorityValid,
      metadataValid: metadataValid,
      hasPattern: !!this.pattern,
      patternIsValid: this.pattern ? this.pattern.isValid() : 'no pattern',
      patternType: typeof this.pattern,
      patternConstructor: this.pattern ? this.pattern.constructor.name : 'undefined'
    })
    
    return superValid && priorityValid && metadataValid
  }

  /**
   * 他のカスタムジェスチャーと比較（優先度ベース）
   * @param {CustomGesture} other
   * @returns {number} -1, 0, 1
   */
  comparePriority(other) {
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
   * @returns {CustomGesture}
   */
  clone() {
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
   * @returns {Object}
   */
  toJSON() {
    return {
      ...super.toJSON(),
      priority: this.priority,
      usage: this.usage,
      metadata: this.metadata
    }
  }

  /**
   * デシリアライズ（復元用）
   * @param {Object} data
   * @returns {CustomGesture}
   */
  static fromJSON(data) {
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
      let pattern
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
        data.action, 
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
        data?.action || 'back',
        false // 無効状態で作成
      )
    }
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CustomGesture }
}