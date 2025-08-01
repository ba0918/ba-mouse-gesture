<script lang="ts">
  import { onMount } from 'svelte';
  import type { ActionName } from '../../domain/types/ActionName';

  // Stores
  import { createUiStore } from './stores/uiStore.svelte';
  import { createSettingsStore } from './stores/settingsStore.svelte';
  import { createGesturesStore } from './stores/gesturesStore.svelte';

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

  function handleAddDirection(direction: string) {
    gestures.handleAddDirection(direction);
  }

  function handleClearPattern() {
    gestures.handleClearPattern();
  }

  function handleClearCustomGestureError() {
    gestures.handleClearCustomGestureError();
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
    <div class="loading">設定を読み込み中</div>
  {:else}
    <main class="app-main">
      <!-- 基本設定 -->
      <OptionsBasicSettings
        bind:enabled={settingsStore.enabled}
        onEnabledChange={handleEnabledChange}
        isLoading={uiStore.isLoading}
      />

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
        bind:gestureSearch={gesturesStore.gestureSearch}
        bind:gestureFilter={gesturesStore.gestureFilter}
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
        onAddDirection={handleAddDirection}
        onClearPattern={handleClearPattern}
        onClearCustomGestureError={handleClearCustomGestureError}
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

  <!-- 保存ステータス表示（トースト） -->
  {#if uiStore.saveStatusVisible}
    <div class="save-status {uiStore.saveStatusType}">
      {uiStore.saveStatus}
    </div>
  {/if}

  <!-- 確認ダイアログ -->
  {#if uiStore.confirmDialog}
    <div class="confirm-dialog">
      <div class="confirm-overlay"></div>
      <div class="confirm-content">
        <h3 class="confirm-title">確認</h3>
        <p class="confirm-message">{uiStore.confirmMessage}</p>
        <div class="confirm-buttons">
          <button class="confirm-btn confirm-btn-cancel" onclick={cancelConfirm}>キャンセル</button>
          <button class="confirm-btn confirm-btn-ok" onclick={executeConfirm}>OK</button>
        </div>
      </div>
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

  .app-container {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .app-header {
    text-align: center;
    margin-bottom: 0;
  }

  .app-header h1 {
    font-size: 24px;
    margin: 0 0 24px 0;
    color: #1a73e8;
    text-align: center;
    border-bottom: 2px solid #e8f0fe;
    padding-bottom: 16px;
  }

  .app-main {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ローディング表示 */
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
    0%,
    80%,
    100% {
      opacity: 0;
    }
    40% {
      opacity: 1;
    }
  }

  /* 保存ステータス表示（トースト） */
  .save-status {
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 500;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideDown 0.3s ease-out;
    max-width: 90%;
    text-align: center;
  }

  .save-status.success {
    background: #34a853;
    color: white;
  }

  .save-status.error {
    background: #ea4335;
    color: white;
  }

  @keyframes slideDown {
    from {
      transform: translate(-50%, -100%);
      opacity: 0;
    }
    to {
      transform: translate(-50%, 0);
      opacity: 1;
    }
  }

  /* カスタム確認ダイアログ */
  .confirm-dialog {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .confirm-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
  }

  .confirm-content {
    position: relative;
    background: white;
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    max-width: 400px;
    width: 90%;
    animation: confirmAppear 0.2s ease-out;
  }

  @keyframes confirmAppear {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  .confirm-title {
    margin: 0 0 16px 0;
    font-size: 18px;
    font-weight: 600;
    color: #202124;
  }

  .confirm-message {
    margin: 0 0 24px 0;
    color: #5f6368;
    line-height: 1.5;
  }

  .confirm-buttons {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .confirm-btn {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .confirm-btn-cancel {
    background: #f8f9fa;
    color: #5f6368;
    border: 1px solid #dadce0;
  }

  .confirm-btn-cancel:hover {
    background: #e8eaed;
  }

  .confirm-btn-ok {
    background: #ea4335;
    color: white;
  }

  .confirm-btn-ok:hover {
    background: #d33b2c;
  }
</style>
