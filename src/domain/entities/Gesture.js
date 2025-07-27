/**
 * Gesture エンティティ
 * ジェスチャーの基本概念を表現するドメインエンティティ
 */

// 依存関係のインポート
let GesturePattern
if (typeof require !== 'undefined') {
  const GesturePatternModule = require('../valueObjects/GesturePattern')
  GesturePattern = GesturePatternModule.GesturePattern
  // Thresholdは現在使用されていないためコメント化
}
class Gesture {
  /**
   * @param {string} id - ジェスチャーID (left, right, up, down, downright, etc.)
   * @param {string} name - ジェスチャー名（表示用）
   * @param {GesturePattern} pattern - ジェスチャーパターン
   * @param {string} action - 実行アクション
   * @param {boolean} enabled - 有効/無効状態
   */
  constructor(id, name, pattern, action, enabled = true) {
    this.id = id
    this.name = name
    this.pattern = pattern
    this.action = action
    this.enabled = enabled
    this.createdAt = new Date().toISOString()
  }

  /**
   * ジェスチャーが有効かチェック
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * ジェスチャーを有効/無効切り替え
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
  }

  /**
   * パターンマッチングを実行
   * @param {GesturePattern} inputPattern - 入力パターン
   * @param {Threshold} threshold - マッチング閾値
   * @returns {boolean}
   */
  matches(inputPattern, threshold) {
    return this.pattern.matches(inputPattern, threshold)
  }

  /**
   * 基本ジェスチャーかどうか判定
   * @returns {boolean}
   */
  isBasicGesture() {
    const basicGestures = ['left', 'right', 'up', 'down']
    return basicGestures.includes(this.id)
  }

  /**
   * 複合ジェスチャーかどうか判定  
   * @returns {boolean}
   */
  isComplexGesture() {
    return !this.isBasicGesture()
  }

  /**
   * ジェスチャーの方向数取得
   * @returns {number}
   */
  getComplexity() {
    return this.pattern.getLength()
  }

  /**
   * エンティティの不変条件をチェック
   * @returns {boolean}
   */
  isValid() {
    return Boolean(
      this.id && 
      this.name && 
      this.pattern && 
      this.action &&
      this.pattern.isValid()
    )
  }

  /**
   * エンティティの複製
   * @returns {Gesture}
   */
  clone() {
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
   * @returns {Object}
   */
  toJSON() {
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
   * @param {Object} data
   * @returns {Gesture}
   */
  static fromJSON(data) {
    const pattern = GesturePattern.fromArray(data.pattern)
    const gesture = new Gesture(data.id, data.name, pattern, data.action, data.enabled)
    gesture.createdAt = data.createdAt
    return gesture
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Gesture }
}