/**
 * SimpleGestureUseCase
 * 現在動作しているジェスチャー機能のApplication層実装
 */

import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer.js';
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';

// 型定義
interface Point {
  x: number;
  y: number;
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
  type: string;
  direction?: string;
  gestureType?: string;
}

interface MessagingService {
  sendMessage(message: ActionMessage): Promise<ActionResult>;
}

interface DebugInfo {
  settings: Settings;
  hasMessagingService: boolean;
  recognizerThreshold: number;
  className: string;
}

export class SimpleGestureUseCase {
  private gestureRecognizer: SimpleGestureRecognizer;
  private messagingService: MessagingService | null;
  private settings: Settings;
  private logger: DebugLogger;

  constructor(gestureRecognizer: SimpleGestureRecognizer | null = null, messagingService: MessagingService | null = null, logger?: DebugLogger) {
    const SimpleGestureRecognizerClass = (typeof window !== 'undefined' && (window as any).SimpleGestureRecognizer) || 
      SimpleGestureRecognizer;
    
    this.gestureRecognizer = gestureRecognizer || new SimpleGestureRecognizerClass();
    this.messagingService = messagingService;
    this.logger = logger || new DebugLogger(null);
    this.settings = {
      enabled: true,
      gestureThreshold: 15,
      defaultGestureStates: {}
    };
  }

  /**
   * 軌跡からジェスチャーを認識して実行
   * @param trail - 軌跡データ  
   * @returns 実行結果
   */
  async executeGesture(trail: Point[]): Promise<ExecutionResult> {
    try {
      // 設定チェック
      if (!this.settings.enabled) {
        return { 
          success: false, 
          error: 'Gesture recognition is disabled' 
        };
      }

      // ジェスチャー認識
      const gestureType = this.gestureRecognizer.recognizeGesture(trail);
      if (!gestureType) {
        return { 
          success: false, 
          error: 'Gesture not recognized' 
        };
      }

      this.logger.info('Recognized gesture:', gestureType);

      // アクション実行
      const result = await this.executeAction(gestureType);
      
      return {
        success: result.success,
        gestureType: gestureType,
        action: result.action,
        error: result.error
      };

    } catch (error) {
      this.logger.error('Gesture execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
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
        error: 'Messaging service not available'
      };
    }

    // ジェスチャーの無効化チェック
    if (!this.isGestureEnabled(gestureType)) {
      this.logger.info(`Gesture ${gestureType} is disabled`);
      return {
        success: false,
        error: `Gesture ${gestureType} is disabled`
      };
    }

    try {
      // メッセージ作成
      const message = this.createActionMessage(gestureType);
      
      // backgroundスクリプトにメッセージ送信
      const response = await this.messagingService.sendMessage(message);
      
      return {
        success: response.success,
        action: response.action,
        error: response.error
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * ジェスチャータイプからアクションメッセージを作成
   * @param gestureType ジェスチャータイプ
   * @returns アクションメッセージ
   */
  private createActionMessage(gestureType: string): ActionMessage {
    if (this.gestureRecognizer.isSimpleGestureType(gestureType)) {
      return {
        type: 'simpleGesture',
        direction: gestureType
      };
    } else {
      return {
        type: 'complexGesture',
        gestureType: gestureType
      };
    }
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
  setMessagingService(messagingService: MessagingService): void {
    this.messagingService = messagingService;
  }

  /**
   * ジェスチャー認識サービスを設定
   * @param recognizer ジェスチャー認識サービス
   */
  setGestureRecognizer(recognizer: SimpleGestureRecognizer): void {
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

    // ジェスチャータイプからアクション名を取得
    const actionName = this.getActionNameFromGestureType(gestureType);
    
    // 設定があればそれを使用、なければデフォルトで有効
    return this.settings.defaultGestureStates[actionName] !== false;
  }

  /**
   * ジェスチャータイプからアクション名を取得
   * @param gestureType ジェスチャータイプ
   * @returns アクション名
   */
  private getActionNameFromGestureType(gestureType: string): string {
    const gestureMapping: { [key: string]: string } = {
      'UP': 'scroll_top',
      'DOWN': 'scroll_bottom', 
      'LEFT': 'back',
      'RIGHT': 'forward',
      'downright': 'close_tab',
      'upright': 'new_tab',
      'rightdown': 'duplicate_tab',
      'updown': 'refresh',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab'
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
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo(): DebugInfo {
    return {
      settings: this.settings,
      hasMessagingService: Boolean(this.messagingService),
      recognizerThreshold: this.gestureRecognizer.getThreshold(),
      className: 'SimpleGestureUseCase'
    };
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  (window as any).SimpleGestureUseCase = SimpleGestureUseCase;
}