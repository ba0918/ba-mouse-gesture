<script lang="ts">
  // Props
  interface BasicSettingsProps {
    enabled: boolean;
    strokeColor: string;
    strokeWidth: number;
    gestureThreshold: number;
    isLoading: boolean;
    onEnabledChange: (enabled: boolean) => Promise<void>;
    onStrokeColorChange: (color: string) => Promise<void>;
    onStrokeWidthChange: (width: number) => Promise<void>;
    onGestureThresholdChange: (threshold: number) => Promise<void>;
  }

  let {
    enabled = $bindable(),
    strokeColor = $bindable(),
    strokeWidth = $bindable(),
    gestureThreshold = $bindable(),
    isLoading,
    onEnabledChange,
    onStrokeColorChange,
    onStrokeWidthChange,
    onGestureThresholdChange
  }: BasicSettingsProps = $props();

  // ローカル状態
  let previewCanvas: HTMLCanvasElement;

  // プレビューキャンバスの更新
  function updatePreviewCanvas() {
    if (!previewCanvas || isLoading) return;
    
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // サンプル軌跡を描画
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(20, 40);
    ctx.lineTo(60, 20);
    ctx.lineTo(100, 40);
    ctx.lineTo(140, 20);
    ctx.stroke();
  }

  // 設定変更ハンドラー
  async function handleEnabledChange() {
    await onEnabledChange(enabled);
  }

  async function handleStrokeColorChange() {
    await onStrokeColorChange(strokeColor);
    updatePreviewCanvas();
  }

  async function handleStrokeWidthChange() {
    await onStrokeWidthChange(strokeWidth);
    updatePreviewCanvas();
  }

  async function handleGestureThresholdChange() {
    await onGestureThresholdChange(gestureThreshold);
  }

  // エフェクト
  $effect(() => {
    updatePreviewCanvas();
  });
</script>

<div class="basic-settings">
  <h2 class="section-title">基本設定</h2>
  
  <!-- 機能有効/無効 -->
  <div class="setting-group">
    <label class="switch">
      <input
        type="checkbox"
        bind:checked={enabled}
        onchange={handleEnabledChange}
        disabled={isLoading}
      />
      <span class="slider"></span>
      <span class="switch-label">マウスジェスチャーを有効にする</span>
    </label>
  </div>

  <!-- 軌跡設定 -->
  <div class="setting-group">
    <h3>軌跡表示設定</h3>
    
    <div class="setting-item">
      <label for="strokeColor">軌跡の色:</label>
      <input
        id="strokeColor"
        type="color"
        bind:value={strokeColor}
        onchange={handleStrokeColorChange}
        disabled={isLoading}
      />
    </div>

    <div class="setting-item">
      <label for="strokeWidth">軌跡の太さ: <span>{strokeWidth}px</span></label>
      <input
        id="strokeWidth"
        type="range"
        min="1"
        max="10"
        bind:value={strokeWidth}
        oninput={handleStrokeWidthChange}
        disabled={isLoading}
      />
    </div>

    <div class="setting-item">
      <label for="gestureThreshold">ジェスチャー感度: <span>{gestureThreshold}px</span></label>
      <input
        id="gestureThreshold"
        type="range"
        min="5"
        max="50"
        bind:value={gestureThreshold}
        oninput={handleGestureThresholdChange}
        disabled={isLoading}
      />
      <div class="help-text">小さいほど感度が高くなります</div>
    </div>

    <!-- プレビューキャンバス -->
    <div class="preview-section">
      <label>軌跡プレビュー:</label>
      <canvas
        bind:this={previewCanvas}
        width="160"
        height="60"
        class="preview-canvas"
      ></canvas>
    </div>
  </div>
</div>

<style>
  .basic-settings {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 1rem;
    border-bottom: 2px solid #e0e0e0;
    padding-bottom: 0.5rem;
  }

  .setting-group {
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 1rem;
  }

  .setting-group h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #333;
    margin-bottom: 0.75rem;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }

  .setting-item:last-child {
    margin-bottom: 0;
  }

  .setting-item label {
    font-weight: 500;
    color: #333;
    flex: 1;
  }

  .setting-item input[type="color"] {
    width: 40px;
    height: 30px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .setting-item input[type="range"] {
    flex: 0 0 150px;
    margin-left: 1rem;
  }

  .help-text {
    font-size: 0.875rem;
    color: #666;
    margin-top: 0.25rem;
    flex-basis: 100%;
  }

  .preview-section {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #e0e0e0;
  }

  .preview-section label {
    display: block;
    font-weight: 500;
    color: #333;
    margin-bottom: 0.5rem;
  }

  .preview-canvas {
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
  }

  /* スイッチスタイル */
  .switch {
    position: relative;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: relative;
    width: 50px;
    height: 24px;
    background-color: #ccc;
    border-radius: 24px;
    transition: 0.3s;
    margin-right: 0.75rem;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    top: 3px;
    background-color: white;
    border-radius: 50%;
    transition: 0.3s;
  }

  .switch input:checked + .slider {
    background-color: #2196F3;
  }

  .switch input:checked + .slider:before {
    transform: translateX(26px);
  }

  .switch-label {
    font-weight: 500;
    color: #333;
  }

  .switch input:disabled + .slider {
    opacity: 0.6;
    cursor: not-allowed;
  }
</style>