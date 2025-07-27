/**
 * Point 値オブジェクト
 * 2D座標点を表現する不変オブジェクト
 */
class Point {
  /**
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  constructor(x, y) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Point coordinates must be finite numbers')
    }
    
    this._x = x
    this._y = y
    Object.freeze(this) // 不変性保証
  }

  /**
   * X座標を取得
   * @returns {number}
   */
  get x() {
    return this._x
  }

  /**
   * Y座標を取得
   * @returns {number}
   */
  get y() {
    return this._y
  }

  /**
   * 他の点との距離を計算
   * @param {Point} other - 他の点
   * @returns {number} ユークリッド距離
   */
  distanceTo(other) {
    if (!(other instanceof Point)) {
      throw new Error('Argument must be a Point instance')
    }
    
    const dx = this._x - other._x
    const dy = this._y - other._y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 他の点との角度を計算（ラジアン）
   * @param {Point} other - 他の点
   * @returns {number} 角度（ラジアン）
   */
  angleTo(other) {
    if (!(other instanceof Point)) {
      throw new Error('Argument must be a Point instance')
    }
    
    const dx = other._x - this._x
    const dy = other._y - this._y
    return Math.atan2(dy, dx)
  }

  /**
   * 他の点への方向ベクトルを取得
   * @param {Point} other - 他の点
   * @returns {Point} 正規化された方向ベクトル
   */
  directionTo(other) {
    if (!(other instanceof Point)) {
      throw new Error('Argument must be a Point instance')
    }
    
    const dx = other._x - this._x
    const dy = other._y - this._y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) {
      return new Point(0, 0)
    }
    
    return new Point(dx / distance, dy / distance)
  }

  /**
   * 座標を移動した新しい点を生成
   * @param {number} dx - X方向の移動量
   * @param {number} dy - Y方向の移動量
   * @returns {Point} 新しい点
   */
  translate(dx, dy) {
    return new Point(this._x + dx, this._y + dy)
  }

  /**
   * 原点を中心に回転した新しい点を生成
   * @param {number} angle - 回転角度（ラジアン）
   * @returns {Point} 新しい点
   */
  rotate(angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    return new Point(
      this._x * cos - this._y * sin,
      this._x * sin + this._y * cos
    )
  }

  /**
   * スケール変換した新しい点を生成
   * @param {number} scale - スケール倍率
   * @returns {Point} 新しい点
   */
  scale(scale) {
    return new Point(this._x * scale, this._y * scale)
  }

  /**
   * 原点からの距離を計算
   * @returns {number} 原点からの距離
   */
  magnitude() {
    return Math.sqrt(this._x * this._x + this._y * this._y)
  }

  /**
   * 正規化した新しい点を生成（単位ベクトル）
   * @returns {Point} 正規化された点
   */
  normalize() {
    const mag = this.magnitude()
    if (mag === 0) {
      return new Point(0, 0)
    }
    return new Point(this._x / mag, this._y / mag)
  }

  /**
   * 他の点との等価性をチェック
   * @param {Point} other - 他の点
   * @param {number} epsilon - 許容誤差（デフォルト: 1e-10）
   * @returns {boolean}
   */
  equals(other, epsilon = 1e-10) {
    if (!(other instanceof Point)) {
      return false
    }
    
    return Math.abs(this._x - other._x) < epsilon &&
           Math.abs(this._y - other._y) < epsilon
  }

  /**
   * 点が有効かチェック
   * @returns {boolean}
   */
  isValid() {
    return Number.isFinite(this._x) && Number.isFinite(this._y)
  }

  /**
   * 座標を四捨五入した新しい点を生成
   * @returns {Point}
   */
  round() {
    return new Point(Math.round(this._x), Math.round(this._y))
  }

  /**
   * 座標を整数にした新しい点を生成
   * @returns {Point}
   */
  floor() {
    return new Point(Math.floor(this._x), Math.floor(this._y))
  }

  /**
   * 座標を整数にした新しい点を生成（切り上げ）
   * @returns {Point}
   */
  ceil() {
    return new Point(Math.ceil(this._x), Math.ceil(this._y))
  }

  /**
   * 文字列表現
   * @returns {string}
   */
  toString() {
    return `Point(${this._x}, ${this._y})`
  }

  /**
   * JSON表現
   * @returns {Object}
   */
  toJSON() {
    return { x: this._x, y: this._y }
  }

  /**
   * 配列表現
   * @returns {number[]}
   */
  toArray() {
    return [this._x, this._y]
  }

  /**
   * JSONからPointを復元
   * @param {Object} data - JSON data
   * @returns {Point}
   */
  static fromJSON(data) {
    return new Point(data.x, data.y)
  }

  /**
   * 配列からPointを復元
   * @param {number[]} array - [x, y]
   * @returns {Point}
   */
  static fromArray(array) {
    if (!Array.isArray(array) || array.length !== 2) {
      throw new Error('Array must contain exactly 2 elements')
    }
    return new Point(array[0], array[1])
  }

  /**
   * 原点を生成
   * @returns {Point}
   */
  static origin() {
    return new Point(0, 0)
  }

  /**
   * 2点間の中点を計算
   * @param {Point} p1 - 点1
   * @param {Point} p2 - 点2
   * @returns {Point} 中点
   */
  static midpoint(p1, p2) {
    return new Point((p1._x + p2._x) / 2, (p1._y + p2._y) / 2)
  }

  /**
   * 2点間の距離を計算
   * @param {Point} p1 - 点1
   * @param {Point} p2 - 点2
   * @returns {number} 距離
   */
  static distance(p1, p2) {
    return p1.distanceTo(p2)
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Point }
}