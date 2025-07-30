/**
 * Canvas描画管理
 * Single Responsibility: Canvas操作とジェスチャー軌跡描画
 */

import type { Point, AppSettings } from './types';
import { CanvasRendererAdapter } from '../../infrastructure/adapters/CanvasRendererAdapter';

export class CanvasManager {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private canvasRenderer: CanvasRendererAdapter | null = null;

  constructor(private settings: AppSettings) {}

  /**
   * Canvas初期化
   */
  initialize(): void {
    try {
      this.canvasRenderer = new CanvasRendererAdapter();
      this.canvasRenderer.initializeCanvas();
      this.canvas = this.canvasRenderer.getCanvas();
      this.ctx = this.canvasRenderer.getContext();
      
      if (this.canvas) {
        document.body.appendChild(this.canvas);
      }
    } catch (error) {
      console.warn('CanvasRendererAdapter initialization failed, using fallback:', error);
      this.initializeFallback();
    }
  }

  /**
   * フォールバック初期化
   */
  private initializeFallback(): void {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'fixed';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100vw';
    this.canvas.style.height = '100vh';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '999999';
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    
    this.ctx = this.canvas.getContext('2d');
    if (this.ctx) {
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
    }
    
    document.body.appendChild(this.canvas);
  }

  /**
   * 軌跡を描画
   */
  drawTrail(trail: Point[]): void {
    if (!this.ctx || !this.canvas || trail.length < 2) return;

    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.drawTrail(trail.map(p => ({ x: p.x, y: p.y })), {
          color: this.settings.strokeColor,
          width: this.settings.strokeWidth
        });
      } else {
        this.drawTrailFallback(trail);
      }
    } catch (error) {
      console.warn('CanvasRenderer drawing failed, using fallback:', error);
      this.drawTrailFallback(trail);
    }
  }

  /**
   * フォールバック描画
   */
  private drawTrailFallback(trail: Point[]): void {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
    this.ctx.strokeStyle = this.settings.strokeColor;
    this.ctx.lineWidth = this.settings.strokeWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(trail[0].x, trail[0].y);
    
    for (let i = 1; i < trail.length; i++) {
      this.ctx.lineTo(trail[i].x, trail[i].y);
    }
    
    this.ctx.stroke();
  }

  /**
   * Canvas クリア
   */
  clear(): void {
    if (this.canvasRenderer) {
      this.canvasRenderer.clearCanvas();
    } else if (this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * Canvas削除
   */
  dispose(): void {
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.canvasRenderer = null;
  }

  /**
   * 設定更新
   */
  updateSettings(settings: AppSettings): void {
    this.settings = settings;
  }
}