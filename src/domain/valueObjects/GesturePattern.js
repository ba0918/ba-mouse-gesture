/**
 * GesturePattern 値オブジェクト
 * ジェスチャーのパターン（方向の配列）を表現する不変オブジェクト
 */
class GesturePattern {
  /**
   * @param {string[]} directions - 方向の配列 ['up', 'right', 'down', etc.]
   */
  constructor(directions) {
    if (!Array.isArray(directions)) {
      throw new Error('Directions must be an array')
    }
    
    this._directions = directions.map(dir => this.validateDirection(dir))
    this._length = this._directions.length
    Object.freeze(this._directions)
    Object.freeze(this)
  }

  /**
   * 方向の妥当性をチェック
   * @param {string} direction
   * @returns {string}
   */
  validateDirection(direction) {
    const validDirections = ['up', 'down', 'left', 'right']
    if (!validDirections.includes(direction)) {
      throw new Error(`Invalid direction: ${direction}. Must be one of: ${validDirections.join(', ')}`)
    }
    return direction
  }

  /**
   * 方向配列を取得
   * @returns {string[]}
   */
  getDirections() {
    return [...this._directions]
  }

  /**
   * パターンの長さを取得
   * @returns {number}
   */
  getLength() {
    return this._length
  }

  /**
   * 特定インデックスの方向を取得
   * @param {number} index
   * @returns {string|undefined}
   */
  getDirection(index) {
    return this._directions[index]
  }

  /**
   * 最初の方向を取得
   * @returns {string|undefined}
   */
  getFirst() {
    return this._directions[0]
  }

  /**
   * 最後の方向を取得
   * @returns {string|undefined}
   */
  getLast() {
    return this._directions[this._length - 1]
  }

  /**
   * パターンが空かチェック
   * @returns {boolean}
   */
  isEmpty() {
    return this._length === 0
  }

  /**
   * 基本パターン（単一方向）かチェック
   * @returns {boolean}
   */
  isSimple() {
    return this._length === 1
  }

  /**
   * 複合パターンかチェック
   * @returns {boolean}
   */
  isComplex() {
    return this._length > 1
  }

  /**
   * 他のパターンとの一致をチェック（完全一致）
   * @param {GesturePattern} other
   * @returns {boolean}
   */
  exactMatch(other) {
    if (!(other instanceof GesturePattern)) {
      return false
    }
    
    if (this._length !== other._length) {
      return false
    }
    
    return this._directions.every((dir, index) => dir === other._directions[index])
  }

  /**
   * 他のパターンとの類似度を計算（閾値ベース）
   * @param {GesturePattern} other
   * @param {Threshold} threshold
   * @returns {boolean}
   */
  matches(other, threshold) {
    if (!(other instanceof GesturePattern)) {
      return false
    }
    
    const similarity = this.calculateSimilarity(other)
    return similarity >= threshold.getMatchThreshold()
  }

  /**
   * 他のパターンとの類似度を計算（0-1）
   * @param {GesturePattern} other
   * @returns {number}
   */
  calculateSimilarity(other) {
    if (!(other instanceof GesturePattern)) {
      return 0
    }
    
    // 空パターンの場合
    if (this.isEmpty() && other.isEmpty()) {
      return 1.0
    }
    if (this.isEmpty() || other.isEmpty()) {
      return 0.0
    }
    
    // レーベンシュタイン距離を使用
    const distance = this.levenshteinDistance(other)
    const maxLength = Math.max(this._length, other._length)
    
    return 1.0 - (distance / maxLength)
  }

