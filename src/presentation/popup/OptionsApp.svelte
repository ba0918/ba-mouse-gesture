<script lang="ts">
  import { onMount } from 'svelte';
  import BasicSettings from './components/BasicSettings.svelte';
  import TrackSettings from './components/TrackSettings.svelte';
  import GestureList from './components/GestureList.svelte';
  import CustomGesturePanel from './components/CustomGesturePanel.svelte';
  import ExcludeList from './components/ExcludeList.svelte';
  import DebugPanel from './components/DebugPanel.svelte';
  
  // Svelte 5のリアクティブ状態
  let isLoading = $state(true);
  let saveStatus = $state('');
  let saveStatusType = $state<'success' | 'error'>('success');
  let saveStatusVisible = $state(false);
  
  onMount(() => {
    // Clean Architecture経由で設定を初期化
    initializeSettings();
  });
  
  async function initializeSettings() {
    try {
      // 設定の読み込み処理
      // Clean ArchitectureのSettingsManagementUseCaseを使用
      await new Promise(resolve => setTimeout(resolve, 100)); // シミュレーション
      isLoading = false;
    } catch (error) {
      console.error('設定初期化エラー:', error);
      showSaveStatus('設定の読み込みに失敗しました', 'error');
      isLoading = false;
    }
  }
  
  function showSaveStatus(data: {message: string, type: 'success' | 'error'}) {
    saveStatus = data.message;
    saveStatusType = data.type;
    saveStatusVisible = true;
    setTimeout(() => {
      saveStatusVisible = false;
    }, 3000);
  }
  
  // 従来のshowSaveStatus互換性のため（まだ変更していないコンポーネント用）
  function showSaveStatusLegacy(message: string, statusType: 'success' | 'error' = 'success') {
    showSaveStatus({message, type: statusType});
  }
  
  // 子コンポーネントから呼び出される保存ステータス表示
  function handleSaveStatus(event: CustomEvent<{message: string, type: 'success' | 'error'}>) {
    showSaveStatus(event.detail);
  }
</script>

<div class="container">
  <h1>🖱️ マウスジェスチャーツール - 設定</h1>
  
  {#if isLoading}
    <div class="loading">設定を読み込み中</div>
  {:else}
    <div class="main-content">
      <!-- 基本設定 -->
      <BasicSettings onsave-status={handleSaveStatus} />
      
      <!-- 軌跡設定 -->
      <TrackSettings onSaveStatus={showSaveStatus} />
      
      <!-- ジェスチャー一覧 -->
      <GestureList onsave-status={handleSaveStatus} />
      
      <!-- カスタムジェスチャー -->
      <CustomGesturePanel onsave-status={handleSaveStatus} />
      
      <!-- 除外サイト -->
      <ExcludeList onsave-status={handleSaveStatus} />
      
      <!-- デバッグ設定 -->
      <DebugPanel onsave-status={handleSaveStatus} />
      
      <!-- 保存ステータス -->
      {#if saveStatusVisible}
        <div class="save-status {saveStatusType}">
          {saveStatus}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    background-color: #f8f9fa;
  }
  
  .container {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  h1 {
    font-size: 24px;
    margin: 0 0 24px 0;
    color: #1a73e8;
    text-align: center;
    border-bottom: 2px solid #e8f0fe;
    padding-bottom: 16px;
  }
  
  .loading {
    text-align: center;
    padding: 20px;
    color: #5f6368;
  }
  
  .loading::after {
    content: '...';
    animation: loading 1.4s infinite ease-in-out;
  }
  
  @keyframes loading {
    0%, 80%, 100% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
  }
  
  .main-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  
  .save-status {
    text-align: center;
    padding: 12px;
    border-radius: 4px;
    margin-top: 16px;
    font-weight: 500;
  }
  
  .save-status.success {
    background: #e6f4ea;
    color: #137333;
  }
  
  .save-status.error {
    background: #fce8e6;
    color: #d33b2c;
  }
  
  /* グローバルスタイル（共通コンポーネント用） */
  :global(.section) {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }
  
  :global(.section h2) {
    font-size: 18px;
    margin: 0 0 20px 0;
    color: #1a73e8;
    border-bottom: 2px solid #e8f0fe;
    padding-bottom: 12px;
  }
  
  :global(.setting-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 8px 0;
  }
  
  :global(.setting-item:last-child) {
    margin-bottom: 0;
  }
  
  :global(.setting-label) {
    font-weight: 500;
    color: #202124;
    flex: 1;
  }
  
  :global(.setting-description) {
    font-size: 12px;
    color: #5f6368;
    margin-top: 4px;
  }
  
  :global(.switch) {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
  }
  
  :global(.switch input) {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  :global(.slider) {
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
  
  :global(.slider:before) {
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
  
  :global(input:checked + .slider) {
    background-color: #1a73e8;
  }
  
  :global(input:checked + .slider:before) {
    transform: translateX(20px);
  }
  
  :global(.form-input), :global(.form-select) {
    width: 100%;
    padding: 8px;
    border: 1px solid #dadce0;
    border-radius: 4px;
    font-size: 14px;
  }
  
  :global(.form-group) {
    margin-bottom: 12px;
  }
  
  :global(.form-group label) {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: #202124;
    margin-bottom: 4px;
  }
  
  :global(.add-btn) {
    background: #34a853;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    width: 100%;
  }
  
  :global(.add-btn:hover) {
    background: #2d8f3f;
  }
  
  :global(.remove-btn) {
    background: #ea4335;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
  }
  
  :global(.remove-btn:hover) {
    background: #d33b2c;
  }
</style>