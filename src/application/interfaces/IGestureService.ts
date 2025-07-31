/**
 * IGestureService
 * ジェスチャー関連機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

import { GestureAction } from "../../domain/entities";

// Raw point interface for mouse tracking
export interface RawPoint {
  x: number;
  y: number;
  timestamp?: number;
}

// DTO definitions (Data Transfer Objects)

/**
 * ジェスチャー実行結果DTO
 */
export interface GestureExecutionResultDTO {
  sessionId: string;
  gesture: GestureDTO | null;
  success: boolean;
  message: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

/**
 * ジェスチャーDTO
 */
export interface GestureDTO {
  id: string;
  name: string;
  action: GestureAction;
  enabled: boolean;
}

/**
 * カスタムジェスチャーDTO
 */
export interface CustomGestureDTO {
  id: string;
  name: string;
  action: GestureAction;
  enabled: boolean;
  description: string;

  createdAt: string;
  updatedAt: string;
}

/**
 * カスタムジェスチャー更新DTO
 */
export interface CustomGestureUpdateDTO {
  name?: string;
  action?: GestureAction;
  enabled?: boolean;
  description?: string;
}

/**
 * ジェスチャーバックアップDTO
 */
export interface GestureBackupDTO {
  timestamp: string;
  version: string;
  customGestures: CustomGestureDTO[];
}

/**
 * 最適化結果DTO
 */
export interface OptimizationResultDTO {
  recognitionStats: Record<string, unknown>;
  gestureStats: Record<string, unknown>;
  storageOptimization: Record<string, unknown>;
  message: string;
}

/**
 * ジェスチャーサービスのインターフェース
 */
export interface IGestureService {
  /**
   * ジェスチャー認識とアクション実行
   */
  executeGesture(
    rawPoints: RawPoint[],
    currentUrl: string,
    tabId: number,
  ): Promise<GestureExecutionResultDTO>;

  /**
   * カスタムジェスチャーの作成
   */
  createCustomGesture(
    name: string,
    rawPoints: RawPoint[],
    action: GestureAction,
    description?: string,
  ): Promise<CustomGestureDTO>;

  /**
   * カスタムジェスチャーの一覧取得
   */
  getCustomGestures(): Promise<CustomGestureDTO[]>;

  /**
   * カスタムジェスチャーの更新
   */
  updateCustomGesture(
    gestureId: string,
    updates: Partial<CustomGestureUpdateDTO>,
  ): Promise<CustomGestureDTO>;

  /**
   * カスタムジェスチャーの削除
   */
  deleteCustomGesture(gestureId: string): Promise<void>;

  /**
   * カスタムジェスチャーの有効/無効切り替え
   */
  toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGestureDTO>;

  /**
   * カスタムジェスチャーの再学習
   */
  retrainCustomGesture(
    gestureId: string,
    additionalSamples: RawPoint[][],
  ): Promise<LearningResultDTO>;

  /**
   * ジェスチャーのエクスポート
   */
  exportGestures(): Promise<GestureBackupDTO>;

  /**
   * ジェスチャーのインポート
   */
  importGestures(backup: GestureBackupDTO): Promise<void>;

  /**
   * 認識精度の最適化
   */
  optimizeRecognition(): Promise<OptimizationResultDTO>;

  /**
   * ジェスチャー機能が有効かチェック
   */
  isGestureEnabled(url: string): Promise<boolean>;

  /**
   * 特定ジェスチャーが有効かチェック
   */
  isSpecificGestureEnabled(gestureId: string): Promise<boolean>;
}
