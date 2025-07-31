/**
 * FuzzyMatchStrategy
 * ファジーマッチング戦略（複数手法の組み合わせ）
 */

import { GesturePattern } from "../valueObjects/GesturePattern";
import { Threshold } from "../valueObjects/Threshold";
import { LcsMatchStrategy } from "./LcsMatchStrategy";
import { LevenshteinMatchStrategy } from "./LevenshteinMatchStrategy";
import { MatchingStrategy } from "./MatchingStrategy";
import { MatchResult } from "./MatchResult";

/**
 * ファジーマッチング戦略（部分マッチを許容）
 */
export class FuzzyMatchStrategy implements MatchingStrategy {
  private levenshteinStrategy = new LevenshteinMatchStrategy();
  private lcsStrategy = new LcsMatchStrategy();

  /**
   * ファジーマッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, threshold: Threshold): MatchResult {
    // 複数の手法を組み合わせ
    const levenshteinResult = this.levenshteinStrategy.match(input, target, threshold);
    const lcsResult = this.lcsStrategy.match(input, target, threshold);

    // 重み付き平均
    const combinedSimilarity = (levenshteinResult.similarity * 0.6)
      + (lcsResult.similarity * 0.4);

    // 部分マッチングも考慮
    const partialSimilarity = this.calculatePartialMatch(input, target);
    const finalSimilarity = Math.max(combinedSimilarity, partialSimilarity * 0.8);

    const isMatch = threshold.isMatch(finalSimilarity);

    return new MatchResult(
      finalSimilarity,
      isMatch,
      "fuzzy_matching",
      {
        levenshtein: levenshteinResult.similarity,
        lcs: lcsResult.similarity,
        partial: partialSimilarity,
      },
    );
  }

  /**
   * 部分マッチングの計算
   */
  private calculatePartialMatch(input: GesturePattern, target: GesturePattern): number {
    const inputDirs = input.getDirections();
    const targetDirs = target.getDirections();

    let maxPartialSimilarity = 0;

    // スライディングウィンドウで部分マッチングを計算
    for (let i = 0; i <= inputDirs.length - targetDirs.length; i++) {
      const subInput = new GesturePattern(inputDirs.slice(i, i + targetDirs.length));
      const similarity = subInput.calculateSimilarity(target);
      maxPartialSimilarity = Math.max(maxPartialSimilarity, similarity);
    }

    // 逆方向もチェック
    for (let i = 0; i <= targetDirs.length - inputDirs.length; i++) {
      const subTarget = new GesturePattern(targetDirs.slice(i, i + inputDirs.length));
      const similarity = input.calculateSimilarity(subTarget);
      maxPartialSimilarity = Math.max(maxPartialSimilarity, similarity);
    }

    return maxPartialSimilarity;
  }

  /**
   * 戦略名を取得
   */
  getStrategyName(): string {
    return "fuzzy";
  }
}
