<script lang="ts">
  import { onMount } from 'svelte';
  
  // Props
  interface OptionsTrackSettingsProps {
    strokeColor: string;
    strokeWidth: number;
    gestureThreshold: number;
    isLoading: boolean;
    onTrackSettingsChange: () => Promise<void>;
  }

  let {
    strokeColor = $bindable(),
    strokeWidth = $bindable(), 
    gestureThreshold = $bindable(),
    isLoading,
    onTrackSettingsChange
  }: OptionsTrackSettingsProps = $props();

  let previewCanvas: HTMLCanvasElement;

  // プレビューキャンバスの更新
  function updatePreviewCanvas() {
    if (!previewCanvas || isLoading) return;
    
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;

    // キャンバスをクリア
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // 背景を白に設定
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // 軌跡のスタイルを設定
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // サンプル軌跡を描画（ジェスチャーのような曲線）
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.quadraticCurveTo(40, 30, 70, 50);
    ctx.quadraticCurveTo(100, 70, 130, 35);
    ctx.quadraticCurveTo(160, 15, 180, 45);
    ctx.stroke();
  }

  // 設定変更時のプレビュー更新
  $effect(() => {
    updatePreviewCanvas();
  });

  onMount(() => {
    updatePreviewCanvas();
  });
</script>

<!-- 軌跡カスタマイズ -->
<div class="section">
  <h2>軌跡の表示設定</h2>
  <div class="setting-item">
    <div class="setting-label">軌跡の色</div>
    <input 
      type="color" 
      bind:value={strokeColor} 
      class="color-input" 
      onchange={onTrackSettingsChange}
      disabled={isLoading}
    >
  </div>
  <div class="setting-item">
    <div class="setting-label">軌跡の太さ</div>
    <div style="display: flex; align-items: center;">
      <input 
        type="range" 
        bind:value={strokeWidth} 
        class="range-input" 
        min="1" 
        max="10" 
        oninput={onTrackSettingsChange}
        disabled={isLoading}
      >
      <span class="range-value">{strokeWidth}px</span>
    </div>
  </div>
  <div class="setting-item">
    <div>
      <div class="setting-label">ジェスチャー感度</div>
      <div class="setting-description">ジェスチャーとして認識される最小移動距離（低いほど敏感）</div>
    </div>
    <div style="display: flex; align-items: center;">
      <input 
        type="range" 
        bind:value={gestureThreshold} 
        class="range-input" 
        min="5" 
        max="50" 
        oninput={onTrackSettingsChange}
        disabled={isLoading}
      >
      <span class="range-value">{gestureThreshold}px</span>
    </div>
  </div>
  <div class="setting-item">
    <div>
      <div class="setting-label">軌跡のプレビュー</div>
      <canvas 
        bind:this={previewCanvas}
        class="preview-canvas" 
        width="200" 
        height="100"
      ></canvas>
    </div>
  </div>
</div>

<style>
  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  .section h2 {
    font-size: 18px;
    margin: 0 0 20px 0;
    color: #1a73e8;
    border-bottom: 2px solid #e8f0fe;
    padding-bottom: 12px;
  }
  
  .setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f1f3f4;
  }
  
  .setting-item:last-child {
    border-bottom: none;
  }
  
  .setting-label {
    font-size: 14px;
    font-weight: 500;
    color: #202124;
    margin-bottom: 4px;
  }
  
  .setting-description {
    font-size: 12px;
    color: #5f6368;
  }
  
  .color-input {
    width: 48px;
    height: 32px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .color-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .range-input {
    width: 200px;
    margin-right: 12px;
  }
  
  .range-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .range-value {
    font-size: 14px;
    color: #5f6368;
    min-width: 40px;
  }
  
  .preview-canvas {
    margin-top: 8px;
    border: 1px solid #e8eaed;
    border-radius: 4px;
    background: white;
  }
</style>