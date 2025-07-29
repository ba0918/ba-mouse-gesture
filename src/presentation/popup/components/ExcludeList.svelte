<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();

  // 状態管理
  let excludeList: string[] = [];
  let loading: boolean = true;
  let error: string = '';
  let newExcludeUrl: string = '';

  // 除外サイト読み込み
  async function loadExcludeList(): Promise<void> {
    try {
      loading = true;
      error = '';
      
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }
      
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      const settings = await settingsManagementUseCase.getCurrentSettings();
      
      excludeList = settings.excludeList || [];
      
      console.log(`🔧 ExcludeList: Loaded ${excludeList.length} exclude patterns`);
      
    } catch (err) {
      console.error('🚨 ExcludeList: Failed to load exclude list:', err);
      error = '除外サイトリストの読み込みに失敗しました';
      dispatch('save-status', { 
        message: error, 
        type: 'error' 
      });
    } finally {
      loading = false;
    }
  }

  // 除外サイト追加
  async function addExcludeSite(): Promise<void> {
    try {
      const pattern = newExcludeUrl.trim();
      if (!pattern) {
        dispatch('save-status', { 
          message: 'URLパターンを入力してください', 
          type: 'error' 
        });
        return;
      }

      // 重複チェック
      if (excludeList.includes(pattern)) {
        dispatch('save-status', { 
          message: 'このパターンは既に登録されています', 
          type: 'error' 
        });
        return;
      }

      console.log(`🔧 ExcludeList: Adding exclude pattern: ${pattern}`);
      
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      
      await settingsManagementUseCase.addExcludeSite(pattern);
      
      // ローカル状態を更新
      excludeList = [...excludeList, pattern];
      newExcludeUrl = '';
      
      dispatch('save-status', { 
        message: '除外サイトを追加しました', 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 ExcludeList: Failed to add exclude site:', err);
      dispatch('save-status', { 
        message: '除外サイトの追加に失敗しました', 
        type: 'error' 
      });
    }
  }

  // 除外サイト削除
  async function removeExcludeSite(pattern: string): Promise<void> {
    try {
      if (!confirm(`除外パターン「${pattern}」を削除しますか？`)) return;
      
      console.log(`🔧 ExcludeList: Removing exclude pattern: ${pattern}`);
      
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      
      await settingsManagementUseCase.removeExcludeSite(pattern);
      
      // ローカル状態を更新
      excludeList = excludeList.filter(p => p !== pattern);
      
      dispatch('save-status', { 
        message: '除外サイトを削除しました', 
        type: 'success' 
      });
      
    } catch (err) {  
      console.error('🚨 ExcludeList: Failed to remove exclude site:', err);
      dispatch('save-status', { 
        message: '除外サイトの削除に失敗しました', 
        type: 'error' 
      });
      
      // エラー時は元に戻す
      await loadExcludeList();
    }
  }

  // エンターキー押下時の追加
  function handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      addExcludeSite();
    }
  }

  // URL パターンの妥当性をチェック
  function validatePattern(pattern: string): string | null {
    if (!pattern.trim()) {
      return 'URLパターンを入力してください';
    }
    
    // 基本的なパターンチェック
    const trimmedPattern = pattern.trim();
    if (trimmedPattern.length < 3) {
      return 'パターンが短すぎます';
    }
    
    // 危険なパターンのチェック
    if (trimmedPattern === '*' || trimmedPattern === '**' || trimmedPattern === '*.*') {
      return 'このパターンはすべてのサイトを除外してしまいます';
    }
    
    return null;
  }

  // パターンの例を表示する関数
  function getPatternExamples(): string[] {
    return [
      'google.com - google.comドメインを除外',
      '*.example.com - example.comのすべてのサブドメインを除外',  
      'https://specific-site.com/* - 特定サイトのHTTPS版のみ除外',
      'github.com/user/* - GitHubの特定ユーザーページを除外',
      'localhost:* - ローカル開発サーバーを除外'
    ];
  }

  // コンポーネントマウント時の初期化
  onMount(() => {
    loadExcludeList();
  });
</script>

