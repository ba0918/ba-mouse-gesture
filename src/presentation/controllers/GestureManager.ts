/**
 * GestureManager
 * Clean Architecture準拠のGestureManager
 * 依存性注入によるアダプターパターン適用
 */

import { GestureExecutionUseCase } from '../../application/usecases/GestureExecutionUseCase.js';
import { GestureRecognizer } from '../../domain/services/GestureRecognizer.js';
import { GestureEventHandler } from '../handlers/GestureEventHandler.js';

// Application層インターフェース
import { IMessagingService } from '../../application/interfaces/IMessagingService';
import { DrawStyle, Point, RenderingService } from '../../application/interfaces/RenderingService';
import { GestureSettings, SettingsService } from '../../application/interfaces/SettingsService';
import { GestureSettingsFactory } from '../../domain/definitions/GestureConstants';

// 型定義
interface GestureCallbacks {
  onGestureStart: (startPosition: Point) => void;
  onGestureMove: (currentPoint: Point, trail: Point[]) => void;
  onGestureEnd: (trail: Point[], totalDistance: number) => Promise<void>;
  onContextMenu: () => void;
}

interface DebugInfo {
  isInitialized: boolean;
  settings: GestureSettings;
  components: {
    eventHandler?: unknown;
    gestureUseCase?: unknown;
    messagingService?: unknown;
    renderingService?: unknown;
    settingsService?: unknown;
  };
  className: string;
}

/**
 * Clean Architecture準拠のGestureManager
 * 依存性注入により各層を疎結合で統合
 */
export class GestureManager {
  // Application層サービス（依存性注入）
  private messagingService: IMessagingService;
  private renderingService: RenderingService;
  private settingsService: SettingsService;

  // Presentation層コンポーネント
  private eventHandler: GestureEventHandler | null = null;

  // Application層UseCase
  private gestureUseCase: GestureExecutionUseCase | null = null;

  // デバッグ要素
  private debugElement: HTMLElement | null = null;

  // 設定
  private settings: GestureSettings = GestureSettingsFactory.createDefaultSettings();

  private isInitialized: boolean = false;

  /**
   * コンストラクタ - 依存性注入
   */
  constructor(
    messagingService: IMessagingService,
    renderingService: RenderingService,
    settingsService: SettingsService,
  ) {
    this.messagingService = messagingService;
    this.renderingService = renderingService;
    this.settingsService = settingsService;
  }

  /**
   * 初期化
   * @returns 初期化成功可否
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🏗️ GestureManager: Initializing...');

      // 設定を読み込み
      await this.loadSettings();

      // 除外サイトチェック
      if (this.settingsService.isExcludedSite()) {
        console.log('Site excluded, disabling gestures');
        return false;
      }

      // Rendering層の初期化
      const renderingInitialized = this.renderingService.initializeCanvas();
      if (!renderingInitialized) {
        throw new Error('Rendering service initialization failed');
      }

      // Domain層の初期化
      const gestureRecognizer = new GestureRecognizer(this.settings.gestureThreshold);

      // Application層の初期化
      this.gestureUseCase = new GestureExecutionUseCase(gestureRecognizer, this.messagingService);
      this.gestureUseCase?.updateSettings(this.settings);

      // Presentation層の初期化
      this.eventHandler = new GestureEventHandler();
      this.eventHandler?.updateSettings(this.settings);

      // イベントハンドラーのコールバック設定
      const callbacks: GestureCallbacks = {
        onGestureStart: this.onGestureStart.bind(this),
        onGestureMove: this.onGestureMove.bind(this),
        onGestureEnd: this.onGestureEnd.bind(this),
        onContextMenu: this.onContextMenu.bind(this),
      };

      this.eventHandler?.initialize(callbacks);

      // メッセージリスナー設定
      this.setupMessageListener();

      // 設定変更監視
      this.watchSettingsChanges();

      // デバッグ表示初期化
      this.initializeDebugDisplay();

      this.isInitialized = true;
      console.log('✅ GestureManager: Initialization complete');
      return true;
    } catch (error) {
      console.error('❌ GestureManager: Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      this.settings = await this.settingsService.loadSettings();
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * ジェスチャー開始時の処理
   */
  private onGestureStart(startPosition: Point): void {
    if (!this.settings.enabled) return;

    // 描画スタイル更新
    this.renderingService.updateStyle({
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth,
    });

    console.log('Gesture started at:', startPosition);
  }

  /**
   * ジェスチャー移動時の処理
   */
  private onGestureMove(_currentPoint: Point, trail: Point[]): void {
    if (!this.settings.enabled) return;

    // 軌跡を描画
    const style: DrawStyle = {
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth,
    };

    this.renderingService.drawTrail(trail, style);
  }

