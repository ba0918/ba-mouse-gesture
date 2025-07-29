<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  interface DebugSettings {
    enabled: boolean;
    logLevel: number;
    showStatus: boolean;
    statusPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  }

  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();

  // 状態管理
  let debugSettings: DebugSettings = {
    enabled: false,
    logLevel: 2,
    showStatus: false,
    statusPosition: 'top-right'
  };
  let loading: boolean = true;
  let error: string = '';

  // ログレベルの定義
  const logLevels = [
    { value: 0, label: 'エラーのみ', description: 'エラーメッセージのみ表示' },
    { value: 1, label: '警告以上', description: '警告とエラーメッセージを表示' },
    { value: 2, label: '情報以上', description: '情報、警告、エラーメッセージを表示（推奨）' },
    { value: 3, label: 'デバッグ以上', description: 'すべてのログメッセージを表示（開発用）' }
  ];

  // ステータス位置の定義
  const statusPositions = [
    { value: 'top-right', label: '右上' },
    { value: 'top-left', label: '左上' },
    { value: 'bottom-right', label: '右下' },
    { value: 'bottom-left', label: '左下' }
  ];

  // デバッグ設定読み込み
  async function loadDebugSettings(): Promise<void> {
    try {
      loading = true;
      error = '';
      
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }
      
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      const settings = await settingsManagementUseCase.getCurrentSettings();
      
      debugSettings = {
        enabled: settings.debugSettings?.enabled || false,
        logLevel: settings.debugSettings?.logLevel ?? 2,
        showStatus: settings.debugSettings?.showStatus || false,
        statusPosition: settings.debugSettings?.statusPosition || 'top-right'
      };
      
      console.log('🔧 DebugPanel: Loaded debug settings', debugSettings);
      
    } catch (err) {
      console.error('🚨 DebugPanel: Failed to load debug settings:', err);
      error = 'デバッグ設定の読み込みに失敗しました';
      dispatch('save-status', { 
        message: error, 
        type: 'error' 
      });
    } finally {
      loading = false;
    }
  }

  // デバッグ設定保存
  async function saveDebugSettings(): Promise<void> {
    try {
      console.log('🔧 DebugPanel: Saving debug settings', debugSettings);
      
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      
      await settingsManagementUseCase.updateDebugSettings(debugSettings);
      
      dispatch('save-status', { 
        message: 'デバッグ設定を保存しました', 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 DebugPanel: Failed to save debug settings:', err);
      dispatch('save-status', { 
        message: 'デバッグ設定の保存に失敗しました', 
        type: 'error' 
      });
      
      // エラー時は元に戻す
      await loadDebugSettings();
    }
  }

  // デバッグ有効/無効切り替え
  async function toggleDebugMode(): Promise<void> {
    // デバッグ無効時は画面表示も自動的に無効化
    if (!debugSettings.enabled) {
      debugSettings.showStatus = false;
    }
    
    await saveDebugSettings();
    dispatch('save-status', { 
      message: `デバッグモードを${debugSettings.enabled ? '有効' : '無効'}にしました`, 
      type: 'success' 
    });
  }

  // ログレベル変更
  async function handleLogLevelChange(): Promise<void> {
    console.log('🔧 DebugPanel: Log level changed to', debugSettings.logLevel);
    await saveDebugSettings();
    dispatch('save-status', { 
      message: 'ログレベルを変更しました', 
      type: 'success' 
    });
  }

  // ステータス表示切り替え
  async function toggleStatusDisplay(): Promise<void> {
    await saveDebugSettings();
    dispatch('save-status', { 
      message: `デバッグステータス表示を${debugSettings.showStatus ? '有効' : '無効'}にしました`, 
      type: 'success' 
    });
  }

  // ステータス位置変更
  async function handleStatusPositionChange(): Promise<void> {
    await saveDebugSettings();
    dispatch('save-status', { 
      message: 'ステータス表示位置を変更しました', 
      type: 'success' 
    });
  }

  // デバッグ情報のエクスポート
  async function exportDebugInfo(): Promise<void> {
    try {
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      const settings = await settingsManagementUseCase.getCurrentSettings();
      
      const debugInfo = {
        timestamp: new Date().toISOString(),
        version: chrome.runtime.getManifest().version,
        settings: settings,
        userAgent: navigator.userAgent,
        url: window.location.href
      };
      
      const dataStr = JSON.stringify(debugInfo, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `mouse-gesture-debug-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      dispatch('save-status', { 
        message: 'デバッグ情報をエクスポートしました', 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 DebugPanel: Failed to export debug info:', err);
      dispatch('save-status', { 
        message: 'デバッグ情報のエクスポートに失敗しました', 
        type: 'error' 
      });
    }
  }

  // コンソールをクリア
  function clearConsole(): void {
    if (console.clear) {
      console.clear();
      dispatch('save-status', { 
        message: 'コンソールをクリアしました', 
        type: 'success' 
      });
    }
  }

  // コンポーネントマウント時の初期化
  onMount(() => {
    loadDebugSettings();
  });
</script>

<div class="section">
  <h2>🔧 デバッグ設定</h2>
  
  <!-- 説明 -->
  <div class="description">
    <p>開発者向けのデバッグ機能を制御します。</p>
    <p>コンソールログレベルや画面上のデバッグ情報表示をカスタマイズできます。</p>
  </div>

  {#if loading}
    <div class="loading-state">
      <div class="loading-icon">⟳</div>
      <div>デバッグ設定を読み込み中...</div>
    </div>
  {:else if error}
    <div class="error-state">
      <div class="error-icon">⚠️</div>
      <div>{error}</div>
      <button class="retry-btn" onclick={loadDebugSettings}>再試行</button>
    </div>
  {:else}
    <!-- デバッグモード -->
    <div class="setting-group">
      <h3>デバッグモード</h3>
      <div class="setting-item">
        <div class="setting-info">
          <div class="setting-label">デバッグモードを有効にする</div>
          <div class="setting-description">
            コンソールログとデバッグ機能を有効化します
          </div>
        </div>
        <div class="setting-control">
          <label class="switch">
            <input
              type="checkbox"
              bind:checked={debugSettings.enabled}
              onchange={toggleDebugMode}
            />
            <span class="slider"></span>
          </label>
        </div>
      </div>
    </div>

    <!-- デバッグオプション -->
    {#if debugSettings.enabled}
      <div class="debug-options">
        <!-- ログレベル設定 -->
        <div class="setting-group">
          <h3>ログレベル</h3>
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">コンソールログの出力レベル</div>
              <div class="setting-description">
                表示するログメッセージの種類を選択してください
              </div>
            </div>
            <div class="setting-control">
              <select 
                bind:value={debugSettings.logLevel}
                onchange={handleLogLevelChange}
                class="log-level-select"
              >
                {#each logLevels as level}
                  <option value={level.value}>{level.label}</option>
                {/each}
              </select>
            </div>
          </div>
          
          <!-- ログレベル説明 -->
          <div class="log-level-info">
            {logLevels.find(l => l.value === debugSettings.logLevel)?.description}
          </div>
        </div>

        <!-- ステータス表示設定 -->
        <div class="setting-group">
          <h3>ステータス表示</h3>
          <div class="setting-item">
            <div class="setting-info">
              <div class="setting-label">画面上にデバッグ情報を表示</div>
              <div class="setting-description">
                Webページ上にデバッグ情報をオーバーレイ表示します
              </div>
            </div>
            <div class="setting-control">
              <label class="switch">
                <input
                  type="checkbox"
                  bind:checked={debugSettings.showStatus}
                  onchange={toggleStatusDisplay}
                />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <!-- ステータス位置設定 -->
          {#if debugSettings.showStatus}
            <div class="setting-item">
              <div class="setting-info">
                <div class="setting-label">ステータス表示位置</div>
                <div class="setting-description">
                  デバッグ情報を表示する画面上の位置
                </div>
              </div>
              <div class="setting-control">
                <select 
                  bind:value={debugSettings.statusPosition}
                  onchange={handleStatusPositionChange}
                  class="position-select"
                >
                  {#each statusPositions as position}
                    <option value={position.value}>{position.label}</option>
                  {/each}
                </select>
              </div>
            </div>
          {/if}
        </div>

        <!-- デバッグアクション -->
        <div class="setting-group">
          <h3>デバッグアクション</h3>
          <div class="debug-actions">
            <button 
              class="action-btn primary-btn"
              onclick={exportDebugInfo}
            >
              📄 デバッグ情報をエクスポート
            </button>
            <button 
              class="action-btn secondary-btn"
              onclick={clearConsole}
            >
              🧹 コンソールをクリア
            </button>
            <button 
              class="action-btn secondary-btn"
              onclick={loadDebugSettings}
            >
              🔄 設定を再読み込み
            </button>
          </div>
        </div>

        <!-- デバッグ情報表示 -->
        <div class="setting-group">
          <h3>システム情報</h3>
          <div class="system-info">
            <div class="info-item">
              <span class="info-label">拡張機能バージョン:</span>
              <span class="info-value">{chrome?.runtime?.getManifest()?.version || 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">ブラウザ:</span>
              <span class="info-value">{navigator.userAgent.match(/Chrome\/[\d.]+/)?.[0] || 'Unknown'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">現在のログレベル:</span>
              <span class="info-value">{logLevels.find(l => l.value === debugSettings.logLevel)?.label}</span>
            </div>
            <div class="info-item">
              <span class="info-label">デバッグステータス:</span>
              <span class="info-value {debugSettings.showStatus ? 'enabled' : 'disabled'}">
                {debugSettings.showStatus ? '表示中' : '非表示'}
              </span>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="debug-disabled">
        <div class="disabled-icon">🔒</div>
        <div class="disabled-message">デバッグモードが無効です</div>
        <div class="disabled-description">
          デバッグオプションを使用するには、上のスイッチでデバッグモードを有効にしてください
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  /* 説明セクション */
  .description {
    background: #fff3cd;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid #ffc107;
  }

  .description p {
    margin: 0.5rem 0;
    color: #856404;
    line-height: 1.4;
  }

  .description p:first-child {
    margin-top: 0;
  }

  .description p:last-child {
    margin-bottom: 0;
  }

  /* 設定グループ */
  .setting-group {
    background: white;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    overflow: hidden;
  }

  .setting-group h3 {
    background: #f8f9fa;
    padding: 1rem;
    margin: 0;
    border-bottom: 1px solid #eee;
    color: #333;
    font-size: 1.1rem;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    border-bottom: 1px solid #f0f0f0;
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-info {
    flex: 1;
    min-width: 0;
    margin-right: 1rem;
  }

  .setting-label {
    font-weight: 600;
    color: #333;
    margin-bottom: 0.25rem;
  }

  .setting-description {
    font-size: 0.9rem;
    color: #666;
    line-height: 1.3;
  }

  .setting-control {
    flex-shrink: 0;
  }

  /* スイッチ */
  .switch {
    position: relative;
    display: inline-block;
    width: 50px;
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
    border-radius: 34px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #28a745;
  }

  input:checked + .slider:before {
    transform: translateX(26px);
  }

  /* セレクト */
  .log-level-select, .position-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 0.9rem;
    min-width: 120px;
  }

  .log-level-info {
    background: #f8f9fa;
    padding: 0.75rem 1rem;
    border-top: 1px solid #eee;
    font-size: 0.85rem;
    color: #666;
    font-style: italic;
  }

  /* デバッグオプション */
  .debug-options {
    animation: fadeIn 0.3s ease-in;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* デバッグアクション */
  .debug-actions {
    display: flex;
    gap: 0.5rem;
    padding: 1rem;
    flex-wrap: wrap;
  }

  .action-btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 600;
    transition: all 0.2s;
  }

  .primary-btn {
    background: #007bff;
    color: white;
  }

  .primary-btn:hover {
    background: #0056b3;
  }

  .secondary-btn {
    background: #6c757d;
    color: white;
  }

  .secondary-btn:hover {
    background: #545b62;
  }

  /* システム情報 */
  .system-info {
    padding: 1rem;
  }

  .info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .info-item:last-child {
    border-bottom: none;
  }

  .info-label {
    font-weight: 600;
    color: #333;
  }

  .info-value {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    color: #666;
  }

  .info-value.enabled {
    color: #28a745;
    font-weight: 600;
  }

  .info-value.disabled {
    color: #dc3545;
    font-weight: 600;
  }

  /* デバッグ無効状態 */
  .debug-disabled {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    text-align: center;
    color: #666;
    background: #f8f9fa;
    border-radius: 0.5rem;
    margin-top: 1rem;
  }

  .disabled-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.5;
  }

  .disabled-message {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .disabled-description {
    font-size: 0.9rem;
    color: #999;
    line-height: 1.4;
  }

  /* 状態表示 */
  .loading-state, .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .loading-icon, .error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  .loading-icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .retry-btn {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
  }

  .retry-btn:hover {
    background: #0056b3;
  }
</style>