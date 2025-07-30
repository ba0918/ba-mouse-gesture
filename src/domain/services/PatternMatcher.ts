/**
 * PatternMatcher ドメインサービス
 * 旧互換性インターフェース - 新しいPatternMatcherCoordinatorにデリゲート
 * 
 * @deprecated 新しいコードではPatternMatcherCoordinatorを直接使用してください
 */

import { PatternMatcherCoordinator, MatchingStrategyType } from './PatternMatcherCoordinator'
import { Threshold } from '../valueObjects/Threshold'
import { GesturePattern } from '../valueObjects/GesturePattern'

// 旧コードとの互換性のため、型とクラスを再エクスポート
export { MatchResult, BestMatchResult } from '../strategies/MatchResult'
export type MatchingStrategy = MatchingStrategyType

/**
 * PatternMatcher - 互換性ラッパークラス
 * 389行のGod Objectから、Strategy Patternベースの小さなデリゲートクラスに改善
 */
export class PatternMatcher {
  private coordinator: PatternMatcherCoordinator

  constructor(threshold?: Threshold) {
    this.coordinator = new PatternMatcherCoordinator(threshold)
  }

  /**
   * パターンマッチングを実行
   * @deprecated PatternMatcherCoordinator.match() を使用してください
   */
  match(inputPattern: GesturePattern, targetPattern: GesturePattern, strategy: MatchingStrategy = 'adaptive') {
    return this.coordinator.match(inputPattern, targetPattern, strategy)
  }

  /**
   * 最良マッチを検索
   * @deprecated PatternMatcherCoordinator.findBestMatch() を使用してください
   */
  findBestMatch(input: GesturePattern, candidates: GesturePattern[], strategy: MatchingStrategy = 'adaptive') {
    return this.coordinator.findBestMatch(input, candidates, strategy)
  }

  /**
   * パターン間の類似度を計算
   * @deprecated PatternMatcherCoordinator.calculateSimilarity() を使用してください
   */
  calculateSimilarity(pattern1: GesturePattern, pattern2: GesturePattern, strategy: MatchingStrategy = 'adaptive'): number {
    return this.coordinator.calculateSimilarity(pattern1, pattern2, strategy)
  }

  /**
   * 閾値を更新
   * @deprecated PatternMatcherCoordinator.updateThreshold() を使用してください
   */
  updateThreshold(newThreshold: Threshold): void {
    this.coordinator.updateThreshold(newThreshold)
  }
}