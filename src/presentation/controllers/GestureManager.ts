/**
 * GestureManager
 * 全レイヤーを統合するPresentation層のメインコントローラー
 */

import { GestureEventHandler } from '../handlers/GestureEventHandler.js';
import { SimpleGestureUseCase } from '../../application/usecases/SimpleGestureUseCase.js';
import { SimpleMessagingAdapter } from '../../infrastructure/adapters/SimpleMessagingAdapter.js';
import { CanvasRendererAdapter } from '../../infrastructure/adapters/CanvasRendererAdapter.js';
import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer.js';

// 型定義
interface Settings {
  enabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  gestureThreshold: number;
  excludeList: string[];
  defaultGestureStates?: Record<string, boolean>;
  debugSettings?: {
    enabled: boolean;
    logLevel: number;
    showStatus: boolean;
    statusPosition: string;
  };
}

interface Point {
  x: number;
  y: number;
}

interface DrawStyle {
  color: string;
  width: number;
}

interface DebugInfo {
  isInitialized: boolean;
  settings: Settings;
  components: {
    eventHandler?: any;
    gestureUseCase?: any;
    messagingAdapter?: any;
    canvasRenderer?: any;
  };
  className: string;
}

interface GestureCallbacks {
  onGestureStart: (startPosition: Point) => void;
  onGestureMove: (currentPoint: Point, trail: Point[]) => void;
  onGestureEnd: (trail: Point[], totalDistance: number) => Promise<void>;
  onContextMenu: () => void;
}

export class GestureManager {
  private eventHandler: GestureEventHandler | null = null;
  private gestureUseCase: SimpleGestureUseCase | null = null;
  private messagingAdapter: SimpleMessagingAdapter | null = null;
  private canvasRenderer: CanvasRendererAdapter | null = null;
  private debugElement: HTMLElement | null = null;

  private settings: Settings = {
    enabled: true,
    strokeColor: '#2196F3',
    strokeWidth: 3,
    gestureThreshold: 15,
    excludeList: []
  };

  private isInitialized: boolean = false;

  constructor() { }

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
      if (this.isExcludedSite()) {
        console.log('Site excluded, disabling gestures');
        return false;
      }

      // Infrastructure層の初期化
      this.messagingAdapter = new SimpleMessagingAdapter();
      this.canvasRenderer = new CanvasRendererAdapter();

      // Canvas初期化
      const canvasInitialized = this.canvasRenderer?.initializeCanvas();
      if (!canvasInitialized) {
        throw new Error('Canvas initialization failed');
      }

      // Domain層の初期化
      const gestureRecognizer = new SimpleGestureRecognizer(this.settings.gestureThreshold);

