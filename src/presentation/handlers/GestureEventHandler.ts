/**
 * GestureEventHandler
 * マウスイベントの処理を担当するPresentation層コンポーネント
 */

import { GestureSettingsFactory } from '../../domain/definitions/GestureConstants';

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

interface GestureState {
  isRecording: boolean;
  trail: Point[];
  startPosition: Point | null;
  preventContextMenu: boolean;
}

interface HandlerSettings {
  enabled: boolean;
  gestureThreshold: number;
}

interface GestureCallbacks {
  onGestureStart?: (startPosition: Point) => void;
  onGestureMove?: (currentPoint: Point, trail: Point[]) => void;
  onGestureEnd?: (trail: Point[], totalDistance: number) => void;
  onContextMenu?: (e: MouseEvent) => void;
}

interface GestureDebugInfo {
  isInitialized: boolean;
  isRecording: boolean;
  trailLength: number;
  totalDistance: number;
  settings: HandlerSettings;
  hasCallbacks: {
    onGestureStart: boolean;
    onGestureMove: boolean;
    onGestureEnd: boolean;
    onContextMenu: boolean;
  };
  className: string;
}

export class GestureEventHandler {
  private gestureState: GestureState;
  private settings: HandlerSettings;
  private callbacks: Required<GestureCallbacks>;
  private isInitialized: boolean = false;

  constructor() {
    this.gestureState = {
      isRecording: false,
      trail: [],
      startPosition: null,
      preventContextMenu: false,
    };
    this.settings = {
      enabled: true,
      gestureThreshold: GestureSettingsFactory.createDefaultSettings().gestureThreshold,
    };
    this.callbacks = {
      onGestureStart: () => {},
      onGestureMove: () => {},
      onGestureEnd: () => {},
      onContextMenu: () => {},
    };
  }

  /**
   * イベントリスナーを初期化
   * @param callbacks - コールバック関数群
   */
  initialize(callbacks: GestureCallbacks = {}): void {
    this.callbacks = {
      ...this.callbacks,
      ...(callbacks.onGestureStart && { onGestureStart: callbacks.onGestureStart }),
      ...(callbacks.onGestureMove && { onGestureMove: callbacks.onGestureMove }),
      ...(callbacks.onGestureEnd && { onGestureEnd: callbacks.onGestureEnd }),
      ...(callbacks.onContextMenu && { onContextMenu: callbacks.onContextMenu }),
    };

    // マウスイベントリスナーを設定
    document.addEventListener('mousedown', this.onMouseDown.bind(this), true);
    document.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    document.addEventListener('mouseup', this.onMouseUp.bind(this), true);
    document.addEventListener('contextmenu', this.onContextMenu.bind(this), true);

    // ジェスチャー中断イベント（軌跡残り防止）
    // mouseleaveは誤発火しやすいため削除し、visibilitychangeのみ使用
    document.addEventListener('visibilitychange', this.onVisibilityChange.bind(this));

    // ウィンドウリサイズ対応
    window.addEventListener('resize', this.onWindowResize.bind(this));

    this.isInitialized = true;
    console.log('GestureEventHandler initialized');
  }

  /**
   * マウスダウンイベント
   */
  private onMouseDown(e: MouseEvent): void {
    if (!this.settings.enabled || e.button !== 2) return; // 右クリック以外は無視

    this.gestureState.isRecording = true;
    this.gestureState.startPosition = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    };
    this.gestureState.trail = [
      {
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now(),
      },
    ];
    this.gestureState.preventContextMenu = false;

