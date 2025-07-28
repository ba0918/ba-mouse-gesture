/**
 * PatternMatcher ドメインサービス
 * パターンマッチングの高度なアルゴリズムを提供
 */

// 依存関係のインポート
let Threshold, GesturePattern
if (typeof require !== 'undefined') {
  const thresholdModule = require('../valueObjects/Threshold')
  Threshold = thresholdModule.Threshold
  const gesturePatternModule = require('../valueObjects/GesturePattern')
  GesturePattern = gesturePatternModule.GesturePattern
}
class PatternMatcher {
  /**
   * @param {Threshold} threshold - マッチング閾値
   */
  constructor(threshold) {
    this.threshold = threshold || Threshold.getDefault()
    this.matchingStrategies = new Map()
    this.initializeStrategies()
  }

  /**
   * マッチング戦略を初期化
   */
  initializeStrategies() {
    this.matchingStrategies.set('exact', this.exactMatch.bind(this))
    this.matchingStrategies.set('levenshtein', this.levenshteinMatch.bind(this))
    this.matchingStrategies.set('lcs', this.lcsMatch.bind(this))
    this.matchingStrategies.set('fuzzy', this.fuzzyMatch.bind(this))
    this.matchingStrategies.set('adaptive', this.adaptiveMatch.bind(this))
  }

  /**
   * パターンマッチングを実行
   * @param {GesturePattern} inputPattern
   * @param {GesturePattern} targetPattern
   * @param {string} strategy - マッチング戦略
   * @returns {MatchResult}
   */
  match(inputPattern, targetPattern, strategy = 'adaptive') {
    if (!inputPattern || !targetPattern || 
        inputPattern.isEmpty() || targetPattern.isEmpty()) {
      return new MatchResult(0, false, 'empty_pattern')
    }

    const matchFunction = this.matchingStrategies.get(strategy)
    if (!matchFunction) {
      throw new Error(`Unknown matching strategy: ${strategy}`)
    }

    const result = matchFunction(inputPattern, targetPattern)
    result.strategy = strategy
    result.threshold = this.threshold.getMatchThreshold()
    
    return result
  }

  /**
   * 完全一致マッチング
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  exactMatch(input, target) {
    const isExact = input.exactMatch(target)
    return new MatchResult(
      isExact ? 1.0 : 0.0,
      isExact,
      'exact_match'
    )
  }

  /**
   * レーベンシュタイン距離ベースマッチング
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  levenshteinMatch(input, target) {
    const similarity = input.calculateSimilarity(target)
    const isMatch = this.threshold.isMatch(similarity)
    
    return new MatchResult(
      similarity,
      isMatch,
      'levenshtein_distance',
      { distance: input.levenshteinDistance(target) }
    )
  }

  /**
   * 最長共通部分列ベースマッチング
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  lcsMatch(input, target) {
    const lcs = input.longestCommonSubsequence(target)
    const maxLength = Math.max(input.getLength(), target.getLength())
    const similarity = maxLength > 0 ? lcs.getLength() / maxLength : 0
    
    const isMatch = this.threshold.isMatch(similarity)
    
    return new MatchResult(
      similarity,
      isMatch,
      'lcs_matching',
      { 
        lcsLength: lcs.getLength(),
        lcsPattern: lcs.toString()
      }
    )
  }

  /**
   * ファジーマッチング（部分マッチを許容）
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  fuzzyMatch(input, target) {
    // 複数の手法を組み合わせ
    const levenshteinResult = this.levenshteinMatch(input, target)
    const lcsResult = this.lcsMatch(input, target)
    
    // 重み付き平均
    const combinedSimilarity = (levenshteinResult.similarity * 0.6) + 
                              (lcsResult.similarity * 0.4)
    
    // 部分マッチングも考慮
    const partialSimilarity = this.calculatePartialMatch(input, target)
    const finalSimilarity = Math.max(combinedSimilarity, partialSimilarity * 0.8)
    
    const isMatch = this.threshold.isMatch(finalSimilarity)
    
    return new MatchResult(
      finalSimilarity,
      isMatch,
      'fuzzy_matching',
      {
        levenshtein: levenshteinResult.similarity,
        lcs: lcsResult.similarity,
        partial: partialSimilarity
      }
    )
  }

  /**
   * 適応的マッチング（コンテキストを考慮）
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  adaptiveMatch(input, target) {
    // パターンの特徴に基づいて最適な手法を選択
    const inputComplexity = input.getComplexity()
    const targetComplexity = target.getComplexity()
    const complexityDiff = Math.abs(inputComplexity - targetComplexity)
    
    let result
    
    if (complexityDiff === 0 && inputComplexity <= 2) {
      // シンプルなパターンは完全一致を重視
      result = this.exactMatch(input, target)
      if (!result.isMatch) {
        result = this.levenshteinMatch(input, target)
      }
    } else if (complexityDiff <= 1) {
      // 複雑度が近い場合はレーベンシュタイン距離
      result = this.levenshteinMatch(input, target)
    } else {
      // 複雑度が大きく異なる場合はファジーマッチング
      result = this.fuzzyMatch(input, target)
    }
    
    // 適応的調整
    result = this.applyAdaptiveAdjustment(result, input, target)
    result.algorithm = 'adaptive'
    
    return result
  }

  /**
   * 部分マッチングの計算
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {number}
   */
  calculatePartialMatch(input, target) {
    const inputDirs = input.getDirections()
    const targetDirs = target.getDirections()
    
    let maxPartialSimilarity = 0
    
    // スライディングウィンドウで部分マッチングを計算
    for (let i = 0; i <= inputDirs.length - targetDirs.length; i++) {
      const subInput = new GesturePattern(inputDirs.slice(i, i + targetDirs.length))
      const similarity = subInput.calculateSimilarity(target)
      maxPartialSimilarity = Math.max(maxPartialSimilarity, similarity)
    }
    
    // 逆方向もチェック
    for (let i = 0; i <= targetDirs.length - inputDirs.length; i++) {
      const subTarget = new GesturePattern(targetDirs.slice(i, i + inputDirs.length))
      const similarity = input.calculateSimilarity(subTarget)
      maxPartialSimilarity = Math.max(maxPartialSimilarity, similarity)
    }
    
    return maxPartialSimilarity
  }

