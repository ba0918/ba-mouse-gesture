<script lang="ts">
  // Props
  interface OptionsBasicSettingsProps {
    enabled: boolean;
    isLoading: boolean;
    onEnabledChange: () => Promise<void>;
  }

  let { enabled = $bindable(), isLoading, onEnabledChange }: OptionsBasicSettingsProps = $props();
</script>

<!-- 基本設定 -->
<div class="section">
  <h2>基本設定</h2>
  <div class="setting-item">
    <div>
      <div class="setting-label">ジェスチャーを有効にする</div>
      <div class="setting-description">チェックを外すと全ての機能が無効になります</div>
    </div>
    <label class="switch">
      <input type="checkbox" bind:checked={enabled} onchange={onEnabledChange} disabled={isLoading} />
      <span class="slider"></span>
    </label>
  </div>
</div>

<style>
  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  /* スイッチスタイル */
  .switch {
    position: relative;
    display: inline-block;
    width: 48px;
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
    transition: 0.4s;
    border-radius: 24px;
  }

  .slider:before {
    position: absolute;
    content: '';
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #1a73e8;
  }

  input:focus + .slider {
    box-shadow: 0 0 1px #1a73e8;
  }

  input:checked + .slider:before {
    transform: translateX(24px);
  }

  input:disabled + .slider {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
