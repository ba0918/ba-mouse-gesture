<script lang="ts">
  // Props
  interface OptionsDebugSettingsProps {
    debugEnabled: boolean;
    debugLogLevel: string;
    debugShowStatus: boolean;
    debugStatusPosition: string;
    isLoading: boolean;
    onDebugSettingsChange: () => Promise<void>;
  }

  let {
    debugEnabled = $bindable(),
    debugLogLevel = $bindable(),
    debugShowStatus = $bindable(),
    debugStatusPosition = $bindable(),
    isLoading,
    onDebugSettingsChange
  }: OptionsDebugSettingsProps = $props();
</script>

<!-- デバッグ設定 -->
<div class="section">
  <h2>🔧 デバッグ設定</h2>
  <div class="setting-item">
    <div>
      <div class="setting-label">デバッグモードを有効にする</div>
      <div class="setting-description">
        開発者向け：コンソールログと画面デバッグ表示を制御します
      </div>
    </div>
    <label class="switch">
      <input 
        type="checkbox" 
        bind:checked={debugEnabled} 
        onchange={onDebugSettingsChange}
        disabled={isLoading}
      >
      <span class="slider"></span>
    </label>
  </div>
          
  {#if debugEnabled}
    <div id="debugOptions">
      <div class="setting-item">
        <div>
          <div class="setting-label">ログレベル</div>
          <div class="setting-description">
            出力するログの詳細度を選択
          </div>
        </div>
        <select 
          bind:value={debugLogLevel} 
          class="form-select" 
          onchange={onDebugSettingsChange}
          disabled={isLoading}
        >
          <option value="0">エラーのみ</option>
          <option value="1">警告以上</option>
          <option value="2">情報以上</option>
          <option value="3">全て（デバッグ含む）</option>
        </select>
      </div>
                  
      <div class="setting-item">
        <div>
          <div class="setting-label">画面表示を有効にする</div>
          <div class="setting-description">
            ジェスチャー操作時の画面上ステータス表示
          </div>
        </div>
        <label class="switch">
          <input 
            type="checkbox" 
            bind:checked={debugShowStatus} 
            onchange={onDebugSettingsChange}
            disabled={isLoading}
          >
          <span class="slider"></span>
        </label>
      </div>
                  
      <div class="setting-item">
        <div>
          <div class="setting-label">表示位置</div>
          <div class="setting-description">
            ステータス表示の画面上の位置
          </div>
        </div>
        <select 
          bind:value={debugStatusPosition} 
          class="form-select" 
          onchange={onDebugSettingsChange}
          disabled={isLoading}
        >
          <option value="top-right">右上</option>
          <option value="top-left">左上</option>
          <option value="bottom-right">右下</option>
          <option value="bottom-left">左下</option>
        </select>
      </div>
    </div>
  {/if}
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
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 8px 0;
  }
  
  .setting-item:last-child {
    margin-bottom: 0;
  }
  
  .setting-label {
    font-weight: 500;
    color: #202124;
    flex: 1;
  }
  
  .setting-description {
    font-size: 12px;
    color: #5f6368;
    margin-top: 4px;
  }
  
  /* スイッチスタイル */
  .switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  
  .switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: .4s;
    border-radius: 24px;
  }
  
  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  
  input:checked + .slider {
    background-color: #1a73e8;
  }
  
  input:checked + .slider:before {
    transform: translateX(20px);
  }

  input:disabled + .slider {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .form-select {
    padding: 8px 16px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    background: white;
    font-size: 14px;
    cursor: pointer;
    min-width: 140px;
  }
  
  .form-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  #debugOptions {
    padding-left: 20px;
    margin-top: 16px;
    border-left: 3px solid #e8f0fe;
  }
</style>