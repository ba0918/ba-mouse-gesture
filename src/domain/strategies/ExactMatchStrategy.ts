/**
 * ExactMatchStrategy
 * 完全一致マッチング戦略
 */

import { MatchingStrategy } from './MatchingStrategy'
import { GesturePattern } from '../valueObjects/GesturePattern'
import { Threshold } from '../valueObjects/Threshold'
import { MatchResult } from './MatchResult'

/**
 * 完全一致マッチング戦略
 */
export class ExactMatchStrategy implements MatchingStrategy {
  /**
   * 完全一致マッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, _threshold: Threshold): MatchResult {
    const isExact = input.exactMatch(target)
    
    return new MatchResult(
      isExact ? 1.0 : 0.0,
      isExact,
      'exact_match'
    )
  }

  /**
   * 戦略名を取得
   */
  getStrategyName(): string {
    return 'exact'
  }
}