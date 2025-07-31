/**
 * GestureRecognizer
 * 軌跡からジェスチャーパターンを認識するドメインサービス
 * Clean Architecture - Domain層
 * 責任: Point[] → GesturePattern変換のみ
 */

import { Direction, GesturePattern } from '../valueObjects/GesturePattern';
import { Point } from '../valueObjects/Point';
import { Threshold } from '../valueObjects/Threshold';

export class GestureRecognizer {
  private threshold: Threshold;

  constructor(threshold: number = 15) {
    this.threshold = new Threshold(threshold);
  }

  /**
   * 軌跡からジェスチャーパターンを認識
   * @param trail - マウス軌跡の点配列（PointオブジェクトまたはPoint互換オブジェクト）
   * @returns 認識されたジェスチャーパターン
   */
  recognizeGesture(trail: Point[] | Array<{ x: number; y: number }>): GesturePattern | null {
    if (!Array.isArray(trail) || trail.length < 2) {
      return null;
    }

    // GesturePattern.fromPointsを使用して統一された方法でパターン生成
    const pattern = GesturePattern.fromPoints(trail, this.threshold);

    return pattern.isEmpty() ? null : pattern;
  }

  /**
   * レガシー互換性のための文字列ベース認識メソッド
   * @deprecated GesturePatternを直接使用することを推奨
   */
  recognizeGestureString(trail: Point[] | Array<{ x: number; y: number }>): string | null {
    const pattern = this.recognizeGesture(trail);
    if (!pattern) return null;

    // パターンを文字列に変換（レガシー対応）
    return pattern.toString();
  }

  /**
   * パターンがシンプル（単一方向）かどうか判定
   */
  isSimpleGesturePattern(pattern: GesturePattern): boolean {
    return pattern.isSimple();
  }

  /**
   * 閾値を設定
   */
  setThreshold(threshold: number): void {
    this.threshold = new Threshold(threshold);
  }

  /**
   * 閾値を取得
   */
  getThreshold(): number {
    return this.threshold.getDetectionThreshold();
  }

  /**
   * 閾値オブジェクトを取得
   */
  getThresholdObject(): Threshold {
    return this.threshold;
  }
}
