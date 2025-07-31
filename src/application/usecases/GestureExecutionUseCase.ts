/**
 * GestureExecutionUseCase
 * 現在動作しているジェスチャー機能のApplication層実装
 */

import { GestureRecognizer } from '../../domain/services/GestureRecognizer.js';
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';
import { IMessagingService } from '../interfaces';

// 型定義
interface TrailPoint {
  x: number;
  y: number;
  timestamp?: number;
}

interface Settings {
  enabled: boolean;
  gestureThreshold: number;
  defaultGestureStates?: Record<string, boolean>;
}

interface ExecutionResult {
  success: boolean;
  gestureType?: string;
  action?: string;
  error?: string;
}

interface ActionResult {
  success: boolean;
  action?: string;
  error?: string;
}

interface ActionMessage {
  type: 'executeAction';
  action: string;
}

// MessagingServiceは IMessagingServiceに統一

interface DebugInfo {
  settings: Settings;
  hasMessagingService: boolean;
  recognizerThreshold: number;
  className: string;
}

export class GestureExecutionUseCase {
  private gestureRecognizer: GestureRecognizer;
  private messagingService: IMessagingService | null;
  private settings: Settings;
  private logger: DebugLogger;

  constructor(
    gestureRecognizer: GestureRecognizer | null = null,
    messagingService: IMessagingService | null = null,
    logger?: DebugLogger
  ) {
    this.gestureRecognizer = gestureRecognizer || new GestureRecognizer();
    this.messagingService = messagingService;
    this.logger = logger || new DebugLogger(null);
    this.settings = {
      enabled: true,
      gestureThreshold: 15,
      defaultGestureStates: {},
    };
  }

  /**
   * 軌跡からジェスチャーを認識して実行
   * @param trail - 軌跡データ
   * @returns 実行結果
   */
  async executeGesture(trail: TrailPoint[]): Promise<ExecutionResult> {
    try {
      // 設定チェック
      if (!this.settings.enabled) {
        return {
          success: false,
          error: 'Gesture recognition is disabled',
        };
      }

      // ジェスチャー認識
      const gesturePattern = this.gestureRecognizer.recognizeGesture(trail);
      if (!gesturePattern) {
        return {
          success: false,
          error: 'Gesture not recognized',
        };
      }

      const gestureString = gesturePattern.toString();
      this.logger.info('Recognized gesture:', gestureString);

      // アクション実行
      const result = await this.executeAction(gestureString);

      return {
        success: result.success,
        gestureType: gestureString,
        action: result.action,
        error: result.error,
      };
    } catch (error) {
      this.logger.error('Gesture execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ジェスチャーアクションを実行
   * @param gestureType ジェスチャータイプ
   * @returns 実行結果
   */
  private async executeAction(gestureType: string): Promise<ActionResult> {
    if (!this.messagingService) {
      return {
        success: false,
        error: 'Messaging service not available',
      };
    }

    // ジェスチャーの無効化チェック
    if (!this.isGestureEnabled(gestureType)) {
      this.logger.info(`Gesture ${gestureType} is disabled`);
      return {
        success: false,
        error: `Gesture ${gestureType} is disabled`,
      };
    }

    try {
      // メッセージ作成
      const message = this.createActionMessage(gestureType);

      // backgroundスクリプトにメッセージ送信
      const response = (await this.messagingService.sendMessage(message)) as ActionResult;

      return {
        success: response.success,
        action: response.action,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * ジェスチャータイプからアクションメッセージを作成
   * @param gestureType ジェスチャータイプ
   * @returns アクションメッセージ
   */
  private createActionMessage(gestureType: string): ActionMessage {
    // 統一されたアクション名を取得
    const actionName = this.getActionNameFromGestureType(gestureType);

    return {
      type: 'executeAction',
      action: actionName,
    };
  }

  /**
   * 設定を更新
   * @param newSettings 新しい設定
   */
  updateSettings(newSettings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // 認識閾値の更新
    if (newSettings.gestureThreshold) {
      this.gestureRecognizer.setThreshold(newSettings.gestureThreshold);
    }
  }

  /**
   * メッセージングサービスを設定
   * @param messagingService メッセージングサービス
   */
  setMessagingService(messagingService: IMessagingService): void {
    this.messagingService = messagingService;
  }

  /**
   * ジェスチャー認識サービスを設定
   * @param recognizer ジェスチャー認識サービス
   */
  setGestureRecognizer(recognizer: GestureRecognizer): void {
    this.gestureRecognizer = recognizer;
  }

  /**
   * ジェスチャー認識が有効かどうか
   * @returns 有効かどうか
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * ジェスチャー認識を有効/無効に設定
   * @param enabled 有効かどうか
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
  }

  /**
   * 特定のジェスチャーが有効かどうかをチェック
   * @param gestureType ジェスチャータイプ
   * @returns 有効かどうか
   */
  private isGestureEnabled(gestureType: string): boolean {
    if (!this.settings.defaultGestureStates) {
      return true; // デフォルトで有効
    }

    // ジェスチャータイプからジェスチャーIDを取得（UI側と一致）
    const gestureId = this.getGestureIdFromGestureType(gestureType);

    // 設定があればそれを使用、なければデフォルトで有効
    return this.settings.defaultGestureStates[gestureId] !== false;
  }

  /**
   * ジェスチャータイプからジェスチャーIDを取得（UI側の設定キーと一致）
   * @param gestureType ジェスチャータイプ
   * @returns ジェスチャーID
   */
  private getGestureIdFromGestureType(gestureType: string): string {
    const gestureIdMapping: { [key: string]: string } = {
      '↑': 'up',
      '↓': 'down',
      '←': 'left',
      '→': 'right',
      '↓→': 'downright',
      '↑→': 'upright',
      '→↓': 'rightdown',
      '↑↓': 'updown',
      '↑↓↑': 'super_refresh',
      '←→': 'prev_tab',
      '→←': 'next_tab',
    };

    return gestureIdMapping[gestureType] || gestureType.toLowerCase();
  }

  /**
   * ジェスチャータイプからアクション名を取得
   * @param gestureType ジェスチャータイプ
   * @returns アクション名
   */
  private getActionNameFromGestureType(gestureType: string): string {
    const gestureMapping: { [key: string]: string } = {
      '↑': 'scroll_top',
      '↓': 'scroll_bottom',
      '←': 'back',
      '→': 'forward',
      '↓→': 'close_tab',
      '↑→': 'new_tab',
      '→↓': 'duplicate_tab',
      '↑↓': 'refresh',
      '↑↓↑': 'super_refresh',
      '←→': 'prev_tab',
      '→←': 'next_tab',
    };

    return gestureMapping[gestureType] || gestureType;
  }

  /**
   * 現在の設定を取得
   * @returns 設定
   */
  getSettings(): Settings {
    return { ...this.settings };
  }

  /**
   * ロガーを設定
   * @param logger デバッグロガー
   */
  setLogger(logger: DebugLogger): void {
    this.logger = logger;
  }

  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo(): DebugInfo {
    return {
      settings: this.settings,
      hasMessagingService: Boolean(this.messagingService),
      recognizerThreshold: this.gestureRecognizer.getThreshold(),
      className: 'GestureExecutionUseCase',
    };
  }
}
