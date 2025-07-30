/**
 * LcsMatchStrategy
 * 最長共通部分列ベースマッチング戦略
 */

import { MatchingStrategy } from './MatchingStrategy'
import { GesturePattern } from '../valueObjects/GesturePattern'
import { Threshold } from '../valueObjects/Threshold'
import { MatchResult } from './MatchResult'

/**
 * 最長共通部分列ベースマッチング戦略
 */
export class LcsMatchStrategy implements MatchingStrategy {
  /**
   * 最長共通部分列ベースマッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, threshold: Threshold): MatchResult {
    const lcs = input.longestCommonSubsequence(target)
    const maxLength = Math.max(input.getLength(), target.getLength())
    const similarity = maxLength > 0 ? lcs.getLength() / maxLength : 0
    
    const isMatch = threshold.isMatch(similarity)
    
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
   * 戦略名を取得
   */
  getStrategyName(): string {
    return 'lcs'
  }
}