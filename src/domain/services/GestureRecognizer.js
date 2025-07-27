/**
 * GestureRecognizer ドメインサービス
 * ジェスチャー認識のコアロジックを提供
 */

// 依存関係のインポート
let Threshold, GesturePattern, Point
if (typeof require !== 'undefined') {
  ({ Threshold } = require('../valueObjects/Threshold'));
  ({ GesturePattern } = require('../valueObjects/GesturePattern'));
  ({ Point } = require('../valueObjects/Point'))
}
class GestureRecognizer {
  /**
   * @param {Threshold} threshold - 認識閾値
   */
  constructor(threshold) {
    this.threshold = threshold || Threshold.getDefault()
    this.recognitionHistory = []
    this.maxHistorySize = 100
  }

  /**
   * 点の配列からジェスチャーパターンを認識
   * @param {Point[]} points - マウス軌跡の点配列
   * @returns {GesturePattern|null} 認識されたパターン
   */
  recognizeFromPoints(points) {
    if (!Array.isArray(points) || points.length < 2) {
      return null
    }

    // 有効な点のフィルタリング
    const validPoints = this.filterValidPoints(points)
    if (validPoints.length < 2) {
      return null
    }

    // ノイズ除去
    const cleanedPoints = this.removeNoise(validPoints)
    
    // パターン生成
    const pattern = GesturePattern.fromPoints(cleanedPoints, this.threshold)
    
    // 認識履歴に追加
    this.addToHistory(cleanedPoints, pattern)
    
    return pattern.isEmpty() ? null : pattern
  }

  /**
   * 有効な点のみをフィルタリング
   * @param {Point[]} points
   * @returns {Point[]}
   */
  filterValidPoints(points) {
    return points.filter(point => {
      return point instanceof Point && 
             point.isValid() && 
             this.isInValidRange(point)
    })
  }

  /**
   * 点が有効な範囲内にあるかチェック
   * @param {Point} point
   * @returns {boolean}
   */
  isInValidRange(point) {
    // 画面座標の有効範囲をチェック（極端に大きな値を除外）
    const maxCoordinate = 100000
    return Math.abs(point.x) <= maxCoordinate && 
           Math.abs(point.y) <= maxCoordinate
  }

  /**
   * ノイズ除去処理
   * @param {Point[]} points
   * @returns {Point[]}
   */
  removeNoise(points) {
    if (points.length <= 2) return points

    const cleanedPoints = [points[0]] // 最初の点は保持
    
    for (let i = 1; i < points.length - 1; i++) {
      const prev = points[i - 1]
      const current = points[i]
      const next = points[i + 1]
      
      // 微小な移動は除去
      const distance = prev.distanceTo(current)
      if (distance < this.threshold.getDetectionThreshold() / 3) {
        continue
      }
      
      // 急激な方向変化は除去（ジッター対策）
      if (this.isJitter(prev, current, next)) {
        continue
      }
      
      cleanedPoints.push(current)
    }
    
    // 最後の点を追加
    cleanedPoints.push(points[points.length - 1])
    
    return cleanedPoints
  }

  /**
   * ジッター（手ブレ）かどうか判定
   * @param {Point} prev
   * @param {Point} current
   * @param {Point} next
   * @returns {boolean}
   */
  isJitter(prev, current, next) {
    const angle1 = prev.angleTo(current)
    const angle2 = current.angleTo(next)
    
    // 角度差が大きい場合はジッターと判定
    let angleDiff = Math.abs(angle1 - angle2)
    if (angleDiff > Math.PI) {
      angleDiff = 2 * Math.PI - angleDiff
    }
    
    return angleDiff > Math.PI * 0.7 // 126度以上の角度変化
  }

  /**
   * パターンを既知のジェスチャーと照合
   * @param {GesturePattern} pattern
   * @param {Gesture[]} knownGestures
   * @returns {GestureRecognitionResult}
   */
  matchPattern(pattern, knownGestures) {
    if (!pattern || pattern.isEmpty()) {
      return new GestureRecognitionResult(null, 0, false)
    }

    let bestMatch = null
    let bestSimilarity = 0
    let bestConfidence = 0

    for (const gesture of knownGestures) {
      if (!gesture.isEnabled()) continue

      const similarity = pattern.calculateSimilarity(gesture.pattern)
      
      if (similarity > bestSimilarity && this.threshold.isMatch(similarity)) {
        bestMatch = gesture
        bestSimilarity = similarity
        bestConfidence = this.calculateConfidence(pattern, gesture, similarity)
      }
    }

    const isConfident = bestConfidence > 0 && 
                       this.threshold.isConfident(bestConfidence)

    return new GestureRecognitionResult(bestMatch, bestSimilarity, isConfident)
  }

