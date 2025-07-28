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
   * 表示用にフォーマットされたパターンを取得
   * @returns {string}
   */
  getFormattedPattern() {
    return this.pattern.toString()
  }

  /**
   * アクションの表示名を取得
   * @returns {string}
   */
  getActionDisplayName() {
    const actionNames = {
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
        console.warn('Gesture.fromJSON: Failed to deserialize pattern, using empty pattern:', patternError)
        pattern = GesturePattern.empty()
      }
      
      // デフォルト値の設定
      const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true
      
      const gesture = new Gesture(data.id, data.name, pattern, data.action, enabled)
      gesture.createdAt = data.createdAt || new Date().toISOString()
      return gesture
    } catch (error) {
      console.error('Gesture.fromJSON: Failed to deserialize gesture:', error, data)
      
      // フォールバック: 最小限の有効なジェスチャーを作成
      return new Gesture(
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
  module.exports = { Gesture }
}