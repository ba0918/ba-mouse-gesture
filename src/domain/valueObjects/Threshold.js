/**
 * Threshold 値オブジェクト
 * ジェスチャー認識の閾値設定を表現する不変オブジェクト
 */
class Threshold {
  /**
   * @param {number} detectionThreshold - ジェスチャー検出閾値（ピクセル）
   * @param {number} matchThreshold - パターンマッチング閾値（0-1）
   * @param {number} confidenceThreshold - 信頼度閾値（0-1）
   */
  constructor(detectionThreshold = 15, matchThreshold = 0.6, confidenceThreshold = 0.5) {
    this.validateThresholds(detectionThreshold, matchThreshold, confidenceThreshold)
    
    this._detectionThreshold = detectionThreshold
    this._matchThreshold = matchThreshold
    this._confidenceThreshold = confidenceThreshold
    Object.freeze(this)
  }

  /**
   * 閾値の妥当性をチェック
   * @param {number} detection
   * @param {number} match
   * @param {number} confidence
   */
  validateThresholds(detection, match, confidence) {
    if (!Number.isFinite(detection) || detection < 1 || detection > 200) {
      throw new Error('Detection threshold must be between 1 and 200 pixels')
    }
    if (!Number.isFinite(match) || match < 0 || match > 1) {
      throw new Error('Match threshold must be between 0 and 1')
    }
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      throw new Error('Confidence threshold must be between 0 and 1')
    }
  }

  /**
   * ジェスチャー検出閾値を取得
   * @returns {number} ピクセル単位
   */
  getDetectionThreshold() {
    return this._detectionThreshold
  }

  /**
   * パターンマッチング閾値を取得
   * @returns {number} 0-1の範囲
   */
  getMatchThreshold() {
    return this._matchThreshold
  }

  /**
   * 信頼度閾値を取得
   * @returns {number} 0-1の範囲
   */
  getConfidenceThreshold() {
    return this._confidenceThreshold
  }

  /**
   * 距離が検出閾値を超えているかチェック
   * @param {number} distance - ピクセル距離
   * @returns {boolean}
   */
  isDetectable(distance) {
    return distance >= this._detectionThreshold
  }

  /**
   * 類似度がマッチング閾値を超えているかチェック
   * @param {number} similarity - 類似度（0-1）
   * @returns {boolean}
   */
  isMatch(similarity) {
    return similarity >= this._matchThreshold
  }

  /**
   * 信頼度が閾値を超えているかチェック
   * @param {number} confidence - 信頼度（0-1）
   * @returns {boolean}
   */
  isConfident(confidence) {
    return confidence >= this._confidenceThreshold
  }

  /**
   * 検出感度レベルを取得
   * @returns {string} 'low', 'medium', 'high'
   */
  getSensitivityLevel() {
    if (this._detectionThreshold <= 10) return 'high'
    if (this._detectionThreshold <= 20) return 'medium'
    return 'low'
  }

  /**
   * マッチング精度レベルを取得
   * @returns {string} 'loose', 'normal', 'strict'
   */
  getMatchingLevel() {
    if (this._matchThreshold <= 0.4) return 'loose'
    if (this._matchThreshold <= 0.7) return 'normal'
    return 'strict'
  }

  /**
   * 適応的閾値調整
   * @param {number} successRate - 成功率（0-1）
   * @param {number} usageCount - 使用回数
   * @returns {Threshold} 調整された新しい閾値
   */
  adapt(successRate, usageCount) {
    // 使用回数が少ない場合は調整しない
    if (usageCount < 5) {
      return this
    }
    
    let newMatchThreshold = this._matchThreshold
    let newConfidenceThreshold = this._confidenceThreshold
    
    // 成功率が高い場合は閾値を少し上げる（精度向上）
    if (successRate > 0.9) {
      newMatchThreshold = Math.min(1.0, this._matchThreshold + 0.05)
      newConfidenceThreshold = Math.min(1.0, this._confidenceThreshold + 0.02)
    } else if (successRate < 0.6) {
      // 成功率が低い場合は閾値を下げる（検出感度向上）
      newMatchThreshold = Math.max(0.1, this._matchThreshold - 0.05)
      newConfidenceThreshold = Math.max(0.1, this._confidenceThreshold - 0.02)
    }
    
    return new Threshold(
      this._detectionThreshold,
      newMatchThreshold,
      newConfidenceThreshold
    )
  }

  /**
   * ユーザー設定に基づく閾値調整
   * @param {string} sensitivity - 'low', 'medium', 'high'
   * @param {string} accuracy - 'loose', 'normal', 'strict'
   * @returns {Threshold}
   */
  adjustForUser(sensitivity, accuracy) {
    let detection = this._detectionThreshold
    let match = this._matchThreshold
    
    // 感度設定
    switch (sensitivity) {
    case 'high':
      detection = Math.max(5, detection * 0.7)
      break
    case 'low':
      detection = Math.min(50, detection * 1.5)
      break
    // 'medium' は変更なし
    default:
      break
    }
    
    // 精度設定
    switch (accuracy) {
    case 'loose':
      match = Math.max(0.2, match * 0.7)
      break
    case 'strict':
      match = Math.min(0.9, match * 1.3)
      break
    // 'normal' は変更なし
    default:
      break
    }
    
    return new Threshold(detection, match, this._confidenceThreshold)
  }

  /**
   * デバイス特性に基づく閾値調整
   * @param {Object} deviceInfo - デバイス情報
   * @returns {Threshold}
   */
  adjustForDevice(deviceInfo) {
    let detection = this._detectionThreshold
    
    // 高DPIディスプレイの場合は閾値を上げる
    if (deviceInfo.devicePixelRatio > 2) {
      detection = Math.min(30, detection * deviceInfo.devicePixelRatio * 0.5)
    }
    
    // タッチデバイスの場合は閾値を上げる
    if (deviceInfo.isTouchDevice) {
      detection = Math.min(25, detection * 1.2)
    }
    
    return new Threshold(detection, this._matchThreshold, this._confidenceThreshold)
  }

  /**
   * 他の閾値との等価性をチェック
   * @param {Threshold} other
   * @param {number} epsilon - 許容誤差
   * @returns {boolean}
   */
  equals(other, epsilon = 1e-6) {
    if (!(other instanceof Threshold)) {
      return false
    }
    
    return Math.abs(this._detectionThreshold - other._detectionThreshold) < epsilon &&
           Math.abs(this._matchThreshold - other._matchThreshold) < epsilon &&
           Math.abs(this._confidenceThreshold - other._confidenceThreshold) < epsilon
  }

  /**
   * 閾値が有効かチェック
   * @returns {boolean}
   */
  isValid() {
    return this._detectionThreshold >= 1 && this._detectionThreshold <= 200 &&
           this._matchThreshold >= 0 && this._matchThreshold <= 1 &&
           this._confidenceThreshold >= 0 && this._confidenceThreshold <= 1
  }

  /**
   * より厳しい閾値を作成
   * @param {number} factor - 厳しさの倍率（1.0より大きい）
   * @returns {Threshold}
   */
  makeStricter(factor = 1.2) {
    const newMatch = Math.min(1.0, this._matchThreshold * factor)
    const newConfidence = Math.min(1.0, this._confidenceThreshold * factor)
    
    return new Threshold(this._detectionThreshold, newMatch, newConfidence)
  }

  /**
   * より緩い閾値を作成
   * @param {number} factor - 緩さの倍率（1.0より小さい）
   * @returns {Threshold}
   */
  makeLoose(factor = 0.8) {
    const newMatch = Math.max(0.1, this._matchThreshold * factor)
    const newConfidence = Math.max(0.1, this._confidenceThreshold * factor)
    
    return new Threshold(this._detectionThreshold, newMatch, newConfidence)
  }

  /**
   * 文字列表現
   * @returns {string}
   */
  toString() {
    return `Threshold(detection: ${this._detectionThreshold}px, match: ${this._matchThreshold}, confidence: ${this._confidenceThreshold})`
  }

  /**
   * JSON表現
   * @returns {Object}
   */
  toJSON() {
    return {
      detectionThreshold: this._detectionThreshold,
      matchThreshold: this._matchThreshold,
      confidenceThreshold: this._confidenceThreshold
    }
  }

  /**
   * JSONからThresholdを復元
   * @param {Object} data
   * @returns {Threshold}
   */
  static fromJSON(data) {
    return new Threshold(
      data.detectionThreshold,
      data.matchThreshold,
      data.confidenceThreshold
    )
  }

  /**
   * デフォルト閾値を取得
   * @returns {Threshold}
   */
  static getDefault() {
    return new Threshold(15, 0.6, 0.5)
  }

  /**
   * 感度の高い閾値を取得
   * @returns {Threshold}
   */
  static getHighSensitivity() {
    return new Threshold(8, 0.4, 0.3)
  }

  /**
   * 精度の高い閾値を取得
   * @returns {Threshold}
   */
  static getHighAccuracy() {
    return new Threshold(20, 0.8, 0.7)
  }

  /**
   * カスタムジェスチャー用の閾値を取得
   * @returns {Threshold}
   */
  static getForCustomGesture() {
    return new Threshold(12, 0.65, 0.6)
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Threshold }
}