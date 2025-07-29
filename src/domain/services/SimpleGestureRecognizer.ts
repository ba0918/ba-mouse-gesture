/**
 * SimpleGestureRecognizer
 * 現在動作しているジェスチャー認識ロジックのDomain層実装
 */

interface Point {
  x: number
  y: number
}

type Direction = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN'
type GestureType = Direction | 'downright' | 'upright' | 'rightdown' | 'updown' | 'super_refresh' | 'prev_tab' | 'next_tab'

export class SimpleGestureRecognizer {
  private threshold: number

  constructor(threshold: number = 15) {
    this.threshold = threshold
  }

  /**
   * 軌跡からジェスチャーを認識
   */
  recognizeGesture(trail: Point[]): GestureType | null {
    if (!trail || trail.length < 2) return null
    
    // 軌跡の総移動距離チェック
    const totalDistance = this.calculateTrailDistance(trail)
    if (totalDistance < this.threshold) return null
    
    // 最初に単純ジェスチャーかチェック
    if (this.isSimpleGesturePath(trail)) {
      return this.analyzeSimpleGesture(trail)
    }
    
    // 複合ジェスチャーの分析
    return this.analyzeComplexGesture(trail)
  }

  /**
   * 軌跡の総移動距離を計算
   */
  private calculateTrailDistance(trail: Point[]): number {
    if (trail.length < 2) return 0
    
    let totalDistance = 0
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1]
      const current = trail[i]
      const dx = current.x - prev.x
      const dy = current.y - prev.y
      totalDistance += Math.sqrt(dx * dx + dy * dy)
    }
    
    return totalDistance
  }

  /**
   * 単純ジェスチャー判定（1方向のみかチェック）
   */
  private isSimpleGesturePath(trail: Point[]): boolean {
    if (trail.length < 3) return true
    
    const directions: Direction[] = []
    
    // 隣接する点を比較して方向を検出
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i]
      const end = trail[i + 1]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 5) {
        let direction: Direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP'
        }
        directions.push(direction)
      }
    }
    
    // 連続する同じ方向を統合
    const cleanDirections = this.cleanDirections(directions)
    const uniqueDirections = [...new Set(cleanDirections)]
    
    // 単一方向のみの場合は単純ジェスチャー
    return uniqueDirections.length <= 1
  }

  /**
   * 単純ジェスチャーの分析
   */
  private analyzeSimpleGesture(trail: Point[]): Direction {
    const start = trail[0]
    const end = trail[trail.length - 1]
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    
    if (absDx > absDy) {
      return dx > 0 ? 'RIGHT' : 'LEFT'
    } else {
      return dy > 0 ? 'DOWN' : 'UP'
    }
  }

  /**
   * 複合ジェスチャーの分析
   */
  private analyzeComplexGesture(trail: Point[]): GestureType | null {
    if (trail.length < 6) return null
    
    const directions: Direction[] = []
    const segmentLength = Math.max(3, Math.floor(trail.length / 6))
    
    // 軌跡をセグメントに分割して方向を分析
    for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
      const start = trail[i]
      const end = trail[Math.min(i + segmentLength, trail.length - 1)]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 10) {
        let direction: Direction
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP'
        }
        directions.push(direction)
      }
    }
    
    // 連続する同じ方向を統合
    const cleanDirections = this.cleanDirections(directions)
    
    if (cleanDirections.length >= 2) {
      const pattern = cleanDirections.join('')
      
      // 複合ジェスチャーのパターンマッチング
      const complexPatterns: Record<string, GestureType> = {
        'DOWNRIGHT': 'downright',     // ↓→: タブを閉じる
        'UPRIGHT': 'upright',         // ↑→: 新しいタブ
        'RIGHTDOWN': 'rightdown',     // →↓: タブ複製
        'UPDOWN': 'updown',           // ↑↓: ページ更新
        'UPDOWNUP': 'super_refresh',  // ↑↓↑: スーパーリロード
        'LEFTRIGHT': 'prev_tab',      // ←→: 前のタブ
        'RIGHTLEFT': 'next_tab'       // →←: 次のタブ
      }
      
      return complexPatterns[pattern] || null
    }
    
    return null
  }

  /**
   * 方向配列をクリーンアップ（連続する同じ方向を統合）
   */
  private cleanDirections(directions: Direction[]): Direction[] {
    const cleanDirections: Direction[] = []
    let lastDirection: Direction | null = null
    
    for (const dir of directions) {
      if (dir !== lastDirection) {
        cleanDirections.push(dir)
        lastDirection = dir
      }
    }
    
    return cleanDirections
  }

  /**
   * ジェスチャータイプがシンプルジェスチャーかどうか判定
   */
  isSimpleGestureType(gestureType: string): boolean {
    return ['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(gestureType)
  }

  /**
   * 閾値を設定
   */
  setThreshold(threshold: number): void {
    this.threshold = threshold
  }

  /**
   * 閾値を取得
   */
  getThreshold(): number {
    return this.threshold
  }
}