/**
 * Clean Architecture対応ジェスチャーマネージャー (リファクタリング版)
 * Single Responsibility: 各コンポーネントの協調とライフサイクル管理
 */

import type { Point, AppSettings } from './types';
import { SettingsManager } from './SettingsManager';
import { CanvasManager } from './CanvasManager';
import { EventHandler, EventHandlerDelegate } from './EventHandler';
import { GestureRecognizer } from './GestureRecognizer';
import { MessageHandler } from './MessageHandler';
import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';

/**
 * Clean Architecture統合ジェスチャーマネージャー
 * Open/Closed Principle: 新しい機能は新しいクラスで追加
 * Dependency Inversion: 抽象に依存、具象に依存しない
 */
export class CleanGestureManager implements EventHandlerDelegate {
  private settingsManager: SettingsManager;
  private canvasManager: CanvasManager | null = null;
  private eventHandler: EventHandler | null = null;
  private gestureRecognizer: GestureRecognizer | null = null;
  private messageHandler: MessageHandler | null = null;
  private logger: DebugLogger | null = null;
  
  private isInitialized: boolean = false;

  constructor() {
    this.settingsManager = new SettingsManager();
  }

  /**
   * 初期化 - Dependency Injection
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // 1. 設定読み込み
      await this.settingsManager.initialize();
      const settings = this.settingsManager.getSettings();

      // 2. 除外サイトチェック
      if (this.settingsManager.isExcludedSite()) {
        console.log('Site is excluded from gesture recognition');
        return;
      }

      // 3. 機能が無効な場合は初期化しない
      if (!this.settingsManager.isEnabled()) {
        console.log('Gesture recognition is disabled');
        return;
      }

      // 4. 各コンポーネント初期化
      await this.initializeComponents(settings);
      
      // 5. イベントリスナー設定
      this.setupEventListeners();

      this.isInitialized = true;
      console.log('CleanGestureManager initialized successfully');

    } catch (error) {
      console.error('CleanGestureManager initialization failed:', error);
      throw error;
    }
  }

  /**
   * コンポーネント初期化
   */
  private async initializeComponents(settings: AppSettings): Promise<void> {
    // Canvas管理
    this.canvasManager = new CanvasManager(settings);
    this.canvasManager.initialize();

    // イベント処理
    this.eventHandler = new EventHandler(settings, this);

    // ジェスチャー認識
    this.gestureRecognizer = new GestureRecognizer(this.settingsManager);
    await this.gestureRecognizer.initialize();

    // メッセージ処理
    this.messageHandler = new MessageHandler();
    this.messageHandler.initialize();

    // デバッグロガー
    if (settings.debugSettings?.enabled) {
      this.logger = new DebugLogger({
        logLevel: settings.debugSettings.logLevel as 0 | 1 | 2 | 3,
        shouldLog: (level) => settings.debugSettings!.enabled && level <= settings.debugSettings!.logLevel
      });
    }
  }

  /**
   * イベントリスナー設定
   */
  private setupEventListeners(): void {
    if (this.eventHandler) {
      this.eventHandler.setupEventListeners();
    }
  }

  /**
   * EventHandlerDelegate実装 - ジェスチャー開始
   */
  onGestureStart(_point: Point): void {
    this.logger?.debug('Gesture started');
  }

  /**
   * EventHandlerDelegate実装 - ジェスチャー移動
   */
  onGestureMove(point: Point): void {
    if (this.eventHandler && this.canvasManager) {
      const gestureState = this.eventHandler.getGestureState();
      this.canvasManager.drawTrail(gestureState.trail);
    }
  }

  /**
   * EventHandlerDelegate実装 - ジェスチャー終了
   */
  async onGestureEnd(trail: Point[]): Promise<void> {
    try {
      // Canvas クリア
      if (this.canvasManager) {
        this.canvasManager.clear();
      }

      // ジェスチャー認識と実行
      if (this.gestureRecognizer) {
        const result = await this.gestureRecognizer.recognizeAndExecute(trail);
        this.logger?.info('Gesture recognition result:', result);
      }

    } catch (error) {
      this.logger?.error('Gesture end processing failed:', error);
    }
  }

  /**
   * 設定更新
   */
  async updateSettings(): Promise<void> {
    await this.settingsManager.initialize();
    const settings = this.settingsManager.getSettings();

    // 各コンポーネントの設定更新
    if (this.canvasManager) {
      this.canvasManager.updateSettings(settings);
    }
    if (this.eventHandler) {
      this.eventHandler.updateSettings(settings);
    }
    if (this.gestureRecognizer) {
      this.gestureRecognizer.updateSettings(settings);
    }
  }

  /**
   * リソース解放
   */
  dispose(): void {
    if (this.eventHandler) {
      this.eventHandler.removeEventListeners();
    }
    if (this.canvasManager) {
      this.canvasManager.dispose();
    }
    if (this.messageHandler) {
      this.messageHandler.dispose();
    }
    
    this.isInitialized = false;
  }

  /**
   * 初期化状態確認
   */
  getInitialized(): boolean {
    return this.isInitialized;
  }
}