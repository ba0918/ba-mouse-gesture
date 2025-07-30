/**
 * イベント処理管理
 * Single Responsibility: マウスイベントの処理とジェスチャー状態管理
 */

import type { Point, GestureState, AppSettings } from './types';

export interface EventHandlerDelegate {
  onGestureStart(point: Point): void;
  onGestureMove(point: Point): void;
  onGestureEnd(trail: Point[]): void;
}

export class EventHandler {
  private gestureState: GestureState;

  constructor(
    private settings: AppSettings,
    private delegate: EventHandlerDelegate
  ) {
    this.gestureState = {
      isRecording: false,
      trail: [],
      startPosition: null,
      preventContextMenu: false
    };
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners(): void {
    document.addEventListener('contextmenu', this.onContextMenu.bind(this));
    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
  }

  /**
   * イベントリスナー削除
   */
  removeEventListeners(): void {
    document.removeEventListener('contextmenu', this.onContextMenu.bind(this));
    document.removeEventListener('mousedown', this.onMouseDown.bind(this));
    document.removeEventListener('mousemove', this.onMouseMove.bind(this));
    document.removeEventListener('mouseup', this.onMouseUp.bind(this));
  }

  /**
   * コンテキストメニュー無効化
   */
  private onContextMenu(e: MouseEvent): void {
    if (this.gestureState.preventContextMenu) {
      e.preventDefault();
      this.gestureState.preventContextMenu = false;
    }
  }

  /**
   * マウスダウン処理
   */
  private onMouseDown(e: MouseEvent): void {
    if (e.button === 2) { // 右クリック
      const point: Point = {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      };

      this.gestureState.isRecording = true;
      this.gestureState.trail = [point];
      this.gestureState.startPosition = point;
      this.gestureState.preventContextMenu = false;

      this.delegate.onGestureStart(point);
    }
  }

  /**
   * マウス移動処理
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.gestureState.isRecording) return;

    const point: Point = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now()
    };

    // 最初の移動で閾値をチェック
    if (this.gestureState.trail.length === 1 && this.gestureState.startPosition) {
      const distance = this.calculateDistance(this.gestureState.startPosition, point);
      if (distance > this.settings.gestureThreshold) {
        this.gestureState.preventContextMenu = true;
      }
    }

    this.gestureState.trail.push(point);
    this.delegate.onGestureMove(point);
  }

  /**
   * マウスアップ処理
   */
  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2 && this.gestureState.isRecording) {
      this.gestureState.isRecording = false;
      
      if (this.gestureState.trail.length > 1) {
        this.delegate.onGestureEnd([...this.gestureState.trail]);
      }

      // 状態リセット
      this.gestureState.trail = [];
      this.gestureState.startPosition = null;
    }
  }

  /**
   * 2点間の距離計算
   */
  private calculateDistance(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 現在のジェスチャー状態取得
   */
  getGestureState(): Readonly<GestureState> {
    return { ...this.gestureState };
  }

  /**
   * 設定更新
   */
  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }
}