    // コールバック実行
    if (this.callbacks.onGestureStart) {
      this.callbacks.onGestureStart(this.gestureState.startPosition);
    }
  }

  /**
   * マウスムーブイベント
   */
  private onMouseMove(e: MouseEvent): void {
    if (!this.gestureState.isRecording) return;

    const newPoint: Point = {
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    };
    this.gestureState.trail.push(newPoint);

    // 十分な移動距離があるかチェック
    if (this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      this.gestureState.preventContextMenu = true;
    }

    // コールバック実行
    if (this.callbacks.onGestureMove) {
      this.callbacks.onGestureMove(newPoint, [...this.gestureState.trail]);
    }
  }

  /**
   * マウスアップイベント
   */
  private onMouseUp(e: MouseEvent): void {
    if (!this.gestureState.isRecording) return;

    this.gestureState.isRecording = false;
    const trail = [...this.gestureState.trail];
    const totalDistance = this.calculateTrailDistance();

    // コールバック実行（どのボタンでも軌跡をクリア）
    if (this.callbacks.onGestureEnd) {
      this.callbacks.onGestureEnd(trail, totalDistance);
    }

    // preventContextMenuフラグを保持して遅延リセット
    const shouldPreventContext = this.gestureState.preventContextMenu;
    this.resetGestureState();

    // 右クリックの場合のみコンテキストメニュー制御フラグを保持
    if (e.button === 2 && shouldPreventContext) {
      this.gestureState.preventContextMenu = true;
      setTimeout(() => {
        this.gestureState.preventContextMenu = false;
      }, 50); // 50ms後にリセット
    }
  }

  /**
   * コンテキストメニューイベント
   */
  private onContextMenu(e: MouseEvent): boolean | void {
    if (this.gestureState.preventContextMenu) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      // コールバック実行
      if (this.callbacks.onContextMenu) {
        this.callbacks.onContextMenu(e);
      }

      return false;
    }
  }

  /**
   * ページ可視性変更イベント
   */
  private onVisibilityChange(): void {
    if (document.hidden && this.gestureState.isRecording) {
      // ページが非表示になった場合のみジェスチャーをキャンセル
      const trail = [...this.gestureState.trail];
      const totalDistance = this.calculateTrailDistance();

      // ジェスチャー終了コールバックを実行（軌跡をクリア）
      if (this.callbacks.onGestureEnd) {
        this.callbacks.onGestureEnd(trail, totalDistance);
      }

      this.resetGestureState();
    }
  }

  /**
   * ウィンドウリサイズイベント
   */
  private onWindowResize(): void {
    // 必要に応じてサイズ関連の処理を実行
    // 現在はCanvasRendererAdapterが処理するため空実装
  }

  /**
   * 軌跡の総移動距離を計算
   */
  private calculateTrailDistance(): number {
    const trail = this.gestureState.trail;
    if (trail.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1];
      const current = trail[i];
      const dx = current.x - prev.x;
      const dy = current.y - prev.y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }

    return totalDistance;
  }

  /**
   * ジェスチャー状態をリセット
   */
  private resetGestureState(): void {
    this.gestureState.isRecording = false;
    this.gestureState.trail = [];
    this.gestureState.startPosition = null;
    this.gestureState.preventContextMenu = false;
  }

  /**
   * 設定を更新
   */
  updateSettings(newSettings: Partial<HandlerSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * ジェスチャー記録中かどうか
   */
  isRecording(): boolean {
    return this.gestureState.isRecording;
  }

  /**
   * 現在の軌跡を取得
   */
  getCurrentTrail(): Point[] {
    return [...this.gestureState.trail];
  }

  /**
   * 現在のジェスチャー状態を取得
   */
  getGestureState(): GestureState {
    return { ...this.gestureState };
  }

  /**
   * イベントリスナーを削除
   */
  destroy(): void {
    if (this.isInitialized) {
      document.removeEventListener('mousedown', this.onMouseDown, true);
      document.removeEventListener('mousemove', this.onMouseMove, true);
      document.removeEventListener('mouseup', this.onMouseUp, true);
      document.removeEventListener('contextmenu', this.onContextMenu, true);
      document.removeEventListener('visibilitychange', this.onVisibilityChange);
      window.removeEventListener('resize', this.onWindowResize);

      this.resetGestureState();
      this.isInitialized = false;
      console.log('GestureEventHandler destroyed');
    }
  }

  /**
   * デバッグ情報を取得
   */
  getDebugInfo(): GestureDebugInfo {
    return {
      isInitialized: this.isInitialized,
      isRecording: this.gestureState.isRecording,
      trailLength: this.gestureState.trail.length,
      totalDistance: this.calculateTrailDistance(),
      settings: this.settings,
      hasCallbacks: {
        onGestureStart: Boolean(this.callbacks.onGestureStart),
        onGestureMove: Boolean(this.callbacks.onGestureMove),
        onGestureEnd: Boolean(this.callbacks.onGestureEnd),
        onContextMenu: Boolean(this.callbacks.onContextMenu),
      },
      className: 'GestureEventHandler',
    };
  }
}