  /**
   * 信頼度を計算
   * @param {GesturePattern} inputPattern
   * @param {Gesture} matchedGesture
   * @param {number} similarity
   * @returns {number}
   */
  calculateConfidence(inputPattern, matchedGesture, similarity) {
    let confidence = similarity

    // パターンの複雑さによる調整
    const complexityRatio = inputPattern.getComplexity() / 
                           Math.max(1, matchedGesture.getComplexity())
    if (complexityRatio < 0.5 || complexityRatio > 2.0) {
      confidence *= 0.8 // 複雑さが大きく異なる場合は信頼度を下げる
    }

    // 履歴に基づく調整
    const historyBonus = this.getHistoryBonus(matchedGesture)
    confidence = Math.min(1.0, confidence + historyBonus)

    return confidence
  }

  /**
   * 履歴に基づく信頼度ボーナスを計算
   * @param {Gesture} gesture
   * @returns {number}
   */
  getHistoryBonus(gesture) {
    const recentMatches = this.recognitionHistory
      .slice(-10) // 直近10回
      .filter(record => record.matchedGesture && 
                       record.matchedGesture.id === gesture.id)
    
    // 最近よく使われているジェスチャーには信頼度ボーナス
    return Math.min(0.1, recentMatches.length * 0.02)
  }

  /**
   * 認識履歴に追加
   * @param {Point[]} points
   * @param {GesturePattern} pattern
   * @param {Gesture} matchedGesture
   */
  addToHistory(points, pattern, matchedGesture = null) {
    const record = {
      timestamp: new Date().toISOString(),
      points: points,
      pattern: pattern,
      matchedGesture: matchedGesture,
      pointCount: points.length,
      complexity: pattern ? pattern.getComplexity() : 0
    }

    this.recognitionHistory.push(record)

    // 履歴サイズ制限
    if (this.recognitionHistory.length > this.maxHistorySize) {
      this.recognitionHistory.shift()
    }
  }

  /**
   * 認識統計を取得
   * @returns {Object}
   */
  getRecognitionStats() {
    const recentHistory = this.recognitionHistory.slice(-50)
    
    return {
      totalRecognitions: this.recognitionHistory.length,
      recentRecognitions: recentHistory.length,
      averageComplexity: this.calculateAverageComplexity(recentHistory),
      recognitionRate: this.calculateRecognitionRate(recentHistory),
      commonPatterns: this.getCommonPatterns(recentHistory)
    }
  }

  /**
   * 平均複雑度を計算
   * @param {Object[]} history
   * @returns {number}
   */
  calculateAverageComplexity(history) {
    if (history.length === 0) return 0
    
    const totalComplexity = history.reduce((sum, record) => 
      sum + (record.complexity || 0), 0)
    
    return totalComplexity / history.length
  }

  /**
   * 認識成功率を計算
   * @param {Object[]} history
   * @returns {number}
   */
  calculateRecognitionRate(history) {
    if (history.length === 0) return 0
    
    const successCount = history.filter(record => 
      record.matchedGesture !== null).length
    
    return successCount / history.length
  }

  /**
   * よく使われるパターンを取得
   * @param {Object[]} history
   * @returns {Object[]}
   */
  getCommonPatterns(history) {
    const patternFrequency = new Map()
    
    history.forEach(record => {
      if (record.pattern && !record.pattern.isEmpty()) {
        const patternStr = record.pattern.toString()
        patternFrequency.set(patternStr, 
          (patternFrequency.get(patternStr) || 0) + 1)
      }
    })
    
    return Array.from(patternFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }))
  }

  /**
   * 閾値を更新
   * @param {Threshold} newThreshold
   */
  updateThreshold(newThreshold) {
    if (newThreshold instanceof Threshold) {
      this.threshold = newThreshold
    }
  }

  /**
   * 適応的閾値調整
   */
  adaptThreshold() {
    const stats = this.getRecognitionStats()
    
    if (stats.recentRecognitions >= 10) {
      this.threshold = this.threshold.adapt(
        stats.recognitionRate, 
        stats.recentRecognitions
      )
    }
  }

  /**
   * 認識履歴をクリア
   */
  clearHistory() {
    this.recognitionHistory = []
  }
}

/**
 * ジェスチャー認識結果
 */
class GestureRecognitionResult {
  constructor(gesture, similarity, isConfident) {
    this.gesture = gesture
    this.similarity = similarity
    this.isConfident = isConfident
    this.timestamp = new Date().toISOString()
  }

  /**
   * 認識に成功したかチェック
   * @returns {boolean}
   */
  isSuccess() {
    return this.gesture !== null && this.isConfident
  }

  /**
   * 信頼度スコアを取得
   * @returns {number}
   */
  getConfidenceScore() {
    return this.isConfident ? this.similarity : 0
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureRecognizer, GestureRecognitionResult }
}