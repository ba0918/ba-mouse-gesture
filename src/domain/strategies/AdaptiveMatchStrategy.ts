/**
 * AdaptiveMatchStrategy
 * 適応的マッチング戦略（コンテキストを考慮）
 */

import { GesturePattern } from "../valueObjects/GesturePattern";
import { Threshold } from "../valueObjects/Threshold";
import { ExactMatchStrategy } from "./ExactMatchStrategy";
import { FuzzyMatchStrategy } from "./FuzzyMatchStrategy";
import { LevenshteinMatchStrategy } from "./LevenshteinMatchStrategy";
import { MatchingStrategy } from "./MatchingStrategy";
import { MatchResult } from "./MatchResult";

interface DirectionTrend {
  up: number;
  down: number;
  left: number;
  right: number;
}

/**
 * 適応的マッチング戦略（コンテキストを考慮）
 */
export class AdaptiveMatchStrategy implements MatchingStrategy {
  private exactStrategy = new ExactMatchStrategy();
  private levenshteinStrategy = new LevenshteinMatchStrategy();
  private fuzzyStrategy = new FuzzyMatchStrategy();

  /**
   * 適応的マッチングを実行
   */
  match(input: GesturePattern, target: GesturePattern, threshold: Threshold): MatchResult {
    // パターンの特徴に基づいて最適な手法を選択
    const inputComplexity = input.getComplexity();
    const targetComplexity = target.getComplexity();
    const complexityDiff = Math.abs(inputComplexity - targetComplexity);

    let result: MatchResult;

    if (complexityDiff === 0 && inputComplexity <= 2) {
      // シンプルなパターンは完全一致を重視
      result = this.exactStrategy.match(input, target, threshold);
      if (!result.isMatch) {
        result = this.levenshteinStrategy.match(input, target, threshold);
      }
    } else if (complexityDiff <= 1) {
      // 複雑度が近い場合はレーベンシュタイン距離
      result = this.levenshteinStrategy.match(input, target, threshold);
    } else {
      // 複雑度が大きく異なる場合はファジーマッチング
      result = this.fuzzyStrategy.match(input, target, threshold);
    }

    // 適応的調整
    result = this.applyAdaptiveAdjustment(result, input, target, threshold);
    result.algorithm = "adaptive";

    return result;
  }

  /**
   * 適応的調整を適用
   */
  private applyAdaptiveAdjustment(
    result: MatchResult,
    input: GesturePattern,
    target: GesturePattern,
    threshold: Threshold,
  ): MatchResult {
    let adjustedSimilarity = result.similarity;

    // 長さの違いによる調整
    const lengthRatio = Math.min(input.getLength(), target.getLength())
      / Math.max(input.getLength(), target.getLength());
    if (lengthRatio < 0.5) {
      adjustedSimilarity *= 0.8; // 長さが大きく異なる場合はペナルティ
    }

    // パターンの方向性による調整
    const directionConsistency = this.calculateDirectionConsistency(input, target);
    adjustedSimilarity = (adjustedSimilarity * 0.8) + (directionConsistency * 0.2);

    return new MatchResult(
      adjustedSimilarity,
      threshold.isMatch(adjustedSimilarity),
      result.algorithm,
      {
        ...result.metadata,
        originalSimilarity: result.similarity,
        lengthRatio: lengthRatio,
        directionConsistency: directionConsistency,
      },
    );
  }

  /**
   * 方向の一貫性を計算
   */
  private calculateDirectionConsistency(input: GesturePattern, target: GesturePattern): number {
    const inputDirs = input.getDirections();
    const targetDirs = target.getDirections();

    // 最初と最後の方向が同じかチェック
    let consistency = 0;

    if (inputDirs.length > 0 && targetDirs.length > 0) {
      if (inputDirs[0] === targetDirs[0]) consistency += 0.3;
      if (inputDirs[inputDirs.length - 1] === targetDirs[targetDirs.length - 1]) {
        consistency += 0.3;
      }
    }

    // 全体的な方向の傾向をチェック
    const inputTrend = this.calculateDirectionTrend(inputDirs);
    const targetTrend = this.calculateDirectionTrend(targetDirs);

    const trendSimilarity = this.compareTrends(inputTrend, targetTrend);
    consistency += trendSimilarity * 0.4;

    return Math.min(1.0, consistency);
  }

  /**
   * 方向の傾向を計算
   */
  private calculateDirectionTrend(directions: string[]): DirectionTrend {
    const counts = { up: 0, down: 0, left: 0, right: 0 };
    directions.forEach(dir => {
      if (dir in counts) {
        counts[dir as keyof typeof counts]++;
      }
    });

    const total = directions.length;
    return {
      up: counts.up / total,
      down: counts.down / total,
      left: counts.left / total,
      right: counts.right / total,
    };
  }

  /**
   * 傾向の類似度を比較
   */
  private compareTrends(trend1: DirectionTrend, trend2: DirectionTrend): number {
    const directions: (keyof DirectionTrend)[] = ["up", "down", "left", "right"];
    let similarity = 0;

    directions.forEach(dir => {
      similarity += 1 - Math.abs(trend1[dir] - trend2[dir]);
    });

    return similarity / directions.length;
  }

  /**
   * 戦略名を取得
   */
  getStrategyName(): string {
    return "adaptive";
  }
}
