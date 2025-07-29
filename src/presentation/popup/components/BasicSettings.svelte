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
      // ServiceFactoryが初期化されるまで待機
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available, waiting...');
        setTimeout(loadSettings, 100);
        return;
      }

      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      const settings = await settingsManagementUseCase.getCurrentSettings();
      enabled = settings.enabled !== false; // デフォルトtrue
      
      console.log('🔧 BasicSettings: Loaded settings', { enabled });
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
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }

      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      await settingsManagementUseCase.toggleExtension(enabled);
      
      dispatch('save-status', {
        message: `マウスジェスチャーを${enabled ? '有効' : '無効'}にしました`,
        type: 'success'
      });
      
      console.log('🔧 BasicSettings: Updated enabled setting', { enabled });
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
      <input type="checkbox" bind:checked={enabled} onchange={handleEnabledChange}>
      <span class="slider"></span>
    </label>
  </div>
</div>