  /**
   * ジェスチャー終了時の処理
   */
  private async onGestureEnd(trail: Point[], totalDistance: number): Promise<void> {
    if (!this.settings.enabled || !this.gestureUseCase) return;

    try {
      // Canvas遅延クリア
      this.renderingService.clearCanvasWithDelay(200);

      // ジェスチャー認識・実行
      if (trail.length >= 2 && totalDistance >= this.settings.gestureThreshold) {
        const result = await this.gestureUseCase.executeGesture(trail);

        if (result.success) {
          console.log('Gesture executed successfully:', result.gestureType, result.action);
          this.showDebugMessage(`Gesture: ${result.gestureType} → ${result.action}`);
        } else {
          console.log('Gesture execution failed:', result.error);
          this.showDebugMessage(`Failed: ${result.error}`);
        }
      }
    } catch (error) {
      console.error('Gesture execution failed:', error);
    }
  }

  /**
   * コンテキストメニュー処理
   */
  private onContextMenu(): void {
    // 右クリックメニューの処理
    console.log('Context menu');
  }

  /**
   * メッセージリスナー設定
   */
  private setupMessageListener(): void {
    this.messagingService.addMessageListener(
      (message: unknown, _sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
        // 型チェック
        if (!message || typeof message !== 'object') {
          sendResponse({ success: false });
          return true;
        }

        const typedMessage = message as { type: string; direction?: string };
        if (typedMessage.type === 'scroll' && typedMessage.direction) {
          this.handleScrollMessage(typedMessage.direction);
          sendResponse({ success: true });
          return true;
        }
        return false;
      },
    );
  }

  /**
   * スクロール処理
   * @param direction スクロール方向
   */
  private handleScrollMessage(direction: string): void {
    try {
      if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (direction === 'bottom') {
        window.scrollTo({
          top: document.documentElement.scrollHeight,
          behavior: 'smooth',
        });
      }
    } catch (error) {
      console.error('Scroll failed:', error);
    }
  }

  /**
   * 設定変更監視
   */
  private watchSettingsChanges(): void {
    this.settingsService.watchSettingsChanges((newSettings) => {
      this.settings = newSettings;
      this.updateComponentSettings();
      console.log('Settings updated:', newSettings);

      // デバッグ表示の更新
      if (newSettings.debugSettings?.enabled && newSettings.debugSettings?.showStatus) {
        if (!this.debugElement) {
          this.initializeDebugDisplay();
        }
      } else if (this.debugElement) {
        this.debugElement.remove();
        this.debugElement = null;
      }
    });
  }

  /**
   * コンポーネント設定更新
   */
  private updateComponentSettings(): void {
    this.eventHandler?.updateSettings(this.settings);
    this.gestureUseCase?.updateSettings(this.settings);
  }

  /**
   * デバッグ表示初期化
   */
  private initializeDebugDisplay(): void {
    if (!this.settings.debugSettings?.enabled || !this.settings.debugSettings?.showStatus) {
      return;
    }

    this.debugElement = document.createElement('div');
    this.debugElement.id = 'gesture-debug-display';
    this.debugElement.style.cssText = `
      position: fixed;
      z-index: 999999;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 8px;
      border-radius: 4px;
      max-width: 300px;
      max-height: 150px;
      overflow-y: auto;
      pointer-events: none;
    `;

    // 位置設定
    const position = this.settings.debugSettings.statusPosition || 'top-right';
    switch (position) {
      case 'top-left':
        this.debugElement.style.top = '10px';
        this.debugElement.style.left = '10px';
        break;
      case 'top-right':
        this.debugElement.style.top = '10px';
        this.debugElement.style.right = '10px';
        break;
      case 'bottom-left':
        this.debugElement.style.bottom = '10px';
        this.debugElement.style.left = '10px';
        break;
      case 'bottom-right':
        this.debugElement.style.bottom = '10px';
        this.debugElement.style.right = '10px';
        break;
    }

    document.body.appendChild(this.debugElement);
    this.showDebugMessage('Debug display initialized');
  }

  /**
   * デバッグメッセージ表示
   */
  private showDebugMessage(message: string): void {
    if (!this.debugElement || !this.settings.debugSettings?.enabled || !this.settings.debugSettings?.showStatus) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.textContent = `[${timestamp}] ${message}`;
    entry.style.marginBottom = '4px';

    this.debugElement.appendChild(entry);

    // 最大20件までのメッセージを保持
    while (this.debugElement.children.length > 20) {
      this.debugElement.removeChild(this.debugElement.firstChild!);
    }

    // 自動スクロール
    this.debugElement.scrollTop = this.debugElement.scrollHeight;
  }

  /**
   * リソース解放
   */
  destroy(): void {
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }

    // デバッグ要素を削除
    if (this.debugElement) {
      this.debugElement.remove();
      this.debugElement = null;
    }

    this.messagingService.removeMessageListener();

    // Clean Architecture: サービス層のクリーンアップは各サービス自身の責任
    // ここではプレゼンテーション層のリソースのみ解放
    this.gestureUseCase = null;
    this.isInitialized = false;

    console.log('GestureManager destroyed');
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): DebugInfo {
    return {
      isInitialized: this.isInitialized,
      settings: this.settings,
      components: {
        eventHandler: this.eventHandler,
        gestureUseCase: this.gestureUseCase,
        messagingService: this.messagingService,
        renderingService: this.renderingService,
        settingsService: this.settingsService,
      },
      className: 'GestureManager',
    };
  }
}
