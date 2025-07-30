/**
 * RenderingService Interface
 * Application層の描画機能抽象化
 */

export interface Point {
  x: number
  y: number
}

export interface DrawStyle {
  color: string
  width: number
}

/**
 * 描画サービスのインターフェース
 */
export interface RenderingService {
  /**
   * Canvas初期化
   */
  initializeCanvas(): boolean

  /**
   * 描画スタイルを更新
   */
  updateStyle(style: DrawStyle): void

  /**
   * 軌跡を描画
   */
  drawTrail(trail: Point[], style: DrawStyle): void

  /**
   * Canvasを遅延クリア
   */
  clearCanvasWithDelay(delay: number): void

  /**
   * Canvasを即座にクリア
   */
  clearCanvas(): void

  /**
   * Canvas要素を取得
   */
  getCanvasElement(): HTMLCanvasElement | null
}