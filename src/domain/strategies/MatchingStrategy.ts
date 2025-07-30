/**
 * MatchingStrategy Interface
 * Strategy Patternによるマッチング戦略の抽象化
 */

import { GesturePattern } from '../valueObjects/GesturePattern'
import { Threshold } from '../valueObjects/Threshold'
import { MatchResult } from './MatchResult'

/**
 * マッチング戦略の基底インターフェース
 */
export interface MatchingStrategy {
  /**
   * パターンマッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, threshold: Threshold): MatchResult

  /**
   * 戦略名を取得
   */
  getStrategyName(): string
}