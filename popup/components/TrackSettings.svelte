<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();
  
  let strokeColor = '#2196F3';
  let strokeWidth = 3;
  let gestureThreshold = 15;
  let previewCanvas: HTMLCanvasElement;
  
  onMount(async () => {
    await loadSettings();
    updatePreview();
  });
  
  async function loadSettings() {
    try {
      const settings = await chrome.storage.sync.get([
        'strokeColor',
        'strokeWidth', 
        'gestureThreshold'
      ]);
      
      strokeColor = settings.strokeColor || '#2196F3';
      strokeWidth = settings.strokeWidth || 3;
      gestureThreshold = settings.gestureThreshold || 15;
    } catch (error) {
      console.error('軌跡設定読み込みエラー:', error);
      dispatch('save-status', {
        message: '軌跡設定の読み込みに失敗しました',
        type: 'error'
      });
    }
  }
  
  function updatePreview() {
    if (!previewCanvas) return;
    
    const ctx = previewCanvas.getContext('2d');
    if (!ctx) return;
    
    // キャンバスクリア
    ctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    
    // プレビュー軌跡を描画
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(100, 30);
    ctx.lineTo(150, 50);
    ctx.lineTo(130, 70);
    ctx.stroke();
  }
  
  async function handleStrokeColorChange() {
    await saveSettings();
    updatePreview();
  }
  
  async function handleStrokeWidthChange() {
    await saveSettings();
    updatePreview();
  }
  
  async function handleThresholdChange() {
    await saveSettings();
  }
  
  async function saveSettings() {
    try {
      await chrome.storage.sync.set({
        strokeColor,
        strokeWidth,
        gestureThreshold
      });
      
      dispatch('save-status', {
        message: '軌跡設定を保存しました',
        type: 'success'
      });
      
      // コンテンツスクリプトに設定変更を通知
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: { strokeColor, strokeWidth, gestureThreshold }
            }).catch(() => {
            // エラーを無視
            });
          }
        });
      });
    } catch (error) {
      console.error('軌跡設定保存エラー:', error);
      dispatch('save-status', {
        message: '軌跡設定の保存に失敗しました',
        type: 'error'
      });
    }
  }
</script>

<div class="section">
  <h2>軌跡の表示設定</h2>
  <div class="setting-item">
    <div class="setting-label">軌跡の色</div>
    <input 
      type="color" 
      bind:value={strokeColor} 
      on:change={handleStrokeColorChange}
      class="color-input"
    >
  </div>
  <div class="setting-item">
    <div class="setting-label">軌跡の太さ</div>
    <div style="display: flex; align-items: center;">
      <input 
        type="range" 
        bind:value={strokeWidth} 
        on:input={handleStrokeWidthChange}
        min="1" 
        max="10" 
        class="range-input"
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
        on:input={handleThresholdChange}
        min="5" 
        max="50" 
        class="range-input"
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
  .color-input, .range-input {
    padding: 8px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    width: 80px;
  }
  
  .range-input {
    width: 120px;
  }
  
  .range-value {
    margin-left: 8px;
    font-weight: 500;
    color: #1a73e8;
    min-width: 30px;
  }
  
  .preview-canvas {
    border: 1px solid #dadce0;
    border-radius: 4px;
    margin-top: 8px;
    background: white;
  }
</style>