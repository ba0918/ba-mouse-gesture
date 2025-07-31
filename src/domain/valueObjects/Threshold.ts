/**
 * 感度レベルの型定義
 */
export type SensitivityLevel = "low" | "medium" | "high";

/**
 * マッチングレベルの型定義
 */
export type MatchingLevel = "loose" | "normal" | "strict";

/**
 * デバイス情報の型定義
 */
export interface DeviceInfo {
  devicePixelRatio: number;
  isTouchDevice: boolean;
}

/**
 * Threshold 値オブジェクト
 * ジェスチャー認識の閾値設定を表現する不変オブジェクト
 */
export class Threshold {
  private readonly _detectionThreshold: number;
  private readonly _matchThreshold: number;
  private readonly _confidenceThreshold: number;

  /**
   * @param detectionThreshold - ジェスチャー検出閾値（ピクセル）
   * @param matchThreshold - パターンマッチング閾値（0-1）
   * @param confidenceThreshold - 信頼度閾値（0-1）
   */
  constructor(
    detectionThreshold: number = 15,
    matchThreshold: number = 0.6,
    confidenceThreshold: number = 0.5,
  ) {
    this.validateThresholds(detectionThreshold, matchThreshold, confidenceThreshold);

    this._detectionThreshold = detectionThreshold;
    this._matchThreshold = matchThreshold;
    this._confidenceThreshold = confidenceThreshold;
    Object.freeze(this);
  }

  /**
   * 閾値の妥当性をチェック
   * @param detection - 検出閾値
   * @param match - マッチング閾値
   * @param confidence - 信頼度閾値
   */
  private validateThresholds(detection: number, match: number, confidence: number): void {
    if (!Number.isFinite(detection) || detection < 1 || detection > 200) {
      throw new Error("Detection threshold must be between 1 and 200 pixels");
    }
    if (!Number.isFinite(match) || match < 0 || match > 1) {
      throw new Error("Match threshold must be between 0 and 1");
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error("Confidence threshold must be between 0 and 1");
    }
  }

  /**
   * ジェスチャー検出閾値を取得
   * @returns ピクセル単位の閾値
   */
  getDetectionThreshold(): number {
    return this._detectionThreshold;
  }

  /**
   * パターンマッチング閾値を取得
   * @returns 0-1の範囲の閾値
   */
  getMatchThreshold(): number {
    return this._matchThreshold;
  }

  /**
   * 信頼度閾値を取得
   * @returns 0-1の範囲の閾値
   */
  getConfidenceThreshold(): number {
    return this._confidenceThreshold;
  }

  /**
   * 距離が検出閾値を超えているかチェック
   * @param distance - ピクセル距離
   * @returns 検出可能な場合true
   */
  isDetectable(distance: number): boolean {
    return distance >= this._detectionThreshold;
  }

  /**
   * 類似度がマッチング閾値を超えているかチェック
   * @param similarity - 類似度（0-1）
   * @returns マッチする場合true
   */
  isMatch(similarity: number): boolean {
    return similarity >= this._matchThreshold;
  }

  /**
   * 信頼度が閾値を超えているかチェック
   * @param confidence - 信頼度（0-1）
   * @returns 信頼できる場合true
   */
  isConfident(confidence: number): boolean {
    return confidence >= this._confidenceThreshold;
  }

  /**
   * 検出感度レベルを取得
   * @returns 感度レベル
   */
  getSensitivityLevel(): SensitivityLevel {
    if (this._detectionThreshold <= 10) return "high";
    if (this._detectionThreshold <= 20) return "medium";
    return "low";
  }

  /**
   * マッチング精度レベルを取得
   * @returns マッチングレベル
   */
  getMatchingLevel(): MatchingLevel {
    if (this._matchThreshold <= 0.4) return "loose";
    if (this._matchThreshold <= 0.7) return "normal";
    return "strict";
  }

  /**
   * 適応的閾値調整
   * @param successRate - 成功率（0-1）
   * @param usageCount - 使用回数
   * @returns 調整された新しい閾値
   */
  adapt(successRate: number, usageCount: number): Threshold {
    // 使用回数が少ない場合は調整しない
    if (usageCount < 5) {
      return this;
    }

    let newMatchThreshold = this._matchThreshold;
    let newConfidenceThreshold = this._confidenceThreshold;

    // 成功率が高い場合は閾値を少し上げる（精度向上）
    if (successRate > 0.9) {
      newMatchThreshold = Math.min(1.0, this._matchThreshold + 0.05);
      newConfidenceThreshold = Math.min(1.0, this._confidenceThreshold + 0.02);
    } else if (successRate < 0.6) {
      // 成功率が低い場合は閾値を下げる（検出感度向上）
      newMatchThreshold = Math.max(0.1, this._matchThreshold - 0.05);
      newConfidenceThreshold = Math.max(0.1, this._confidenceThreshold - 0.02);
    }

    return new Threshold(
      this._detectionThreshold,
      newMatchThreshold,
      newConfidenceThreshold,
    );
  }

