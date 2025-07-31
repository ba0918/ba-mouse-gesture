/**
 * GestureConstants
 * ジェスチャー関連の定数統一定義（ドメイン層）
 *
 * Clean Architecture原則：
 * - Magic Numbers/Stringsを一元管理
 * - DRY原則：重複を排除し、単一の情報源（Single Source of Truth）を確立
 * - OCP原則：新しい定数追加時の既存コード変更を最小化
 */

// ===== ジェスチャー検出・認識関連 =====

/**
 * デフォルトジェスチャー検出閾値（ピクセル）
 * マウス移動がこの値以上でジェスチャーとして認識
 */
export const DEFAULT_GESTURE_THRESHOLD = 15;

/**
 * ジェスチャー検出閾値の設定可能範囲
 */
export const GESTURE_THRESHOLD_RANGE = {
  min: 5,
  max: 100,
} as const;

/**
 * パターンマッチング関連の閾値
 */
export const PATTERN_MATCHING = {
  /** デフォルトマッチング閾値（類似度 0-1） */
  DEFAULT_MATCH_THRESHOLD: 0.6,
  /** デフォルト信頼度閾値（0-1） */
  DEFAULT_CONFIDENCE_THRESHOLD: 0.5,
  /** 最小マッチング閾値 */
  MIN_MATCH_THRESHOLD: 0.1,
  /** 最大マッチング閾値 */
  MAX_MATCH_THRESHOLD: 1.0,
} as const;

// ===== 軌跡描画関連 =====

/**
 * デフォルト軌跡描画色（Material Design Blue）
 */
export const DEFAULT_STROKE_COLOR = '#2196F3';

/**
 * デフォルト軌跡描画幅（ピクセル）
 */
export const DEFAULT_STROKE_WIDTH = 3;

/**
 * 軌跡描画幅の設定可能範囲
 */
export const STROKE_WIDTH_RANGE = {
  min: 1,
  max: 10,
} as const;

// ===== 方向・角度計算関連 =====

/**
 * 方向判定用の角度境界（度）
 * 角度からDirection（'↑', '↓', '←', '→'）への変換に使用
 */
export const DIRECTION_ANGLES = {
  /** 右方向の角度範囲: 315° ≤ angle < 45° */
  RIGHT_MIN: 315,
  RIGHT_MAX: 45,
  /** 下方向の角度範囲: 45° ≤ angle < 135° */
  DOWN_MIN: 45,
  DOWN_MAX: 135,
  /** 左方向の角度範囲: 135° ≤ angle < 225° */
  LEFT_MIN: 135,
  LEFT_MAX: 225,
  /** 上方向の角度範囲: 225° ≤ angle < 315° */
  UP_MIN: 225,
  UP_MAX: 315,
  /** 一周の角度 */
  FULL_CIRCLE: 360,
  /** ラジアンから度への変換係数 */
  RAD_TO_DEG: 180 / Math.PI,
} as const;

// ===== UI・アニメーション関連 =====

/**
 * UI関連の定数
 */
export const UI_CONSTANTS = {
  /** ジェスチャーリストアイテムの高さ（ピクセル） */
  GESTURE_LIST_ITEM_HEIGHT: 60,
  /** アニメーション継続時間（ミリ秒） */
  ANIMATION_DURATION: 200,
  /** デバウンス遅延時間（ミリ秒） */
  DEBOUNCE_DELAY: 300,
  /** Canvas遅延クリア時間（ミリ秒） */
  CANVAS_CLEAR_DELAY: 500,
} as const;

// ===== ジェスチャー複雑度計算 =====

/**
 * ジェスチャー複雑度計算の重み係数
 */
export const COMPLEXITY_WEIGHTS = {
  /** パターン長さの基本重み */
  BASE_LENGTH: 1,
  /** 方向変化の重み（より複雑とみなす） */
  DIRECTION_CHANGE: 2,
} as const;

// ===== デバッグ・ログ関連 =====

/**
 * ログレベル定数
 */
export const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
} as const;

/**
 * デバッグ設定のデフォルト値
 */
export const DEBUG_DEFAULTS = {
  /** デバッグ機能のデフォルト有効/無効 */
  ENABLED: false,
  /** デフォルトログレベル（INFO） */
  LOG_LEVEL: LOG_LEVELS.INFO,
  /** デバッグ表示のデフォルト有効/無効 */
  SHOW_STATUS: false,
  /** デバッグ表示位置 */
  STATUS_POSITION: 'top-right',
} as const;

// ===== 設定ファクトリクラス =====

/**
 * 設定のデフォルト値生成ファクトリ
 * 各種デフォルト設定オブジェクトを統一的に生成
 */
export class GestureSettingsFactory {
  /**
   * 基本設定のデフォルト値を生成
   */
  static createDefaultSettings() {
    return {
      enabled: true,
      strokeColor: DEFAULT_STROKE_COLOR,
      strokeWidth: DEFAULT_STROKE_WIDTH,
      gestureThreshold: DEFAULT_GESTURE_THRESHOLD,
      excludeList: [] as string[],
    };
  }

  /**
   * 閾値設定のデフォルト値を生成
   */
  static createDefaultThreshold() {
    return {
      detectionThreshold: DEFAULT_GESTURE_THRESHOLD,
      matchThreshold: PATTERN_MATCHING.DEFAULT_MATCH_THRESHOLD,
      confidenceThreshold: PATTERN_MATCHING.DEFAULT_CONFIDENCE_THRESHOLD,
    } as const;
  }

  /**
   * デバッグ設定のデフォルト値を生成
   */
  static createDefaultDebugSettings() {
    return {
      enabled: DEBUG_DEFAULTS.ENABLED,
      logLevel: DEBUG_DEFAULTS.LOG_LEVEL,
      showStatus: DEBUG_DEFAULTS.SHOW_STATUS,
      statusPosition: DEBUG_DEFAULTS.STATUS_POSITION,
    } as const;
  }

  /**
   * 軌跡描画設定のデフォルト値を生成
   */
  static createDefaultStrokeSettings() {
    return {
      color: DEFAULT_STROKE_COLOR,
      width: DEFAULT_STROKE_WIDTH,
    } as const;
  }
}

// ===== バリデーション関数 =====

/**
 * 定数値のバリデーション関数群
 */
export class GestureValidators {
  /**
   * ジェスチャー閾値の妥当性をチェック
   */
  static isValidGestureThreshold(value: number): boolean {
    return Number.isInteger(value) && value >= GESTURE_THRESHOLD_RANGE.min && value <= GESTURE_THRESHOLD_RANGE.max;
  }

  /**
   * 軌跡幅の妥当性をチェック
   */
  static isValidStrokeWidth(value: number): boolean {
    return Number.isInteger(value) && value >= STROKE_WIDTH_RANGE.min && value <= STROKE_WIDTH_RANGE.max;
  }

  /**
   * 色コードの妥当性をチェック
   */
  static isValidColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * ログレベルの妥当性をチェック
   */
  static isValidLogLevel(level: number): boolean {
    return Object.values(LOG_LEVELS).includes(level as 0 | 1 | 2 | 3);
  }
}