  /**
   * レーベンシュタイン距離を計算
   * @param {GesturePattern} other
   * @returns {number}
   */
  levenshteinDistance(other) {
    const a = this._directions
    const b = other._directions
    const matrix = []
    
    // 初期化
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i]
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j
    }
    
    // DP計算
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1,     // 挿入
            matrix[i - 1][j] + 1      // 削除
          )
        }
      }
    }
    
    return matrix[b.length][a.length]
  }

  /**
   * 最長共通部分列（LCS）を計算
   * @param {GesturePattern} other
   * @returns {GesturePattern}
   */
  longestCommonSubsequence(other) {
    const a = this._directions
    const b = other._directions
    const matrix = []
    
    // LCS DP テーブル初期化
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = new Array(b.length + 1).fill(0)
    }
    
    // LCS 計算
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1])
        }
      }
    }
    
    // LCS 再構築
    const lcs = []
    let i = a.length, j = b.length
    
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1])
        i--
        j--
      } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
        i--
      } else {
        j--
      }
    }
    
    return new GesturePattern(lcs)
  }

  /**
   * パターンを逆順にした新しいパターンを生成
   * @returns {GesturePattern}
   */
  reverse() {
    return new GesturePattern([...this._directions].reverse())
  }

  /**
   * 部分パターンを取得
   * @param {number} start - 開始インデックス
   * @param {number} end - 終了インデックス（含まない）
   * @returns {GesturePattern}
   */
  slice(start, end) {
    return new GesturePattern(this._directions.slice(start, end))
  }

  /**
   * パターンの複雑度を計算
   * @returns {number}
   */
  getComplexity() {
    if (this.isEmpty()) return 0
    
    // 方向変化の回数を基本複雑度とする
    let changes = 0
    for (let i = 1; i < this._length; i++) {
      if (this._directions[i] !== this._directions[i - 1]) {
        changes++
      }
    }
    
    // 長さと変化の組み合わせで複雑度を算出
    return this._length + changes * 2
  }

  /**
   * パターンが有効かチェック
   * @returns {boolean}
   */
  isValid() {
    return this._length > 0 && 
           this._directions.every(dir => 
             ['up', 'down', 'left', 'right'].includes(dir)
           )
  }

  /**
   * 文字列表現
   * @returns {string}
   */
  toString() {
    return this._directions.join('→')
  }

  /**
   * 配列表現
   * @returns {string[]}
   */
  toArray() {
    return [...this._directions]
  }

  /**
   * JSON表現
   * @returns {string[]}
   */
  toJSON() {
    return this.toArray()
  }

  /**
   * 配列からGesturePatternを復元
   * @param {string[]} directions
   * @returns {GesturePattern}
   */
  static fromArray(directions) {
    return new GesturePattern(directions)
  }

  /**
   * 文字列からGesturePatternを復元
   * @param {string} str - "up→right→down" 形式
   * @returns {GesturePattern}
   */
  static fromString(str) {
    if (!str) return new GesturePattern([])
    return new GesturePattern(str.split('→'))
  }

  /**
   * 空のパターンを生成
   * @returns {GesturePattern}
   */
  static empty() {
    return new GesturePattern([])
  }

  /**
   * 単一方向パターンを生成
   * @param {string} direction
   * @returns {GesturePattern}
   */
  static single(direction) {
    return new GesturePattern([direction])
  }

  /**
   * 点の配列からパターンを生成
   * @param {Point[]} points
   * @param {Threshold} threshold
   * @returns {GesturePattern}
   */
  static fromPoints(points, threshold) {
    if (!Array.isArray(points) || points.length < 2) {
      return GesturePattern.empty()
    }
    
    const directions = []
    const minDistance = threshold.getDetectionThreshold()
    
    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const distance = current.distanceTo(next)
      
      if (distance >= minDistance) {
        const angle = current.angleTo(next)
        const direction = this.angleToDirection(angle)
        
        // 連続する同じ方向は無視
        if (directions.length === 0 || directions[directions.length - 1] !== direction) {
          directions.push(direction)
        }
      }
    }
    
    return new GesturePattern(directions)
  }

  /**
   * 角度を方向に変換
   * @param {number} angle - ラジアン
   * @returns {string}
   */
  static angleToDirection(angle) {
    const degree = (angle * 180 / Math.PI + 360) % 360
    
    if (degree >= 315 || degree < 45) return 'right'
    if (degree >= 45 && degree < 135) return 'down'
    if (degree >= 135 && degree < 225) return 'left'
    if (degree >= 225 && degree < 315) return 'up'
    
    return 'right' // fallback
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GesturePattern }
}