  /**
   * ユーザー設定に基づく閾値調整
   * @param sensitivity - 感度設定
   * @param accuracy - 精度設定
   * @returns 調整された閾値
   */
  adjustForUser(sensitivity: SensitivityLevel, accuracy: MatchingLevel): Threshold {
    let detection = this._detectionThreshold;
    let match = this._matchThreshold;

    // 感度設定
    switch (sensitivity) {
      case "high":
        detection = Math.max(5, detection * 0.7);
        break;
      case "low":
        detection = Math.min(50, detection * 1.5);
        break;
      case "medium":
      default:
        // 変更なし
        break;
    }

    // 精度設定
    switch (accuracy) {
      case "loose":
        match = Math.max(0.2, match * 0.7);
        break;
      case "strict":
        match = Math.min(0.9, match * 1.3);
        break;
      case "normal":
      default:
        // 変更なし
        break;
    }

    return new Threshold(detection, match, this._confidenceThreshold);
  }

  /**
   * デバイス特性に基づく閾値調整
   * @param deviceInfo - デバイス情報
   * @returns 調整された閾値
   */
  adjustForDevice(deviceInfo: DeviceInfo): Threshold {
    let detection = this._detectionThreshold;

    // 高DPIディスプレイの場合は閾値を上げる
    if (deviceInfo.devicePixelRatio > 2) {
      detection = Math.min(30, detection * deviceInfo.devicePixelRatio * 0.5);
    }

    // タッチデバイスの場合は閾値を上げる
    if (deviceInfo.isTouchDevice) {
      detection = Math.min(25, detection * 1.2);
    }

    return new Threshold(detection, this._matchThreshold, this._confidenceThreshold);
  }

  /**
   * 他の閾値との等価性をチェック
   * @param other - 比較対象の閾値
   * @param epsilon - 許容誤差
   * @returns 等価な場合true
   */
  equals(other: Threshold, epsilon: number = 1e-6): boolean {
    if (!(other instanceof Threshold)) {
      return false;
    }

    return Math.abs(this._detectionThreshold - other._detectionThreshold) < epsilon
      && Math.abs(this._matchThreshold - other._matchThreshold) < epsilon
      && Math.abs(this._confidenceThreshold - other._confidenceThreshold) < epsilon;
  }

  /**
   * 閾値が有効かチェック
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return this._detectionThreshold >= 1 && this._detectionThreshold <= 200
      && this._matchThreshold >= 0 && this._matchThreshold <= 1
      && this._confidenceThreshold >= 0 && this._confidenceThreshold <= 1;
  }

  /**
   * より厳しい閾値を作成
   * @param factor - 厳しさの倍率（1.0より大きい）
   * @returns より厳しい閾値
   */
  makeStricter(factor: number = 1.2): Threshold {
    const newMatch = Math.min(1.0, this._matchThreshold * factor);
    const newConfidence = Math.min(1.0, this._confidenceThreshold * factor);

    return new Threshold(this._detectionThreshold, newMatch, newConfidence);
  }

  /**
   * より緩い閾値を作成
   * @param factor - 緩さの倍率（1.0より小さい）
   * @returns より緩い閾値
   */
  makeLoose(factor: number = 0.8): Threshold {
    const newMatch = Math.max(0.1, this._matchThreshold * factor);
    const newConfidence = Math.max(0.1, this._confidenceThreshold * factor);

    return new Threshold(this._detectionThreshold, newMatch, newConfidence);
  }

  /**
   * 文字列表現
   * @returns 文字列表現
   */
  toString(): string {
    return `Threshold(detection: ${this._detectionThreshold}px, match: ${this._matchThreshold}, confidence: ${this._confidenceThreshold})`;
  }

  /**
   * JSON表現
   * @returns JSON表現
   */
  toJSON(): { detectionThreshold: number; matchThreshold: number; confidenceThreshold: number } {
    return {
      detectionThreshold: this._detectionThreshold,
      matchThreshold: this._matchThreshold,
      confidenceThreshold: this._confidenceThreshold,
    };
  }

  /**
   * JSONからThresholdを復元
   * @param data - JSON データ
   * @returns 復元された閾値
   */
  static fromJSON(
    data: { detectionThreshold: number; matchThreshold: number; confidenceThreshold: number },
  ): Threshold {
    return new Threshold(
      data.detectionThreshold,
      data.matchThreshold,
      data.confidenceThreshold,
    );
  }

  /**
   * デフォルト閾値を取得
   * @returns デフォルト閾値
   */
  static getDefault(): Threshold {
    return new Threshold(15, 0.6, 0.5);
  }

  /**
   * 感度の高い閾値を取得
   * @returns 高感度の閾値
   */
  static getHighSensitivity(): Threshold {
    return new Threshold(8, 0.4, 0.3);
  }

  /**
   * 精度の高い閾値を取得
   * @returns 高精度の閾値
   */
  static getHighAccuracy(): Threshold {
    return new Threshold(20, 0.8, 0.7);
  }

  /**
   * カスタムジェスチャー用の閾値を取得
   * @returns カスタムジェスチャー用閾値
   */
  static getForCustomGesture(): Threshold {
    return new Threshold(12, 0.65, 0.6);
  }
}