  /**
   * 適応的調整を適用
   * @param {MatchResult} result
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {MatchResult}
   */
  applyAdaptiveAdjustment(result, input, target) {
    let adjustedSimilarity = result.similarity
    
    // 長さの違いによる調整
    const lengthRatio = Math.min(input.getLength(), target.getLength()) / 
                       Math.max(input.getLength(), target.getLength())
    if (lengthRatio < 0.5) {
      adjustedSimilarity *= 0.8 // 長さが大きく異なる場合はペナルティ
    }
    
    // パターンの方向性による調整
    const directionConsistency = this.calculateDirectionConsistency(input, target)
    adjustedSimilarity = (adjustedSimilarity * 0.8) + (directionConsistency * 0.2)
    
    const adjustedResult = new MatchResult(
      adjustedSimilarity,
      this.threshold.isMatch(adjustedSimilarity),
      result.algorithm,
      {
        ...result.metadata,
        originalSimilarity: result.similarity,
        lengthRatio: lengthRatio,
        directionConsistency: directionConsistency
      }
    )
    
    return adjustedResult
  }

  /**
   * 方向の一貫性を計算
   * @param {GesturePattern} input
   * @param {GesturePattern} target
   * @returns {number}
   */
  calculateDirectionConsistency(input, target) {
    const inputDirs = input.getDirections()
    const targetDirs = target.getDirections()
    
    // 最初と最後の方向が同じかチェック
    let consistency = 0
    
    if (inputDirs.length > 0 && targetDirs.length > 0) {
      if (inputDirs[0] === targetDirs[0]) consistency += 0.3
      if (inputDirs[inputDirs.length - 1] === targetDirs[targetDirs.length - 1]) {
        consistency += 0.3
      }
    }
    
    // 全体的な方向の傾向をチェック
    const inputTrend = this.calculateDirectionTrend(inputDirs)
    const targetTrend = this.calculateDirectionTrend(targetDirs)
    
    const trendSimilarity = this.compareTrends(inputTrend, targetTrend)
    consistency += trendSimilarity * 0.4
    
    return Math.min(1.0, consistency)
  }

  /**
   * 方向の傾向を計算
   * @param {string[]} directions
   * @returns {Object}
   */
  calculateDirectionTrend(directions) {
    const counts = { up: 0, down: 0, left: 0, right: 0 }
    directions.forEach(dir => counts[dir]++)
    
    const total = directions.length
    return {
      up: counts.up / total,
      down: counts.down / total,
      left: counts.left / total,
      right: counts.right / total
    }
  }

  /**
   * 傾向の類似度を比較
   * @param {Object} trend1
   * @param {Object} trend2
   * @returns {number}
   */
  compareTrends(trend1, trend2) {
    const directions = ['up', 'down', 'left', 'right']
    let similarity = 0
    
    directions.forEach(dir => {
      similarity += 1 - Math.abs(trend1[dir] - trend2[dir])
    })
    
    return similarity / directions.length
  }

  /**
   * 最良マッチを検索
   * @param {GesturePattern} input
   * @param {GesturePattern[]} candidates
   * @param {string} strategy
   * @returns {BestMatchResult}
   */
  findBestMatch(input, candidates, strategy = 'adaptive') {
    if (!candidates || candidates.length === 0) {
      return new BestMatchResult(null, null, -1)
    }

    let bestResult = null
    let bestIndex = -1
    let bestSimilarity = 0

    candidates.forEach((candidate, index) => {
      const result = this.match(input, candidate, strategy)
      
      if (result.similarity > bestSimilarity) {
        bestResult = result
        bestIndex = index
        bestSimilarity = result.similarity
      }
    })

    return new BestMatchResult(bestResult, candidates[bestIndex], bestIndex)
  }

  /**
   * 閾値を更新
   * @param {Threshold} newThreshold
   */
  updateThreshold(newThreshold) {
    this.threshold = newThreshold
  }
}

/**
 * マッチング結果
 */
class MatchResult {
  constructor(similarity, isMatch, algorithm, metadata = {}) {
    this.similarity = similarity
    this.isMatch = isMatch
    this.algorithm = algorithm
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
  }

  /**
   * 信頼度を取得
   * @returns {number}
   */
  getConfidence() {
    return this.isMatch ? this.similarity : 0
  }

  /**
   * マッチが成功したかチェック
   * @returns {boolean}
   */
  isSuccess() {
    return this.isMatch
  }
}

/**
 * 最良マッチ結果
 */
class BestMatchResult {
  constructor(matchResult, pattern, index) {
    this.matchResult = matchResult
    this.pattern = pattern
    this.index = index
  }

  /**
   * マッチが見つかったかチェック
   * @returns {boolean}
   */
  hasMatch() {
    return this.matchResult !== null && this.matchResult.isMatch
  }

  /**
   * 類似度を取得
   * @returns {number}
   */
  getSimilarity() {
    return this.matchResult ? this.matchResult.similarity : 0
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PatternMatcher, MatchResult, BestMatchResult }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.PatternMatcher = PatternMatcher
  window.MatchResult = MatchResult
  window.BestMatchResult = BestMatchResult
}