/**
 * SimpleGestureRecognizer
 * 現在動作しているジェスチャー認識ロジックのDomain層実装
 */

// 依存関係のインポート（型注釈用）

class SimpleGestureRecognizer {
  constructor(threshold = 15) {
    this.threshold = threshold
  }

  /**
   * 軌跡からジェスチャーを認識
   * @param {Point[]|Object[]} trail - 軌跡データ
   * @returns {string|null} 認識されたジェスチャータイプ
   */
  recognizeGesture(trail) {
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
   * @param {Point[]|Object[]} trail
   * @returns {number}
   */
  calculateTrailDistance(trail) {
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
   * @param {Point[]|Object[]} trail
   * @returns {boolean}
   */
  isSimpleGesturePath(trail) {
    if (trail.length < 3) return true
    
    const directions = []
    
    // 隣接する点を比較して方向を検出
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i]
      const end = trail[i + 1]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 5) {
        let direction = ''
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
   * @param {Point[]|Object[]} trail
   * @returns {string}
   */
  analyzeSimpleGesture(trail) {
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
   * @param {Point[]|Object[]} trail
   * @returns {string|null}
   */
  analyzeComplexGesture(trail) {
    if (trail.length < 6) return null
    
    const directions = []
    const segmentLength = Math.max(3, Math.floor(trail.length / 6))
    
    // 軌跡をセグメントに分割して方向を分析
    for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
      const start = trail[i]
      const end = trail[Math.min(i + segmentLength, trail.length - 1)]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 10) {
        let direction = ''
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
      const complexPatterns = {
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
   * @param {string[]} directions
   * @returns {string[]}
   */
  cleanDirections(directions) {
    const cleanDirections = []
    let lastDirection = null
    
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
   * @param {string} gestureType
   * @returns {boolean}
   */
  isSimpleGestureType(gestureType) {
    return ['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(gestureType)
  }

  /**
   * 閾値を設定
   * @param {number} threshold
   */
  setThreshold(threshold) {
    this.threshold = threshold
  }

  /**
   * 閾値を取得
   * @returns {number}
   */
  getThreshold() {
    return this.threshold
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.SimpleGestureRecognizer = SimpleGestureRecognizer
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleGestureRecognizer }
}