      // Application層の初期化
      this.gestureUseCase = new SimpleGestureUseCase(gestureRecognizer, this.messagingAdapter);
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
      console.log('✅ GestureManager: Initialization complete');
      return true;

    } catch (error) {
      console.error('❌ GestureManager: Initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * ジェスチャー開始時の処理
   * @param startPosition 開始位置
   */
  private onGestureStart(startPosition: Point): void {
    if (!this.settings.enabled || !this.canvasRenderer) return;

    // Canvas描画スタイル更新
    this.canvasRenderer.updateStyle({
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth
    });

    console.log('Gesture started at:', startPosition);
  }

  /**
   * ジェスチャー移動時の処理
   * @param currentPoint 現在位置
   * @param trail 軌跡
   */
  private onGestureMove(currentPoint: Point, trail: Point[]): void {
    if (!this.settings.enabled || !this.canvasRenderer) return;

    // 軌跡を描画
    const style: DrawStyle = {
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth
    };

    this.canvasRenderer.drawTrail(trail, style);
  }

  /**
   * ジェスチャー終了時の処理
   * @param trail 軌跡
   * @param totalDistance 総移動距離
   */
  private async onGestureEnd(trail: Point[], totalDistance: number): Promise<void> {
    if (!this.settings.enabled || !this.canvasRenderer || !this.gestureUseCase) return;

    try {
      // Canvas遅延クリア
      this.canvasRenderer.clearCanvasWithDelay(200);

      // ジェスチャー認識・実行
      if (trail.length >= 2 && totalDistance >= this.settings.gestureThreshold) {
        const result = await this.gestureUseCase.executeGesture(trail);

        if (result.success) {
          console.log('Gesture executed successfully:', result.gestureType, result.action);
          this.showDebugMessage(`✓ ${result.gestureType} → ${result.action}`);
        } else {
          console.log('Gesture execution failed:', result.error);
          this.showDebugMessage(`✗ ${result.error}`);
        }
      }

    } catch (error) {
      console.error('Gesture end processing failed:', error);
    }
  }

  /**
   * コンテキストメニュー処理
   */
  private onContextMenu(): void {
    // 既にpreventDefaultは実行済み
    console.log('Context menu prevented');
  }

  /**
   * 設定を読み込み
   */
  private async loadSettings(): Promise<void> {
    try {
      // Clean Architecture 対応: appSettings キーを使用
      const result = await chrome.storage.sync.get(['appSettings', 'settings']);
      let settingsData: any = null;

      // 新しい構成 (Clean Architecture) を優先
      if (result.appSettings) {
        settingsData = result.appSettings;
        console.log('Settings loaded from appSettings (Clean Architecture)');
      } else if (result.settings) {
        // 後方互換性のために古い構成もサポート
        settingsData = result.settings;
        console.log('Settings loaded from settings (legacy)');
      }

      if (settingsData) {
        this.settings = {
          enabled: settingsData.enabled ?? true,
          strokeColor: settingsData.strokeColor || '#2196F3',
          strokeWidth: settingsData.strokeWidth || 3,
          gestureThreshold: settingsData.gestureThreshold || 15,
          excludeList: settingsData.excludeList || [],
          defaultGestureStates: settingsData.defaultGestureStates || {},
          debugSettings: settingsData.debugSettings || {
            enabled: false,
            logLevel: 2,
            showStatus: false,
            statusPosition: 'top-right'
          }
        };
      }
      console.log('Settings loaded:', this.settings);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  /**
   * 除外サイトチェック
   * @returns 除外対象かどうか
   */
  private isExcludedSite(): boolean {
    const currentUrl = window.location.href;
    const currentHost = window.location.hostname;

    return this.settings.excludeList.some(pattern => {
      // 完全URL マッチ
      if (pattern.includes('://')) {
        return currentUrl.includes(pattern) || currentUrl.match(pattern.replace(/\*/g, '.*'));
      }
      // ホスト名マッチ
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(currentHost);
      }
      // 部分マッチ
      return currentHost.includes(pattern);
    });
  }

  /**
   * backgroundスクリプトからのメッセージリスナー設定
   */
  private setupMessageListener(): void {
    if (this.messagingAdapter) {
      this.messagingAdapter.onMessage((message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        if (message.type === 'scroll') {
          this.handleScrollMessage(message.direction);
          sendResponse({ success: true });
          return true;
        }
        return false;
      });
    }
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
          behavior: 'smooth'
        });
      }
    } catch (error) {
      console.error('Scroll failed:', error);
    }
  }

  /**
   * 設定変更の監視
   */
  private watchSettingsChanges(): void {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
          // Clean Architecture 対応: appSettings と settings 両方を監視
          if (namespace === 'sync' && (changes.appSettings || changes.settings)) {
            console.log('Settings changed, reloading...');
            const settingsChange = changes.appSettings || changes.settings;
            this.updateSettings(settingsChange.newValue);
          }
        });
      }
    } catch (error) {
      console.error('Failed to setup settings watching:', error);
    }
  }

  /**
   * 設定を更新
   * @param newSettings 新しい設定
   */
  private updateSettings(newSettings: Partial<Settings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // デバッグ表示の更新
    this.updateDebugDisplay();

    // 各コンポーネントに設定を伝播
    if (this.eventHandler) {
      this.eventHandler.updateSettings(this.settings);
    }
    if (this.gestureUseCase) {
      this.gestureUseCase.updateSettings(this.settings);
    }

    console.log('Settings updated:', this.settings);
  }

  /**
   * 破棄処理
   */
  destroy(): void {
    if (this.eventHandler) {
      this.eventHandler.destroy();
      this.eventHandler = null;
    }

    if (this.canvasRenderer) {
      this.canvasRenderer.removeCanvas();
      this.canvasRenderer = null;
    }

    if (this.debugElement) {
      this.debugElement.remove();
      this.debugElement = null;
    }

    this.gestureUseCase = null;
    this.messagingAdapter = null;
    this.isInitialized = false;

    console.log('GestureManager destroyed');
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
    if (!this.debugElement || !this.settings.debugSettings?.enabled) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const logDiv = document.createElement('div');
    logDiv.textContent = `[${timestamp}] ${message}`;
    logDiv.style.marginBottom = '2px';

    this.debugElement.appendChild(logDiv);

    // 最大5件のメッセージを保持
    while (this.debugElement.children.length > 5) {
      this.debugElement.removeChild(this.debugElement.firstChild!);
    }

    this.debugElement.scrollTop = this.debugElement.scrollHeight;
  }

  /**
   * デバッグ表示更新
   */
  private updateDebugDisplay(): void {
    // 既存の表示を削除
    if (this.debugElement) {
      this.debugElement.remove();
      this.debugElement = null;
    }

    // 新しい設定で再初期化
    this.initializeDebugDisplay();
  }

  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo(): DebugInfo {
    return {
      isInitialized: this.isInitialized,
      settings: this.settings,
      components: {
        eventHandler: this.eventHandler?.getDebugInfo(),
        gestureUseCase: this.gestureUseCase?.getDebugInfo(),
        messagingAdapter: this.messagingAdapter?.getDebugInfo(),
        canvasRenderer: this.canvasRenderer?.getDebugInfo()
      },
      className: 'GestureManager'
    };
  }
}