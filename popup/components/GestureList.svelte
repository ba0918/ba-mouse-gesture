<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  interface GestureItem {
    id: string;
    name: string;
    pattern: string;
    action: string;
    type: 'default' | 'custom';
    category: string;
    description: string;
    enabled: boolean;
  }

  type FilterType = 'all' | 'enabled' | 'disabled' | 'custom' | 'default';
  type ViewMode = 'list' | 'card';

  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();

  // 状態管理
  let gestures: GestureItem[] = [];
  let filteredGestures: GestureItem[] = [];
  let currentFilter: FilterType = 'all';
  let searchQuery: string = '';
  let viewMode: ViewMode = 'list';
  let loading: boolean = true;
  let error: string = '';

  // 統計情報
  $: statistics = {
    total: gestures.length,
    enabled: gestures.filter(g => g.enabled).length,
    disabled: gestures.filter(g => !g.enabled).length,
    custom: gestures.filter(g => g.type === 'custom').length,
    default: gestures.filter(g => g.type === 'default').length
  };

  // フィルタリング処理
  $: {
    filteredGestures = gestures.filter(gesture => {
      // 検索フィルター
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = gesture.name.toLowerCase().includes(query);
        const matchesDescription = gesture.description.toLowerCase().includes(query);
        if (!matchesName && !matchesDescription) return false;
      }
      
      // ステータスフィルター
      if (currentFilter === 'enabled') return gesture.enabled;
      if (currentFilter === 'disabled') return !gesture.enabled;
      if (currentFilter === 'custom') return gesture.type === 'custom';
      if (currentFilter === 'default') return gesture.type === 'default';
      
      return true; // 'all'
    });
  }

  // カテゴリ別グループ化
  $: groupedGestures = groupGesturesByCategory(filteredGestures);

  // ジェスチャーデータの読み込み
  async function loadGestures(): Promise<void> {
    try {
      loading = true;
      error = '';
      
      // ServiceFactory経由でGestureListUseCaseを取得
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }
      
      const gestureListUseCase = serviceFactory.createGestureListUseCase();
      gestures = await gestureListUseCase.getAllGestures();
      
      console.log(`🔧 GestureList: Loaded ${gestures.length} gestures`);
      
    } catch (err) {
      console.error('🚨 GestureList: Failed to load gestures:', err);
      error = 'ジェスチャー一覧の読み込みに失敗しました';
      dispatch('save-status', { 
        message: error, 
        type: 'error' 
      });
    } finally {
      loading = false;
    }
  }

  // ジェスチャーの有効/無効切り替え
  async function toggleGesture(gestureId: string, enabled: boolean): Promise<void> {
    try {
      console.log(`🔧 GestureList: Toggling gesture ${gestureId} to ${enabled}`);
      
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      
      if (gestures.find(g => g.id === gestureId)?.type === 'custom') {
        // カスタムジェスチャーの場合
        const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
        await customGestureManagementUseCase.toggleCustomGesture(gestureId, enabled);
      } else {
        // デフォルトジェスチャーの場合
        await settingsManagementUseCase.toggleDefaultGesture(gestureId, enabled);
      }
      
      // ローカル状態を更新
      const gesture = gestures.find(g => g.id === gestureId);
      if (gesture) {
        gesture.enabled = enabled;
      }
      
      // 配列の更新を通知（Svelte reactivity）
      gestures = [...gestures];
      
      dispatch('save-status', { 
        message: `ジェスチャー「${gestureId}」を${enabled ? '有効' : '無効'}にしました`, 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 GestureList: Failed to toggle gesture:', err);
      dispatch('save-status', { 
        message: 'ジェスチャーの設定変更に失敗しました', 
        type: 'error' 
      });
      
      // エラー時は元に戻す
      await loadGestures();
    }
  }

  // カスタムジェスチャーの削除
  async function deleteCustomGesture(gestureId: string): Promise<void> {
    try {
      // 確認ダイアログ
      if (!confirm('このカスタムジェスチャーを削除しますか？')) return;
      
      console.log(`🔧 GestureList: Deleting custom gesture ${gestureId}`);
      
      const serviceFactory = (window as any).ServiceFactory;
      const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
      
      await customGestureManagementUseCase.deleteCustomGesture(gestureId);
      
      // データを再読み込み
      await loadGestures();
      
      dispatch('save-status', { 
        message: 'カスタムジェスチャーを削除しました', 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 GestureList: Failed to delete custom gesture:', err);
      dispatch('save-status', { 
        message: 'カスタムジェスチャーの削除に失敗しました', 
        type: 'error' 
      });
    }
  }

  // 全ジェスチャーの有効/無効を切り替え
  async function toggleAllGestures(): Promise<void> {
    try {
      const allEnabled = filteredGestures.every(g => g.enabled);
      const newState = !allEnabled;
      
      console.log(`🔧 GestureList: Toggling all visible gestures to ${newState}`);
      
      // 並列で処理
      await Promise.all(
        filteredGestures.map(gesture => toggleGesture(gesture.id, newState))
      );
      
      dispatch('save-status', { 
        message: `表示中のジェスチャーを${newState ? '有効' : '無効'}にしました`, 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 GestureList: Failed to toggle all gestures:', err);
      dispatch('save-status', { 
        message: '一括設定に失敗しました', 
        type: 'error' 
      });
    }
  }

  // カテゴリ別グループ化
  function groupGesturesByCategory(gestures: GestureItem[]): Record<string, GestureItem[]> {
    const groups: Record<string, GestureItem[]> = {};
    
    gestures.forEach(gesture => {
      const category = gesture.category || 'basic';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(gesture);
    });
    
    return groups;
  }

  // カテゴリ名の表示変換
  function getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      basic: '基本ジェスチャー',
      tab: 'タブ操作',
      page: 'ページ操作',
      custom: 'カスタムジェスチャー'
    };
    return categoryNames[category] || category;
  }

  // 検索テキストハイライト
  function highlightSearchText(text: string): string {
    if (!searchQuery || !text) return text;
    
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  // コンポーネントマウント時の初期化
  onMount(() => {
    loadGestures();
  });
</script>

<div class="section">
  <h2>📋 ジェスチャー一覧</h2>
  
  <!-- 統計情報 -->
  <div class="gesture-stats">
    <div class="stat-item">
      <span class="stat-label">総数:</span>
      <span class="stat-value">{statistics.total}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">有効:</span>
      <span class="stat-value success">{statistics.enabled}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">無効:</span>
      <span class="stat-value error">{statistics.disabled}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">カスタム:</span>
      <span class="stat-value info">{statistics.custom}</span>
    </div>
  </div>

  <!-- コントロールパネル -->
  <div class="gesture-controls">
    <!-- 検索 -->
    <div class="control-group">
      <input
        type="text"
        placeholder="ジェスチャーを検索..."
        bind:value={searchQuery}
        class="search-input"
      />
    </div>

    <!-- フィルター -->
    <div class="control-group">
      <select bind:value={currentFilter} class="filter-select">
        <option value="all">すべて</option>
        <option value="enabled">有効のみ</option>
        <option value="disabled">無効のみ</option>
        <option value="default">標準のみ</option>
        <option value="custom">カスタムのみ</option>
      </select>
    </div>

    <!-- 表示モード切り替え -->
    <div class="control-group">
      <button
        class="control-btn"
        on:click={() => viewMode = viewMode === 'list' ? 'card' : 'list'}
      >
        {viewMode === 'list' ? 'カード表示' : 'リスト表示'}
      </button>
    </div>

    <!-- 一括操作 -->
    <div class="control-group">
      <button
        class="control-btn"
        on:click={toggleAllGestures}
        disabled={filteredGestures.length === 0}
      >
        {filteredGestures.every(g => g.enabled) ? '全て無効' : '全て有効'}
      </button>
    </div>

    <!-- リフレッシュ -->
    <div class="control-group">
      <button class="control-btn" on:click={loadGestures} disabled={loading}>
        {loading ? '読込中...' : 'リフレッシュ'}
      </button>
    </div>
  </div>

  <!-- ジェスチャー一覧 -->
  <div class="gesture-list-container">
    {#if loading}
      <div class="loading-state">
        <div class="loading-icon">⟳</div>
        <div>ジェスチャーを読み込み中...</div>
      </div>
    {:else if error}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div>{error}</div>
        <button class="retry-btn" on:click={loadGestures}>再試行</button>
      </div>
    {:else if filteredGestures.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <div class="empty-message">
          {searchQuery ? 
              `「${searchQuery}」に一致するジェスチャーが見つかりませんでした` : 
              'ジェスチャーが見つかりませんでした'}
        </div>
        <div class="empty-suggestion">
          フィルターを変更するか、検索条件を調整してください
        </div>
      </div>
    {:else}
      <!-- カテゴリ別ジェスチャー表示 -->
      {#each Object.entries(groupedGestures) as [category, categoryGestures]}
        <div class="gesture-category">
          <div class="category-header">
            {getCategoryDisplayName(category)} ({categoryGestures.length})
          </div>
          <div class="gesture-items {viewMode}">
            {#each categoryGestures as gesture}
              <div class="gesture-item {gesture.enabled ? 'enabled' : 'disabled'}" data-gesture-id={gesture.id}>
                {#if viewMode === 'list'}
                  <!-- リスト表示 -->
                  <div class="gesture-pattern" title="ジェスチャーパターン">
                    {gesture.pattern}
                  </div>
                  <div class="gesture-info">
                    <div class="gesture-name">{@html highlightSearchText(gesture.name)}</div>
                    <div class="gesture-description">{@html highlightSearchText(gesture.description)}</div>
                  </div>
                  <div class="gesture-controls">
                    <label class="switch" title={gesture.enabled ? '無効にする' : '有効にする'}>
                      <input
                        type="checkbox"
                        checked={gesture.enabled}
                        on:change={(e) => toggleGesture(gesture.id, e.currentTarget.checked)}
                      />
                      <span class="slider"></span>
                    </label>
                    {#if gesture.type === 'custom'}
                      <button
                        class="delete-gesture-btn"
                        on:click={() => deleteCustomGesture(gesture.id)}
                        title="削除"
                      >
                        ✕
                      </button>
                    {/if}
                  </div>
                {:else}
                  <!-- カード表示 -->
                  <div class="gesture-card {gesture.enabled ? 'enabled' : 'disabled'}">
                    {#if gesture.type === 'custom'}
                      <button
                        class="delete-gesture-btn card-delete"
                        on:click={() => deleteCustomGesture(gesture.id)}
                        title="削除"
                      >
                        ✕
                      </button>
                    {/if}
                    <div class="gesture-card-pattern">{gesture.pattern}</div>
                    <div class="gesture-card-info">
                      <div class="gesture-card-name">{@html highlightSearchText(gesture.name)}</div>
                      <div class="gesture-card-description">{@html highlightSearchText(gesture.description)}</div>
                    </div>
                    <div class="gesture-card-toggle">
                      <label class="switch" title={gesture.enabled ? '無効にする' : '有効にする'}>
                        <input
                          type="checkbox"
                          checked={gesture.enabled}
                          on:change={(e) => toggleGesture(gesture.id, e.currentTarget.checked)}
                        />
                        <span class="slider"></span>
                      </label>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
</div>

<style>
  /* 統計情報 */
  .gesture-stats {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f8f9fa;
    border-radius: 0.5rem;
    flex-wrap: wrap;
  }

  .stat-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9rem;
  }

  .stat-label {
    color: #666;
  }

  .stat-value {
    font-weight: 600;
    padding: 0.125rem 0.5rem;
    border-radius: 0.25rem;
    background: #e9ecef;
  }

  .stat-value.success {
    background: #d4edda;
    color: #155724;
  }

  .stat-value.error {
    background: #f8d7da;
    color: #721c24;
  }

  .stat-value.info {
    background: #d1ecf1;
    color: #0c5460;
  }

  /* コントロールパネル */
  .gesture-controls {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .control-group {
    display: flex;
    align-items: center;
  }

  .search-input, .filter-select {
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }

  .search-input {
    min-width: 200px;
  }

  .control-btn {
    padding: 0.5rem 0.75rem;
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

  /* ジェスチャー一覧 */
  .gesture-list-container {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
    min-height: 300px;
  }

  /* カテゴリ */
  .gesture-category {
    border-bottom: 1px solid #eee;
  }

  .gesture-category:last-child {
    border-bottom: none;
  }

  .category-header {
    background: #f8f9fa;
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #495057;
    border-bottom: 1px solid #eee;
  }

  /* ジェスチャーアイテム */
  .gesture-items {
    padding: 0.5rem;
  }

  .gesture-items.list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .gesture-items.card {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.75rem;
  }

  .gesture-item {
    display: flex;
    align-items: center;
    padding: 0.75rem;
    border: 1px solid #eee;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }

  .gesture-item:hover {
    border-color: #adb5bd;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .gesture-item.enabled {
    background: #f8fff9;
    border-color: #28a745;
  }

  .gesture-item.disabled {
    background: #fff8f8;
    border-color: #dc3545;
    opacity: 0.8;
  }

  .gesture-pattern {
    font-size: 1.5rem;
    font-weight: bold;
    color: #007bff;
    min-width: 60px;
    text-align: center;
    margin-right: 1rem;
  }

  .gesture-info {
    flex: 1;
    min-width: 0;
  }

  .gesture-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: #333;
  }

  .gesture-description {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.3;
  }

  .gesture-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  /* カード表示 */
  .gesture-card {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 0.5rem;
    text-align: center;
    transition: all 0.2s;
  }

  .gesture-card:hover {
    border-color: #adb5bd;
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  .gesture-card.enabled {
    background: #f8fff9;
    border-color: #28a745;
  }

  .gesture-card.disabled {
    background: #fff8f8;
    border-color: #dc3545;
    opacity: 0.8;
  }

  .gesture-card-pattern {
    font-size: 2rem;
    font-weight: bold;
    color: #007bff;
    margin-bottom: 0.75rem;
  }

  .gesture-card-info {
    flex: 1;
    margin-bottom: 0.75rem;
  }

  .gesture-card-name {
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #333;
  }

  .gesture-card-description {
    font-size: 0.85rem;
    color: #666;
    line-height: 1.3;
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

  /* 削除ボタン */
  .delete-gesture-btn {
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    cursor: pointer;
    font-size: 0.75rem;
    transition: all 0.2s;
  }

  .delete-gesture-btn:hover {
    background: #c82333;
  }

  .delete-gesture-btn.card-delete {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
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

  /* 検索ハイライト */
  :global(.search-highlight) {
    background: #fff3cd;
    padding: 0.125rem 0.25rem;
    border-radius: 0.125rem;
    font-weight: 600;
  }
</style>