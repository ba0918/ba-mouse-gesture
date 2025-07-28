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
   * パターンを複製
   * @returns {GesturePattern}
   */
  clone() {
    return new GesturePattern([...this._directions])
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
   * @param {string[]|any} directions
   * @returns {GesturePattern}
   */
  static fromArray(directions) {
    // データ形式のバリデーション
    if (!directions) {
      console.warn('GesturePattern.fromArray: directions is null/undefined, returning empty pattern')
      return new GesturePattern([])
    }
    
    // 配列でない場合の処理
    if (!Array.isArray(directions)) {
      console.warn('GesturePattern.fromArray: directions is not an array:', typeof directions, directions)
      
      // 文字列の場合は分割を試みる
      if (typeof directions === 'string') {
        try {
          console.log('GesturePattern.fromArray: Parsing string directions:', directions)
          
          let parsed = []
          
          if (directions.includes('→')) {
            // "up→right→down" 形式
            parsed = directions.split('→').map(d => d.trim()).filter(d => d)
          } else if (directions.includes(',')) {
            // "up,right,down" 形式
            parsed = directions.split(',').map(d => d.trim()).filter(d => d)
          } else {
            // 矢印記号が連続している場合（"↑↓←→"）を個別文字に分割
            const arrowMap = {
              '↑': 'up',
              '↓': 'down', 
              '←': 'left',
              '→': 'right'
            }
            
            // 文字列を1文字ずつ処理
            for (let i = 0; i < directions.length; i++) {
              const char = directions[i]
              if (arrowMap[char]) {
                parsed.push(arrowMap[char])
              } else if (char.trim()) {
                // 英語の方向名の可能性をチェック
                const remaining = directions.substring(i)
                for (const [arrow, direction] of Object.entries(arrowMap)) {
                  if (remaining.toLowerCase().startsWith(direction)) {
                    parsed.push(direction)
                    i += direction.length - 1 // インデックスを調整
                    break
                  }
                }
              }
            }
          }
          
          console.log('GesturePattern.fromArray: Parsed directions:', parsed)
          
          // 解析結果が空でないことを確認
          if (parsed.length === 0) {
            console.warn('GesturePattern.fromArray: No valid directions found, returning empty pattern')
            return new GesturePattern([])
          }
          
          return new GesturePattern(parsed)
        } catch (error) {
          console.error('GesturePattern.fromArray: Failed to parse string directions:', error)
          return new GesturePattern([])
        }
      }
      
      // その他の形式は空パターンとして扱う
      return new GesturePattern([])
    }
    
    // 配列の検証を強化
    try {
      // console.log('GesturePattern.fromArray: Processing array:', directions) // 冗長ログを無効化
      
      // 空配列チェック
      if (directions.length === 0) {
        console.warn('GesturePattern.fromArray: Empty array provided')
        return new GesturePattern([])
      }
      
      // 各要素が有効な方向値かチェック
      const validDirections = ['up', 'down', 'left', 'right']
      const filteredDirections = directions.filter(dir => {
        const isValid = typeof dir === 'string' && validDirections.includes(dir.toLowerCase())
        if (!isValid) {
          console.warn('GesturePattern.fromArray: Invalid direction found:', dir, 'type:', typeof dir)
        }
        return isValid
      }).map(dir => dir.toLowerCase())
      
      if (filteredDirections.length === 0) {
        console.warn('GesturePattern.fromArray: No valid directions found after filtering')
        return new GesturePattern([])
      }
      
      // console.log('GesturePattern.fromArray: Filtered directions:', filteredDirections) // 冗長ログを無効化
      return new GesturePattern(filteredDirections)
      
    } catch (error) {
      console.error('GesturePattern.fromArray: Error processing array:', error)
      return new GesturePattern([])
    }
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
        const direction = GesturePattern.angleToDirection(angle)
        
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