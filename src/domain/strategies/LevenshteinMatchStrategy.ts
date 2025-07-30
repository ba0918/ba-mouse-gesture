/**
 * LevenshteinMatchStrategy
 * レーベンシュタイン距離ベースマッチング戦略
 */

import { MatchingStrategy } from './MatchingStrategy'
import { GesturePattern } from '../valueObjects/GesturePattern'
import { Threshold } from '../valueObjects/Threshold'
import { MatchResult } from './MatchResult'

/**
 * レーベンシュタイン距離ベースマッチング戦略
 */
export class LevenshteinMatchStrategy implements MatchingStrategy {
  /**
   * レーベンシュタイン距離ベースマッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, threshold: Threshold): MatchResult {
    const similarity = input.calculateSimilarity(target)
    const isMatch = threshold.isMatch(similarity)
    
    return new MatchResult(
      similarity,
      isMatch,
      'levenshtein_distance',
      { distance: input.levenshteinDistance(target) }
    )
  }

  /**
   * 戦略名を取得
   */
  getStrategyName(): string {
    return 'levenshtein'
  }
}