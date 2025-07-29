/**
 * SimpleGestureUseCase
 * 現在動作しているジェスチャー機能のApplication層実装
 */

import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer.js';

// 型定義
interface Point {
  x: number;
  y: number;
}

interface Settings {
  enabled: boolean;
  gestureThreshold: number;
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

  constructor(gestureRecognizer: SimpleGestureRecognizer | null = null, messagingService: MessagingService | null = null) {
    const SimpleGestureRecognizerClass = (typeof window !== 'undefined' && (window as any).SimpleGestureRecognizer) || 
      SimpleGestureRecognizer;
    
    this.gestureRecognizer = gestureRecognizer || new SimpleGestureRecognizerClass();
    this.messagingService = messagingService;
    this.settings = {
      enabled: true,
      gestureThreshold: 15
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

      console.log('Recognized gesture:', gestureType);

      // アクション実行
      const result = await this.executeAction(gestureType);
      
      return {
        success: result.success,
        gestureType: gestureType,
        action: result.action,
        error: result.error
      };

    } catch (error) {
      console.error('Gesture execution failed:', error);
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