<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();
  
  let enabled = true;
  
  onMount(async () => {
    await loadSettings();
  });
  
  async function loadSettings() {
    try {
      // Clean ArchitectureのSettingsManagementUseCaseを使用して設定を読み込み
      // 実装はindex.tsから既存ロジックを移行
      const settings = await chrome.storage.sync.get(['enabled']);
      enabled = settings.enabled !== false; // デフォルトtrue
    } catch (error) {
      console.error('基本設定読み込みエラー:', error);
      dispatch('save-status', {
        message: '基本設定の読み込みに失敗しました',
        type: 'error'
      });
    }
  }
  
  async function handleEnabledChange() {
    try {
      // Clean ArchitectureのSettingsManagementUseCaseを使用して設定を保存
      await chrome.storage.sync.set({ enabled });
      
      dispatch('save-status', {
        message: `マウスジェスチャーを${enabled ? '有効' : '無効'}にしました`,
        type: 'success'
      });
      
      // コンテンツスクリプトに設定変更を通知
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: { enabled }
            }).catch(() => {
            // タブでコンテンツスクリプトが実行されていない場合のエラーを無視
            });
          }
        });
      });
    } catch (error) {
      console.error('基本設定保存エラー:', error);
      dispatch('save-status', {
        message: '設定の保存に失敗しました',
        type: 'error'
      });
    }
  }
</script>

<div class="section">
  <h2>基本設定</h2>
  <div class="setting-item">
    <div>
      <div class="setting-label">マウスジェスチャーを有効にする</div>
      <div class="setting-description">チェックを外すと全ての機能が無効になります</div>
    </div>
    <label class="switch">
      <input type="checkbox" bind:checked={enabled} on:change={handleEnabledChange}>
      <span class="slider"></span>
    </label>
  </div>
</div>