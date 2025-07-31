<script lang="ts">
  import { onMount } from 'svelte';
  import type { ActionName } from '../../domain/types/ActionName';

  // Stores
  import { createUiStore } from './stores/uiStore';
  import { createSettingsStore } from './stores/settingsStore';
  import { createGesturesStore } from './stores/gesturesStore';

  // Composables
  import { useSettings } from './composables/useSettings';
  import { useGestures } from './composables/useGestures';

  // UI Components
  import OptionsBasicSettings from './components/OptionsBasicSettings.svelte';
  import OptionsCustomGestures from './components/OptionsCustomGestures.svelte';
  import OptionsDebugSettings from './components/OptionsDebugSettings.svelte';
  import OptionsExcludeList from './components/OptionsExcludeList.svelte';
  import OptionsGestureList from './components/OptionsGestureList.svelte';
  import OptionsTrackSettings from './components/OptionsTrackSettings.svelte';

  // Store instances
  const uiStore = createUiStore();
  const settingsStore = createSettingsStore();
  const gesturesStore = createGesturesStore();

  // Composable instances
  const settings = useSettings(settingsStore, uiStore);
  const gestures = useGestures(gesturesStore, uiStore);

  onMount(async () => {
    await settings.initializeSettings();

    // Load gestures data and update stores
    const [loadedGestures, loadedCustomGestures] = await Promise.all([
      settings.loadGestures(),
      settings.loadCustomGestures(),
    ]);

    gesturesStore.setGestures(loadedGestures);
    gesturesStore.setCustomGestures(loadedCustomGestures);

    // Set logger for gestures composable
    gestures.setLogger(settings.logger);
  });

  // Event handlers that delegate to composables
  async function handleEnabledChange() {
    await settings.handleEnabledChange();
  }

  async function handleTrackSettingsChange() {
    await settings.handleTrackSettingsChange();
  }

  async function addExcludeUrl() {
    await settings.addExcludeUrl();
  }

  async function removeExcludeUrl(url: string) {
    await settings.removeExcludeUrl(url);
  }

  async function handleDebugSettingsChange() {
    await settings.handleDebugSettingsChange();
  }

  async function addCustomGesture() {
    await gestures.addCustomGesture();
  }

  async function toggleGesture(gestureId: string, enabled: boolean) {
    await gestures.toggleGesture(gestureId, enabled);
  }

  async function deleteCustomGesture(gestureId: string, gestureName: string) {
    await gestures.deleteCustomGesture(gestureId, gestureName);
  }

  function showGestureHelp() {
    uiStore.showSaveStatus('上：↑、下：↓、左：←、右：→の組み合わせでパターンを入力してください');
  }

  function executeConfirm() {
    uiStore.executeConfirm();
  }

  function cancelConfirm() {
    uiStore.hideConfirmDialog();
  }
</script>

<div class="app-container">
  <header class="app-header">
    <h1>マウスジェスチャー設定</h1>
  </header>

  <!-- ローディング表示 -->
  {#if uiStore.isLoading}
    <div class="loading">
      <div class="loading-spinner"></div>
      <p>設定を読み込んでいます...</p>
    </div>
  {:else}
    <main class="app-main">
      <!-- 基本設定 -->
      <OptionsBasicSettings bind:enabled={settingsStore.enabled} onEnabledChange={handleEnabledChange} />

      <!-- 軌跡設定 -->
      <OptionsTrackSettings
        bind:strokeColor={settingsStore.strokeColor}
        bind:strokeWidth={settingsStore.strokeWidth}
        bind:gestureThreshold={settingsStore.gestureThreshold}
        isLoading={uiStore.isLoading}
        onTrackSettingsChange={handleTrackSettingsChange}
      />

      <!-- 除外サイト -->
      <OptionsExcludeList
        excludeList={settingsStore.excludeList}
        bind:newExcludeUrl={settingsStore.newExcludeUrl}
        onAddUrl={addExcludeUrl}
        onRemoveUrl={removeExcludeUrl}
        isLoading={uiStore.isLoading}
      />

      <!-- デフォルトジェスチャー一覧 -->
      <OptionsGestureList
        gestures={gesturesStore.gestures}
        bind:search={gesturesStore.gestureSearch}
        bind:filter={gesturesStore.gestureFilter}
        onToggleGesture={toggleGesture}
        isLoading={uiStore.isLoading}
      />

      <!-- カスタムジェスチャー -->
      <OptionsCustomGestures
        customGestures={gesturesStore.customGestures}
        bind:gestureName={gesturesStore.gestureName}
        bind:gesturePatternDisplay={gesturesStore.gesturePatternDisplay}
        bind:gestureAction={gesturesStore.gestureAction}
        bind:currentPattern={gesturesStore.currentPattern}
        customGestureError={gesturesStore.customGestureError}
        onAddGesture={addCustomGesture}
        onDeleteGesture={deleteCustomGesture}
        onToggleGesture={toggleGesture}
        onShowHelp={showGestureHelp}
        isLoading={uiStore.isLoading}
      />

      <!-- デバッグ設定 -->
      <OptionsDebugSettings
        bind:debugEnabled={settingsStore.debugEnabled}
        bind:debugLogLevel={settingsStore.debugLogLevel}
        bind:debugShowStatus={settingsStore.debugShowStatus}
        bind:debugStatusPosition={settingsStore.debugStatusPosition}
        onDebugSettingsChange={handleDebugSettingsChange}
        isLoading={uiStore.isLoading}
      />
    </main>
  {/if}

  <!-- 保存ステータス表示 -->
  {#if uiStore.saveStatusVisible}
    <div class="save-status {uiStore.saveStatusType}">
      {uiStore.saveStatus}
    </div>
  {/if}

  <!-- 確認ダイアログ -->
  {#if uiStore.confirmDialog}
    <div class="modal-overlay">
      <div class="modal">
        <h3>確認</h3>
        <p>{uiStore.confirmMessage}</p>
        <div class="modal-buttons">
          <button class="btn-secondary" onclick={cancelConfirm}>キャンセル</button>
          <button class="btn-danger" onclick={executeConfirm}>削除</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .app-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f8f9fa;
    min-height: 100vh;
  }

  .app-header {
    text-align: center;
    margin-bottom: 30px;
  }

  .app-header h1 {
    color: #1a73e8;
    font-size: 28px;
    margin: 0;
    font-weight: 600;
  }

  .app-main {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ローディング表示 */
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e8f0fe;
    border-top: 4px solid #1a73e8;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }

  .loading p {
    color: #5f6368;
    font-size: 16px;
    margin: 0;
  }

  /* 保存ステータス表示 */
  .save-status {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
  }

  .save-status.success {
    background-color: #34a853;
  }

  .save-status.error {
    background-color: #ea4335;
  }

  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  /* 確認ダイアログ */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1001;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .modal h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
    color: #202124;
  }

  .modal p {
    margin: 0 0 24px 0;
    color: #5f6368;
    line-height: 1.5;
  }

  .modal-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }

  .btn-secondary,
  .btn-danger {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .btn-secondary {
    background-color: #f8f9fa;
    color: #5f6368;
    border: 1px solid #dadce0;
  }

  .btn-secondary:hover {
    background-color: #f1f3f4;
  }

  .btn-danger {
    background-color: #ea4335;
    color: white;
  }

  .btn-danger:hover {
    background-color: #d33b2c;
  }
</style>
