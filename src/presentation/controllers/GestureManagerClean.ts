/**
 * GestureManagerClean
 * Clean Architecture準拠のGestureManager
 * 依存性注入によるアダプターパターン適用
 */

import { GestureEventHandler } from '../handlers/GestureEventHandler.js';
import { SimpleGestureUseCase } from '../../application/usecases/SimpleGestureUseCase.js';
import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer.js';

// Application層インターフェース
import { MessagingService } from '../../application/interfaces/MessagingService';
import { RenderingService, Point, DrawStyle } from '../../application/interfaces/RenderingService';
import { SettingsService, GestureSettings } from '../../application/interfaces/SettingsService';

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
export class GestureManagerClean {
  // Application層サービス（依存性注入）
  private messagingService: MessagingService;
  private renderingService: RenderingService;
  private settingsService: SettingsService;

  // Presentation層コンポーネント
  private eventHandler: GestureEventHandler | null = null;
  
  // Application層UseCase
  private gestureUseCase: SimpleGestureUseCase | null = null;
  
  // デバッグ要素（将来の拡張用）
  // private debugElement: HTMLElement | null = null;

  // 設定
  private settings: GestureSettings = {
    enabled: true,
    strokeColor: '#2196F3',
    strokeWidth: 3,
    gestureThreshold: 15,
    excludeList: []
  };

  private isInitialized: boolean = false;

  /**
   * コンストラクタ - 依存性注入
   */
  constructor(
    messagingService: MessagingService,
    renderingService: RenderingService,
    settingsService: SettingsService
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
      console.log('🏗️ GestureManagerClean: Initializing...');

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
      const gestureRecognizer = new SimpleGestureRecognizer(this.settings.gestureThreshold);

      // Application層の初期化
      this.gestureUseCase = new SimpleGestureUseCase(gestureRecognizer, this.messagingService);
      this.gestureUseCase?.updateSettings(this.settings);

      // Presentation層の初期化
      this.eventHandler = new GestureEventHandler();
      this.eventHandler?.updateSettings(this.settings);

      // イベントハンドラーのコールバック設定
      const callbacks: GestureCallbacks = {
        onGestureStart: this.onGestureStart.bind(this),
        onGestureMove: this.onGestureMove.bind(this),
        onGestureEnd: this.onGestureEnd.bind(this),
        onContextMenu: this.onContextMenu.bind(this)
      };

      this.eventHandler?.initialize(callbacks);

      // メッセージリスナー設定
      this.setupMessageListener();

      // 設定変更監視
      this.watchSettingsChanges();

      // デバッグ表示初期化
      this.initializeDebugDisplay();

      this.isInitialized = true;
      console.log('✅ GestureManagerClean: Initialization complete');
      return true;

    } catch (error) {
      console.error('❌ GestureManagerClean: Initialization failed:', error);
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
      width: this.settings.strokeWidth
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
      width: this.settings.strokeWidth
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

      // ジェスチャー認識・実行（実装は今後追加）
      console.log('Gesture recognized with trail length:', trail.length, 'distance:', totalDistance);

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
    this.messagingService.addMessageListener((message) => {
      console.log('Message received:', message);
      // メッセージ処理ロジック
    });
  }

  /**
   * 設定変更監視
   */
  private watchSettingsChanges(): void {
    this.settingsService.watchSettingsChanges((newSettings) => {
      this.settings = newSettings;
      this.updateComponentSettings();
      console.log('Settings updated:', newSettings);
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
    if (this.settings.debugSettings?.enabled) {
      // デバッグ表示の初期化処理
      console.log('Debug display initialized');
    }
  }

  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.messagingService.removeMessageListener();
    // this.eventHandler?.cleanup?.(); // cleanupメソッドが存在しない場合
    this.isInitialized = false;
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
        settingsService: this.settingsService
      },
      className: 'GestureManagerClean'
    };
  }
}