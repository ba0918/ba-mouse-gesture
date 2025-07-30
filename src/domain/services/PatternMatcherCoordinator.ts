/**
 * PatternMatcherCoordinator
 * Strategy Patternによるマッチング戦略の統合管理
 */

import { Threshold } from '../valueObjects/Threshold'
import { GesturePattern } from '../valueObjects/GesturePattern'
import { MatchingStrategy } from '../strategies/MatchingStrategy'
import { MatchResult, BestMatchResult } from '../strategies/MatchResult'
import { ExactMatchStrategy } from '../strategies/ExactMatchStrategy'
import { LevenshteinMatchStrategy } from '../strategies/LevenshteinMatchStrategy'
import { LcsMatchStrategy } from '../strategies/LcsMatchStrategy'
import { FuzzyMatchStrategy } from '../strategies/FuzzyMatchStrategy'
import { AdaptiveMatchStrategy } from '../strategies/AdaptiveMatchStrategy'

export type MatchingStrategyType = 'exact' | 'levenshtein' | 'lcs' | 'fuzzy' | 'adaptive'

/**
 * パターンマッチング統合コーディネーター
 * Strategy Patternの実装により、各マッチング手法を独立クラスとして管理
 */
export class PatternMatcherCoordinator {
  private threshold: Threshold
  private strategies: Map<MatchingStrategyType, MatchingStrategy>

  constructor(threshold?: Threshold) {
    this.threshold = threshold || Threshold.getDefault()
    this.strategies = new Map()
    this.initializeStrategies()
  }

  /**
   * マッチング戦略を初期化
   */
  private initializeStrategies(): void {
    this.strategies.set('exact', new ExactMatchStrategy())
    this.strategies.set('levenshtein', new LevenshteinMatchStrategy())
    this.strategies.set('lcs', new LcsMatchStrategy())
    this.strategies.set('fuzzy', new FuzzyMatchStrategy())
    this.strategies.set('adaptive', new AdaptiveMatchStrategy())
  }

  /**
   * パターンマッチングを実行
   */
  match(inputPattern: GesturePattern, targetPattern: GesturePattern, strategyType: MatchingStrategyType = 'adaptive'): MatchResult {
    // 入力チェック
    if (!inputPattern || !targetPattern || 
        inputPattern.isEmpty() || targetPattern.isEmpty()) {
      return new MatchResult(0, false, 'empty_pattern')
    }

    // 戦略の取得
    const strategy = this.strategies.get(strategyType)
    if (!strategy) {
      throw new Error(`Unknown matching strategy: ${strategyType}`)
    }

    // マッチングの実行
    const result = strategy.match(inputPattern, targetPattern, this.threshold)
    
    // メタデータの追加
    result.strategy = strategyType
    result.threshold = this.threshold.getMatchThreshold()
    
    return result
  }

  /**
   * 最良マッチを検索
   */
  findBestMatch(input: GesturePattern, candidates: GesturePattern[], strategyType: MatchingStrategyType = 'adaptive'): BestMatchResult {
    if (!candidates || candidates.length === 0) {
      return new BestMatchResult(null, null, -1)
    }

    let bestResult: MatchResult | null = null
    let bestIndex = -1
    let bestSimilarity = 0

    candidates.forEach((candidate, index) => {
      const result = this.match(input, candidate, strategyType)
      
      if (result.similarity > bestSimilarity) {
        bestResult = result
        bestIndex = index
        bestSimilarity = result.similarity
      }
    })

    return new BestMatchResult(bestResult, candidates[bestIndex], bestIndex)
  }

  /**
   * パターン間の類似度を計算（シンプルなインターフェース）
   */
  calculateSimilarity(pattern1: GesturePattern, pattern2: GesturePattern, strategyType: MatchingStrategyType = 'adaptive'): number {
    const result = this.match(pattern1, pattern2, strategyType)
    return result.similarity
  }

  /**
   * 閾値を更新
   */
  updateThreshold(newThreshold: Threshold): void {
    this.threshold = newThreshold
  }

  /**
   * 利用可能な戦略を取得
   */
  getAvailableStrategies(): MatchingStrategyType[] {
    return Array.from(this.strategies.keys())
  }

  /**
   * 特定の戦略を取得
   */
  getStrategy(strategyType: MatchingStrategyType): MatchingStrategy | undefined {
    return this.strategies.get(strategyType)
  }

  /**
   * カスタム戦略を追加
   */
  addStrategy(strategyType: MatchingStrategyType, strategy: MatchingStrategy): void {
    this.strategies.set(strategyType, strategy)
  }
}