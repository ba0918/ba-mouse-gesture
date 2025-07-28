/**
 * ジェスチャーエンティティ
 * Domain層 - ビジネスルールとエンティティ
 */
class GestureEntity {
  constructor({
    id,
    name,
    pattern,
    action,
    type = 'default',
    category = 'basic',
    description = '',
    enabled = true
  }) {
    this.id = id
    this.name = name
    this.pattern = pattern
    this.action = action
    this.type = type
    this.category = category
    this.description = description
    this.enabled = enabled
  }

  /**
   * ジェスチャーを有効化/無効化する
   */
  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }

  /**
   * ジェスチャーが有効かどうか
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * パターンを表示用に正規化
   */
  getDisplayPattern() {
    if (typeof this.pattern === 'string') {
      return this.pattern
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/LEFT/g, '←')
        .replace(/RIGHT/g, '→')
    } else if (Array.isArray(this.pattern)) {
      return this.pattern.join('')
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/LEFT/g, '←')
        .replace(/RIGHT/g, '→')
    }
    return String(this.pattern || '')
  }

  /**
   * エンティティの妥当性検証
   */
  validate() {
    if (!this.id || typeof this.id !== 'string') {
      throw new Error('Gesture ID is required and must be string')
    }
    if (!this.name || typeof this.name !== 'string') {
      throw new Error('Gesture name is required and must be string')
    }
    if (!this.pattern) {
      throw new Error('Gesture pattern is required')
    }
    if (!this.action || typeof this.action !== 'string') {
      throw new Error('Gesture action is required and must be string')
    }
    return true
  }

  /**
   * エンティティをプレーンオブジェクトに変換
   */
  toPlainObject() {
    return {
      id: this.id,
      name: this.name,
      pattern: this.pattern,
      action: this.action,
      type: this.type,
      category: this.category,
      description: this.description,
      enabled: this.enabled
    }
  }

  /**
   * プレーンオブジェクトからエンティティを作成
   */
  static fromPlainObject(obj) {
    return new GestureEntity(obj)
  }
}

module.exports = GestureEntity