<div class="section">
  <h2>🚫 除外サイトリスト</h2>
  
  <!-- 説明 -->
  <div class="description">
    <p>特定のサイトでマウスジェスチャー機能を無効化できます。</p>
    <p>URLパターンマッチングに対応しており、ワイルドカード（*）を使用できます。</p>
  </div>

  <!-- 新規追加フォーム -->
  <div class="add-form">
    <h3>除外サイトを追加</h3>
    
    <div class="form-group">
      <label for="newExcludeUrl">URLパターン:</label>
      <div class="input-group">
        <input
          id="newExcludeUrl"
          type="text"
          bind:value={newExcludeUrl}
          onkeypress={handleKeyPress}
          placeholder="例: google.com, *.example.com"
          class="url-input"
        />
        <button
          type="button"
          class="add-btn"
          onclick={addExcludeSite}
          disabled={!newExcludeUrl.trim()}
        >
          追加
        </button>
      </div>
      
      <!-- バリデーションメッセージ -->
      {#if newExcludeUrl.trim()}
        {#if validatePattern(newExcludeUrl)}
          <div class="validation-error">
            {validatePattern(newExcludeUrl)}
          </div>
        {:else}
          <div class="validation-success">
            有効なパターンです
          </div>
        {/if}
      {/if}
    </div>

    <!-- パターン例 -->
    <div class="pattern-examples">
      <h4>パターン例:</h4>
      <ul>
        {#each getPatternExamples() as example}
          <li>{example}</li>
        {/each}
      </ul>
    </div>
  </div>

  <!-- 除外サイト一覧 -->
  <div class="exclude-list">
    <h3>登録済み除外サイト ({excludeList.length})</h3>
    
    {#if loading}
      <div class="loading-state">
        <div class="loading-icon">⟳</div>
        <div>除外サイトリストを読み込み中...</div>
      </div>
    {:else if error}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div>{error}</div>
        <button class="retry-btn" onclick={loadExcludeList}>再試行</button>
      </div>
    {:else if excludeList.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🚫</div>
        <div class="empty-message">除外サイトが登録されていません</div>
        <div class="empty-suggestion">上のフォームから除外したいサイトを追加してください</div>
      </div>
    {:else}
      <div class="list-container">
        {#each excludeList as pattern, index}
          <div class="exclude-item">
            <div class="pattern-info">
              <div class="pattern-text" title={pattern}>
                {pattern}
              </div>
              <div class="pattern-index">
                #{index + 1}
              </div>
            </div>
            <div class="item-controls">
              <button
                class="remove-btn"
                onclick={() => removeExcludeSite(pattern)}
                title="削除"
              >
                🗑️
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
    
    <!-- リフレッシュボタン -->
    <div class="list-actions">
      <button 
        class="control-btn"
        onclick={loadExcludeList}
        disabled={loading}
      >
        {loading ? '読込中...' : 'リフレッシュ'}
      </button>
      
      {#if excludeList.length > 0}
        <button 
          class="control-btn danger-btn"
          onclick={() => {
            if (confirm(`すべての除外サイト（${excludeList.length}件）を削除しますか？`)) {
              Promise.all(excludeList.map(pattern => removeExcludeSite(pattern)));
            }
          }}
        >
          すべて削除
        </button>
      {/if}
    </div>
  </div>
</div>

<style>
  /* 説明セクション */
  .description {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid #007bff;
  }

  .description p {
    margin: 0.5rem 0;
    color: #333;
    line-height: 1.4;
  }

  .description p:first-child {
    margin-top: 0;
  }

  .description p:last-child {
    margin-bottom: 0;
  }

  /* 追加フォーム */
  .add-form {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .add-form h3 {
    margin: 0 0 1rem 0;
    color: #333;
    font-size: 1.1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #333;
  }

  .input-group {
    display: flex;
    gap: 0.5rem;
  }

  .url-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }

  .add-btn {
    padding: 0.5rem 1rem;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;
  }

  .add-btn:hover:not(:disabled) {
    background: #218838;
  }

  .add-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  /* バリデーション */
  .validation-error {
    color: #dc3545;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  .validation-success {
    color: #28a745;
    font-size: 0.85rem;
    margin-top: 0.25rem;
  }

  /* パターン例 */
  .pattern-examples {
    border-top: 1px solid #dee2e6;
    padding-top: 1rem;
    margin-top: 1rem;
  }

  .pattern-examples h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1rem;
  }

  .pattern-examples ul {
    margin: 0;
    padding-left: 1.5rem;
  }

  .pattern-examples li {
    color: #666;
    font-size: 0.9rem;
    line-height: 1.4;
    margin-bottom: 0.25rem;
  }

  /* 除外サイト一覧 */
  .exclude-list {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
  }

  .exclude-list h3 {
    background: #f8f9fa;
    padding: 1rem;
    margin: 0;
    border-bottom: 1px solid #eee;
    color: #333;
    font-size: 1.1rem;
  }

  .list-container {
    padding: 0.5rem;
  }

  .exclude-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border: 1px solid #eee;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
    transition: all 0.2s;
    background: white;
  }

  .exclude-item:hover {
    border-color: #adb5bd;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .pattern-info {
    flex: 1;
    min-width: 0;
  }

  .pattern-text {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.9rem;
    color: #333;
    word-break: break-all;
    margin-bottom: 0.25rem;
  }

  .pattern-index {
    font-size: 0.8rem;
    color: #999;
  }

  .item-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .remove-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 0.25rem;
    background: #dc3545;
    color: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .remove-btn:hover {
    background: #c82333;
  }

  /* 状態表示 */
  .loading-state, .error-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    text-align: center;
    color: #666;
  }

  .loading-icon, .error-icon, .empty-icon {
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

  .empty-message {
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .empty-suggestion {
    font-size: 0.9rem;
    color: #999;
  }

  /* アクションボタン */
  .list-actions {
    padding: 1rem;
    border-top: 1px solid #eee;
    background: #f8f9fa;
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .control-btn {
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    background: white;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .control-btn:hover:not(:disabled) {
    background: #f8f9fa;
    border-color: #adb5bd;
  }

  .control-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .danger-btn {
    border-color: #dc3545;
    color: #721c24;
  }

  .danger-btn:hover:not(:disabled) {
    background: #f8d7da;
    border-color: #dc3545;
  }
</style>