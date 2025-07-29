import { Point } from './Point'
import { Threshold } from './Threshold'

/**
 * ジェスチャーの方向を表す型
 */
export type Direction = 'up' | 'down' | 'left' | 'right'

/**
 * GesturePattern 値オブジェクト
 * ジェスチャーのパターン（方向の配列）を表現する不変オブジェクト
 */
export class GesturePattern {
  private readonly _directions: Direction[]
  private readonly _length: number

  /**
   * @param directions - 方向の配列
   */
  constructor(directions: Direction[]) {
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
   * @param direction - チェックする方向
   * @returns 検証済みの方向
   */
  private validateDirection(direction: string): Direction {
    const validDirections: Direction[] = ['up', 'down', 'left', 'right']
    if (!validDirections.includes(direction as Direction)) {
      throw new Error(`Invalid direction: ${direction}. Must be one of: ${validDirections.join(', ')}`)
    }
    return direction as Direction
  }

  /**
   * 方向配列を取得
   * @returns 方向配列のコピー
   */
  getDirections(): Direction[] {
    return [...this._directions]
  }

  /**
   * パターンの長さを取得
   * @returns パターンの長さ
   */
  getLength(): number {
    return this._length
  }

  /**
   * 特定インデックスの方向を取得
   * @param index - インデックス
   * @returns 方向（存在しない場合はundefined）
   */
  getDirection(index: number): Direction | undefined {
    return this._directions[index]
  }

  /**
   * 最初の方向を取得
   * @returns 最初の方向（存在しない場合はundefined）
   */
  getFirst(): Direction | undefined {
    return this._directions[0]
  }

  /**
   * 最後の方向を取得
   * @returns 最後の方向（存在しない場合はundefined）
   */
  getLast(): Direction | undefined {
    return this._directions[this._length - 1]
  }

  /**
   * パターンが空かチェック
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this._length === 0
  }

  /**
   * 基本パターン（単一方向）かチェック
   * @returns 単一方向の場合true
   */
  isSimple(): boolean {
    return this._length === 1
  }

  /**
   * 複合パターンかチェック
   * @returns 複合パターンの場合true
   */
  isComplex(): boolean {
    return this._length > 1
  }

  /**
   * 他のパターンとの一致をチェック（完全一致）
   * @param other - 比較対象のパターン
   * @returns 完全一致の場合true
   */
  exactMatch(other: GesturePattern): boolean {
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
   * @param other - 比較対象のパターン
   * @param threshold - 閾値
   * @returns マッチする場合true
   */
  matches(other: GesturePattern, threshold: Threshold): boolean {
    if (!(other instanceof GesturePattern)) {
      return false
    }
    
    const similarity = this.calculateSimilarity(other)
    return similarity >= threshold.getMatchThreshold()
  }

  /**
   * 他のパターンとの類似度を計算（0-1）
   * @param other - 比較対象のパターン
   * @returns 類似度（0-1）
   */
  calculateSimilarity(other: GesturePattern): number {
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
   * @param other - 比較対象のパターン
   * @returns レーベンシュタイン距離
   */
  levenshteinDistance(other: GesturePattern): number {
    const a = this._directions
    const b = other._directions
    const matrix: number[][] = []
    
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
   * @param other - 比較対象のパターン
   * @returns LCSパターン
   */
  longestCommonSubsequence(other: GesturePattern): GesturePattern {
    const a = this._directions
    const b = other._directions
    const matrix: number[][] = []
    
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
    const lcs: Direction[] = []
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
   * @returns 逆順のパターン
   */
  reverse(): GesturePattern {
    return new GesturePattern([...this._directions].reverse())
  }

  /**
   * 部分パターンを取得
   * @param start - 開始インデックス
   * @param end - 終了インデックス（含まない）
   * @returns 部分パターン
   */
  slice(start: number, end?: number): GesturePattern {
    return new GesturePattern(this._directions.slice(start, end))
  }

  /**
   * パターンの複雑度を計算
   * @returns 複雑度
   */
  getComplexity(): number {
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
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return this._length > 0 && 
           this._directions.every(dir => 
             ['up', 'down', 'left', 'right'].includes(dir)
           )
  }

  /**
   * パターンを複製
   * @returns 複製されたパターン
   */
  clone(): GesturePattern {
    return new GesturePattern([...this._directions])
  }

  /**
   * 文字列表現
   * @returns 文字列表現
   */
  toString(): string {
    return this._directions.join('→')
  }

  /**
   * 配列表現
   * @returns 配列表現
   */
  toArray(): Direction[] {
    return [...this._directions]
  }

  /**
   * JSON表現
   * @returns JSON表現
   */
  toJSON(): Direction[] {
    return this.toArray()
  }

  /**
   * 配列からGesturePatternを復元
   * @param directions - 方向データ
   * @returns 復元されたパターン
   */
  static fromArray(directions: unknown): GesturePattern {
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
          let parsed: string[] = []
          
          if (directions.includes('→')) {
            // "up→right→down" 形式
            parsed = directions.split('→').map(d => d.trim()).filter(d => d)
          } else if (directions.includes(',')) {
            // "up,right,down" 形式
            parsed = directions.split(',').map(d => d.trim()).filter(d => d)
          } else {
            // 矢印記号が連続している場合（"↑↓←→"）を個別文字に分割
            const arrowMap: { [key: string]: Direction } = {
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
                for (const direction of Object.values(arrowMap)) {
                  if (remaining.toLowerCase().startsWith(direction)) {
                    parsed.push(direction)
                    i += direction.length - 1 // インデックスを調整
                    break
                  }
                }
              }
            }
          }
          
          // 解析結果が空でないことを確認
          if (parsed.length === 0) {
            console.warn('GesturePattern.fromArray: No valid directions found, returning empty pattern')
            return new GesturePattern([])
          }
          
          return new GesturePattern(parsed as Direction[])
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
      // 空配列チェック
      if (directions.length === 0) {
        console.warn('GesturePattern.fromArray: Empty array provided')
        return new GesturePattern([])
      }
      
      // 各要素が有効な方向値かチェック
      const validDirections: Direction[] = ['up', 'down', 'left', 'right']
      const filteredDirections = directions.filter(dir => {
        const isValid = typeof dir === 'string' && validDirections.includes(dir.toLowerCase() as Direction)
        if (!isValid) {
          console.warn('GesturePattern.fromArray: Invalid direction found:', dir, 'type:', typeof dir)
        }
        return isValid
      }).map(dir => (dir as string).toLowerCase() as Direction)
      
      if (filteredDirections.length === 0) {
        console.warn('GesturePattern.fromArray: No valid directions found after filtering')
        return new GesturePattern([])
      }
      
      return new GesturePattern(filteredDirections)
      
    } catch (error) {
      console.error('GesturePattern.fromArray: Error processing array:', error)
      return new GesturePattern([])
    }
  }

  /**
   * 文字列からGesturePatternを復元
   * @param str - "up→right→down" 形式の文字列
   * @returns 復元されたパターン
   */
  static fromString(str: string): GesturePattern {
    if (!str) return new GesturePattern([])
    return new GesturePattern(str.split('→') as Direction[])
  }

  /**
   * 空のパターンを生成
   * @returns 空のパターン
   */
  static empty(): GesturePattern {
    return new GesturePattern([])
  }

  /**
   * 単一方向パターンを生成
   * @param direction - 方向
   * @returns 単一方向パターン
   */
  static single(direction: Direction): GesturePattern {
    return new GesturePattern([direction])
  }

  /**
   * 点の配列からパターンを生成
   * @param points - 点の配列
   * @param threshold - 閾値
   * @returns 生成されたパターン
   */
  static fromPoints(points: Point[], threshold: Threshold): GesturePattern {
    if (!Array.isArray(points) || points.length < 2) {
      return GesturePattern.empty()
    }
    
    const directions: Direction[] = []
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
   * @param angle - ラジアン
   * @returns 方向
   */
  static angleToDirection(angle: number): Direction {
    const degree = (angle * 180 / Math.PI + 360) % 360
    
    if (degree >= 315 || degree < 45) return 'right'
    if (degree >= 45 && degree < 135) return 'down'
    if (degree >= 135 && degree < 225) return 'left'
    if (degree >= 225 && degree < 315) return 'up'
    
    return 'right' // fallback
  }
}