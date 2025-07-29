/**
 * Point 値オブジェクト
 * 2D座標点を表現する不変オブジェクト
 */
export class Point {
  private readonly _x: number
  private readonly _y: number
  private readonly _timestamp?: number

  /**
   * @param x - X座標
   * @param y - Y座標
   * @param timestamp - タイムスタンプ（オプション）
   */
  constructor(x: number, y: number, timestamp?: number) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error('Point coordinates must be finite numbers')
    }
    
    this._x = x
    this._y = y
    this._timestamp = timestamp
    Object.freeze(this) // 不変性保証
  }

  /**
   * X座標を取得
   */
  get x(): number {
    return this._x
  }

  /**
   * Y座標を取得
   */
  get y(): number {
    return this._y
  }

  /**
   * タイムスタンプを取得
   */
  get timestamp(): number | undefined {
    return this._timestamp
  }

  /**
   * 他の点との距離を計算
   * @param other - 他の点
   * @returns ユークリッド距離
   */
  distanceTo(other: Point): number {
    if (!(other instanceof Point)) {
      throw new Error('Argument must be a Point instance')
    }
    
    const dx = this._x - other._x
    const dy = this._y - other._y
    return Math.sqrt(dx * dx + dy * dy)
  }

  /**
   * 他の点との角度を計算（ラジアン）
   * @param other - 他の点
   * @returns 角度（ラジアン）
   */
  angleTo(other: Point): number {
    if (!(other instanceof Point)) {
      throw new Error('Argument must be a Point instance')
    }
    
    const dx = other._x - this._x
    const dy = other._y - this._y
    return Math.atan2(dy, dx)
  }

  /**
   * 他の点への方向ベクトルを取得
   * @param other - 他の点
   * @returns 正規化された方向ベクトル
   */
  directionTo(other: Point): Point {
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
   * @param dx - X方向の移動量
   * @param dy - Y方向の移動量
   * @returns 新しい点
   */
  translate(dx: number, dy: number): Point {
    return new Point(this._x + dx, this._y + dy)
  }

  /**
   * 原点を中心に回転した新しい点を生成
   * @param angle - 回転角度（ラジアン）
   * @returns 新しい点
   */
  rotate(angle: number): Point {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    
    return new Point(
      this._x * cos - this._y * sin,
      this._x * sin + this._y * cos
    )
  }

  /**
   * スケール変換した新しい点を生成
   * @param scale - スケール倍率
   * @returns 新しい点
   */
  scale(scale: number): Point {
    return new Point(this._x * scale, this._y * scale)
  }

  /**
   * 原点からの距離を計算
   * @returns 原点からの距離
   */
  magnitude(): number {
    return Math.sqrt(this._x * this._x + this._y * this._y)
  }

  /**
   * 正規化した新しい点を生成（単位ベクトル）
   * @returns 正規化された点
   */
  normalize(): Point {
    const mag = this.magnitude()
    if (mag === 0) {
      return new Point(0, 0)
    }
    return new Point(this._x / mag, this._y / mag)
  }

  /**
   * 他の点との等価性をチェック
   * @param other - 他の点
   * @param epsilon - 許容誤差
   * @returns 等価性
   */
  equals(other: Point, epsilon: number = 1e-10): boolean {
    if (!(other instanceof Point)) {
      return false
    }
    
    return Math.abs(this._x - other._x) < epsilon &&
           Math.abs(this._y - other._y) < epsilon
  }

  /**
   * 点が有効かチェック
   * @returns 有効性
   */
  isValid(): boolean {
    return Number.isFinite(this._x) && Number.isFinite(this._y)
  }

  /**
   * 座標を四捨五入した新しい点を生成
   * @returns 四捨五入された点
   */
  round(): Point {
    return new Point(Math.round(this._x), Math.round(this._y))
  }

  /**
   * 座標を整数にした新しい点を生成（切り捨て）
   * @returns 切り捨てられた点
   */
  floor(): Point {
    return new Point(Math.floor(this._x), Math.floor(this._y))
  }

  /**
   * 座標を整数にした新しい点を生成（切り上げ）
   * @returns 切り上げられた点
   */
  ceil(): Point {
    return new Point(Math.ceil(this._x), Math.ceil(this._y))
  }

  /**
   * 文字列表現
   * @returns 文字列表現
   */
  toString(): string {
    return `Point(${this._x}, ${this._y})`
  }

  /**
   * JSON表現
   * @returns JSON表現
   */
  toJSON(): { x: number; y: number } {
    return { x: this._x, y: this._y }
  }

  /**
   * 配列表現
   * @returns 配列表現
   */
  toArray(): [number, number] {
    return [this._x, this._y]
  }

  /**
   * JSONからPointを復元
   * @param data - JSON data
   * @returns 復元されたPoint
   */
  static fromJSON(data: { x: number; y: number }): Point {
    return new Point(data.x, data.y)
  }

  /**
   * 配列からPointを復元
   * @param array - [x, y]
   * @returns 復元されたPoint
   */
  static fromArray(array: [number, number]): Point {
    if (!Array.isArray(array) || array.length !== 2) {
      throw new Error('Array must contain exactly 2 elements')
    }
    return new Point(array[0], array[1])
  }

  /**
   * 原点を生成
   * @returns 原点
   */
  static origin(): Point {
    return new Point(0, 0)
  }

  /**
   * 2点間の中点を計算
   * @param p1 - 点1
   * @param p2 - 点2
   * @returns 中点
   */
  static midpoint(p1: Point, p2: Point): Point {
    return new Point((p1._x + p2._x) / 2, (p1._y + p2._y) / 2)
  }

  /**
   * 2点間の距離を計算
   * @param p1 - 点1
   * @param p2 - 点2
   * @returns 距離
   */
  static distance(p1: Point, p2: Point): number {
    return p1.distanceTo(p2)
  }
}