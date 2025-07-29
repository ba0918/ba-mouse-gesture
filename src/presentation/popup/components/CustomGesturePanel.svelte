<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  
  interface CustomGesture {
    id: string;
    name: string;
    pattern: string;
    action: string;
    enabled: boolean;
    usageStats?: {
      totalUses: number;
      successRate: number;
      lastUsed?: string;
    };
  }

  interface Point {
    x: number;
    y: number;
    timestamp: number;
  }

  type Direction = 'up' | 'down' | 'left' | 'right';
  type GestureAction = 'back' | 'forward' | 'refresh' | 'close_tab' | 'new_tab' | 'duplicate_tab' | 'scroll_top' | 'scroll_bottom' | 'super_refresh' | 'prev_tab' | 'next_tab';

  const dispatch = createEventDispatcher<{
    'save-status': {message: string, type: 'success' | 'error'}
  }>();

  // 状態管理
  let customGestures: CustomGesture[] = [];
  let loading: boolean = true;
  let error: string = '';

  // フォーム状態
  let gestureName: string = '';
  let gestureAction: GestureAction | '' = '';
  let currentPattern: Direction[] = [];
  let editingGestureId: string | null = null;

  // リアクティブ変数
  $: patternDisplay = currentPattern.length > 0 ? 
    currentPattern.map(dir => ({ 'up': '↑', 'down': '↓', 'left': '←', 'right': '→' }[dir] || dir)).join('') : 
      'パターンなし';
  $: canSubmit = gestureName.trim() && gestureAction && currentPattern.length > 0;
  $: isEditMode = editingGestureId !== null;

  // 利用可能なアクション
  const availableActions: {value: GestureAction, label: string}[] = [
    { value: 'back', label: 'ブラウザの戻る' },
    { value: 'forward', label: 'ブラウザの進む' },
    { value: 'refresh', label: 'ページ更新' },
    { value: 'super_refresh', label: 'スーパーリロード（キャッシュクリア）' },
    { value: 'close_tab', label: 'タブを閉じる' },
    { value: 'new_tab', label: '新しいタブを開く' },
    { value: 'duplicate_tab', label: 'タブ複製' },
    { value: 'scroll_top', label: 'ページ最上部スクロール' },
    { value: 'scroll_bottom', label: 'ページ最下部スクロール' },
    { value: 'prev_tab', label: '前のタブ' },
    { value: 'next_tab', label: '次のタブ' }
  ];

  // カスタムジェスチャー読み込み
  async function loadCustomGestures(): Promise<void> {
    try {
      loading = true;
      error = '';
      
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }
      
      const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
      const gestureData = await customGestureManagementUseCase.getAllCustomGestures();
      
      // データ形式を統一
      customGestures = gestureData.map((gesture: any) => ({
        id: gesture.id,
        name: gesture.name,
        pattern: gesture.pattern?.toString() || '',
        action: gesture.action,
        enabled: gesture.enabled,
        usageStats: gesture.usageStats || {
          totalUses: 0,
          successRate: 0,
          lastUsed: undefined
        }
      }));
      
      console.log(`🔧 CustomGesturePanel: Loaded ${customGestures.length} custom gestures`);
      
    } catch (err) {
      console.error('🚨 CustomGesturePanel: Failed to load custom gestures:', err);
      error = 'カスタムジェスチャーの読み込みに失敗しました';
      dispatch('save-status', { 
        message: error, 
        type: 'error' 
      });
    } finally {
      loading = false;
    }
  }

  // 方向をパターンに追加
  function addDirection(direction: Direction): void {
    if (currentPattern.length < 10) { // 最大10方向まで
      currentPattern = [...currentPattern, direction];
      console.log(`🔧 CustomGesturePanel: Direction ${direction} added, pattern: ${currentPattern.join('')}`);
    } else {
      dispatch('save-status', { 
        message: 'パターンが長すぎます（最大10方向）', 
        type: 'error' 
      });
    }
  }

  // パターンクリア
  function clearPattern(): void {
    currentPattern = [];
    console.log('🔧 CustomGesturePanel: Pattern cleared');
  }

  // パターンの最後の方向を削除
  function removeLastDirection(): void {
    if (currentPattern.length > 0) {
      currentPattern = currentPattern.slice(0, -1);
      console.log(`🔧 CustomGesturePanel: Last direction removed, pattern: ${currentPattern.join('')}`);
    }
  }

  // Point配列を生成（パターンから軌跡点を生成）
  function generatePointsFromPattern(pattern: Direction[]): Point[] {
    const points: Point[] = [];
    let currentX = 100; // 開始座標
    let currentY = 100;
    
    // 開始点を追加
    points.push({
      x: currentX,
      y: currentY,
      timestamp: Date.now()
    });
    
    // 各方向について終点を計算
    pattern.forEach((direction, index) => {
      const distance = 50; // 移動距離
      
      switch (direction) {
        case 'up':
          currentY -= distance;
          break;
        case 'down':
          currentY += distance;
          break;
        case 'left':
          currentX -= distance;
          break;
        case 'right':
          currentX += distance;
          break;
      }
      
      points.push({
        x: currentX,
        y: currentY,
        timestamp: Date.now() + (index + 1) * 100
      });
    });

    return points;
  }

  // カスタムジェスチャー追加・更新
  async function handleSubmit(): Promise<void> {
    try {
      console.log('🔧 CustomGesturePanel: Submit called', {
        isEditMode,
        editingGestureId,
        gestureName,
        gestureAction,
        patternLength: currentPattern.length
      });
      
      if (!canSubmit) {
        dispatch('save-status', { 
          message: '必要な項目をすべて入力してください', 
          type: 'error' 
        });
        return;
      }

      const serviceFactory = (window as any).ServiceFactory;
      const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
      
      const rawPoints = generatePointsFromPattern(currentPattern);
      
      if (isEditMode && editingGestureId) {
        // 更新処理
        const updates = {
          name: gestureName.trim(),
          pattern: rawPoints,
          action: gestureAction
        };
        await customGestureManagementUseCase.updateCustomGesture(editingGestureId, updates);
        
        exitEditMode();
        dispatch('save-status', { 
          message: 'カスタムジェスチャーを更新しました', 
          type: 'success' 
        });
      } else {
        // 新規追加処理
        await customGestureManagementUseCase.createCustomGesture(
          gestureName.trim(), 
          rawPoints, 
          gestureAction as GestureAction
        );
        
        // フォームをリセット（アクションは保持）
        gestureName = '';
        clearPattern();
        
        dispatch('save-status', { 
          message: 'カスタムジェスチャーを追加しました', 
          type: 'success' 
        });
      }
      
      // データを再読み込み
      await loadCustomGestures();
      
    } catch (err) {
      console.error('🚨 CustomGesturePanel: Failed to submit:', err);
      const errorMessage = err instanceof Error ? err.message : '操作に失敗しました';
      dispatch('save-status', { 
        message: errorMessage, 
        type: 'error' 
      });
    }
  }

  // 編集モード開始
  function enterEditMode(gesture: CustomGesture): void {
    editingGestureId = gesture.id;
    gestureName = gesture.name;
    gestureAction = gesture.action as GestureAction;
    
    // パターンを方向配列に変換（簡易実装）
    const patternString = gesture.pattern;
    const directionMap: Record<string, Direction> = { '↑': 'up', '↓': 'down', '←': 'left', '→': 'right' };
    currentPattern = patternString.split('').map(char => directionMap[char]).filter(Boolean);
    
    console.log(`🔧 CustomGesturePanel: Entered edit mode for ${gesture.id}`, {
      name: gestureName,
      action: gestureAction,
      pattern: currentPattern
    });
  }

  // 編集モード終了
  function exitEditMode(): void {
    editingGestureId = null;
    gestureName = '';
    gestureAction = '';
    clearPattern();
    
    console.log('🔧 CustomGesturePanel: Exited edit mode');
  }

  // カスタムジェスチャー削除
  async function deleteCustomGesture(gestureId: string): Promise<void> {
    try {
      if (!confirm('このカスタムジェスチャーを削除しますか？')) return;
      
      console.log(`🔧 CustomGesturePanel: Deleting custom gesture ${gestureId}`);
      
      // 削除対象が編集中のジェスチャーかチェック
      if (editingGestureId === gestureId) {
        exitEditMode();
      }
      
      const serviceFactory = (window as any).ServiceFactory;
      const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
      
      await customGestureManagementUseCase.deleteCustomGesture(gestureId);
      
      // データを再読み込み
      await loadCustomGestures();
      
      dispatch('save-status', { 
        message: 'カスタムジェスチャーを削除しました', 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 CustomGesturePanel: Failed to delete custom gesture:', err);
      dispatch('save-status', { 
        message: 'カスタムジェスチャーの削除に失敗しました', 
        type: 'error' 
      });
    }
  }

  // カスタムジェスチャーの有効/無効切り替え
  async function toggleCustomGesture(gestureId: string, enabled: boolean): Promise<void> {
    try {
      console.log(`🔧 CustomGesturePanel: Toggling gesture ${gestureId} to ${enabled}`);
      
      const serviceFactory = (window as any).ServiceFactory;
      const customGestureManagementUseCase = serviceFactory.createCustomGestureManagementUseCase();
      
      await customGestureManagementUseCase.toggleCustomGesture(gestureId, enabled);
      
      // ローカル状態を更新
      const gesture = customGestures.find(g => g.id === gestureId);
      if (gesture) {
        gesture.enabled = enabled;
      }
      
      // 配列の更新を通知（Svelte reactivity）
      customGestures = [...customGestures];
      
      dispatch('save-status', { 
        message: `ジェスチャー「${gestureId}」を${enabled ? '有効' : '無効'}にしました`, 
        type: 'success' 
      });
      
    } catch (err) {
      console.error('🚨 CustomGesturePanel: Failed to toggle gesture:', err);
      dispatch('save-status', { 
        message: 'ジェスチャーの設定変更に失敗しました', 
        type: 'error' 
      });
      
      // エラー時は元に戻す
      await loadCustomGestures();
    }
  }

  // コンポーネントマウント時の初期化
  onMount(() => {
    loadCustomGestures();
  });
</script>

<div class="section">
  <h2>🎨 カスタムジェスチャー</h2>
  
  <!-- カスタムジェスチャー作成フォーム -->
  <div class="custom-gesture-form">
    <h3>{isEditMode ? 'ジェスチャー編集' : 'ジェスチャー作成'}</h3>
    
    <!-- ジェスチャー名 -->
    <div class="form-group">
      <label for="gestureName">ジェスチャー名:</label>
      <input
        id="gestureName"
        type="text"
        bind:value={gestureName}
        placeholder="例: マイカスタムジェスチャー"
        maxlength="50"
        class="name-input"
      />
    </div>

    <!-- パターン作成 -->
    <div class="form-group">
      <label for="gesturePatternDisplay">ジェスチャーパターン:</label>
      <div class="pattern-creator">
        <div class="pattern-display">
          <input
            id="gesturePatternDisplay"
            type="text"
            value={patternDisplay}
            readonly
            placeholder="方向ボタンでパターンを作成"
            class="pattern-input"
          />
          <div class="pattern-info">
            {currentPattern.length}/10 方向
          </div>
        </div>
        
        <!-- 方向ボタン -->
        <div class="direction-buttons">
          <div class="direction-row">
            <button
              type="button"
              class="direction-btn"
              onclick={() => addDirection('up')}
              disabled={currentPattern.length >= 10}
              title="上"
            >
              ↑
            </button>
          </div>
          <div class="direction-row">
            <button
              type="button"
              class="direction-btn"
              onclick={() => addDirection('left')}
              disabled={currentPattern.length >= 10}
              title="左"
            >
              ←
            </button>
            <button
              type="button"
              class="direction-btn"
              onclick={() => addDirection('down')}
              disabled={currentPattern.length >= 10}
              title="下"
            >
              ↓
            </button>
            <button
              type="button"
              class="direction-btn"
              onclick={() => addDirection('right')}
              disabled={currentPattern.length >= 10}
              title="右"
            >
              →
            </button>
          </div>
        </div>
        
        <!-- パターン操作ボタン -->
        <div class="pattern-controls">
          <button
            type="button"
            class="control-btn remove-btn"
            onclick={removeLastDirection}
            disabled={currentPattern.length === 0}
          >
            一つ戻す
          </button>
          <button
            type="button"
            class="control-btn clear-btn"
            onclick={clearPattern}
            disabled={currentPattern.length === 0}
          >
            クリア
          </button>
        </div>
      </div>
    </div>

    <!-- アクション選択 -->
    <div class="form-group">
      <label for="gestureAction">アクション:</label>
      <select
        id="gestureAction"
        bind:value={gestureAction}
        class="action-select"
      >
        <option value="">アクションを選択...</option>
        {#each availableActions as action}
          <option value={action.value}>{action.label}</option>
        {/each}
      </select>
    </div>

    <!-- 送信ボタン -->
    <div class="form-actions">
      {#if isEditMode}
        <button
          type="button"
          class="submit-btn cancel-btn"
          onclick={exitEditMode}
        >
          キャンセル
        </button>
      {/if}
      <button
        type="button"
        class="submit-btn primary-btn"
        onclick={handleSubmit}
        disabled={!canSubmit}
      >
        {isEditMode ? '更新' : '追加'}
      </button>
    </div>
  </div>

  <!-- カスタムジェスチャー一覧 -->
  <div class="custom-gesture-list">
    <h3>作成済みカスタムジェスチャー ({customGestures.length})</h3>
    
    {#if loading}
      <div class="loading-state">
        <div class="loading-icon">⟳</div>
        <div>カスタムジェスチャーを読み込み中...</div>
      </div>
    {:else if error}
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div>{error}</div>
        <button class="retry-btn" onclick={loadCustomGestures}>再試行</button>
      </div>
    {:else if customGestures.length === 0}
      <div class="empty-state">
        <div class="empty-icon">🎨</div>
        <div class="empty-message">カスタムジェスチャーが作成されていません</div>
        <div class="empty-suggestion">上のフォームから新しいジェスチャーを作成してください</div>
      </div>
    {:else}
      <div class="gesture-items">
        {#each customGestures as gesture}
          <div class="gesture-item {gesture.enabled ? 'enabled' : 'disabled'}">
            <div class="gesture-pattern">{gesture.pattern}</div>
            <div class="gesture-info">
              <div class="gesture-name">{gesture.name}</div>
              <div class="gesture-action">
                {availableActions.find(a => a.value === gesture.action)?.label || gesture.action}
              </div>
              {#if gesture.usageStats && gesture.usageStats.totalUses > 0}
                <div class="gesture-stats">
                  使用回数: {gesture.usageStats.totalUses}回
                  | 成功率: {Math.round(gesture.usageStats.successRate * 100)}%
                </div>
              {/if}
            </div>
            <div class="gesture-controls">
              <label class="switch" title={gesture.enabled ? '無効にする' : '有効にする'}>
                <input
                  type="checkbox"
                  checked={gesture.enabled}
                  onchange={(e) => toggleCustomGesture(gesture.id, e.currentTarget.checked)}
                />
                <span class="slider"></span>
              </label>
              <button
                class="control-btn edit-btn"
                onclick={() => enterEditMode(gesture)}
                title="編集"
              >
                ✏️
              </button>
              <button
                class="control-btn delete-btn"
                onclick={() => deleteCustomGesture(gesture.id)}
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
        onclick={loadCustomGestures}
        disabled={loading}
      >
        {loading ? '読込中...' : 'リフレッシュ'}
      </button>
    </div>
  </div>
</div>

<style>
  /* フォームスタイル */
  .custom-gesture-form {
    background: #f8f9fa;
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .custom-gesture-form h3 {
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

  .name-input, .action-select {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 0.9rem;
  }

  /* パターン作成 */
  .pattern-creator {
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    padding: 1rem;
    background: white;
  }

  .pattern-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .pattern-input {
    flex: 1;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 0.25rem;
    font-size: 1.2rem;
    font-weight: bold;
    text-align: center;
    background: #f8f9fa;
    color: #007bff;
  }

  .pattern-info {
    font-size: 0.8rem;
    color: #666;
    white-space: nowrap;
  }

  .direction-buttons {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }

  .direction-row {
    display: flex;
    gap: 0.25rem;
  }

  .direction-btn {
    width: 50px;
    height: 50px;
    border: 2px solid #007bff;
    border-radius: 0.25rem;
    background: white;
    color: #007bff;
    font-size: 1.5rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .direction-btn:hover:not(:disabled) {
    background: #007bff;
    color: white;
  }

  .direction-btn:active {
    transform: scale(0.95);
  }

  .direction-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .pattern-controls {
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

  .remove-btn {
    border-color: #ffc107;
    color: #856404;
  }

  .remove-btn:hover:not(:disabled) {
    background: #fff3cd;
    border-color: #ffc107;
  }

  .clear-btn {
    border-color: #dc3545;
    color: #721c24;
  }

  .clear-btn:hover:not(:disabled) {
    background: #f8d7da;
    border-color: #dc3545;
  }

  /* フォームアクション */
  .form-actions {
    display: flex;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  .submit-btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.25rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .primary-btn {
    background: #28a745;
    color: white;
  }

  .primary-btn:hover:not(:disabled) {
    background: #218838;
  }

  .primary-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .cancel-btn {
    background: #6c757d;
    color: white;
  }

  .cancel-btn:hover {
    background: #545b62;
  }

  /* カスタムジェスチャー一覧 */
  .custom-gesture-list {
    border: 1px solid #ddd;
    border-radius: 0.5rem;
    background: white;
  }

  .custom-gesture-list h3 {
    background: #f8f9fa;
    padding: 1rem;
    margin: 0;
    border-bottom: 1px solid #eee;
    color: #333;
    font-size: 1.1rem;
  }

  .gesture-items {
    padding: 0.5rem;
  }

  .gesture-item {
    display: flex;
    align-items: center;
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 0.25rem;
    margin-bottom: 0.5rem;
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
    min-width: 80px;
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

  .gesture-action {
    font-size: 0.9rem;
    color: #666;
    margin-bottom: 0.25rem;
  }

  .gesture-stats {
    font-size: 0.8rem;
    color: #999;
  }

  .gesture-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .edit-btn, .delete-btn {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s;
  }

  .edit-btn {
    background: #17a2b8;
    color: white;
  }

  .edit-btn:hover {
    background: #138496;
  }

  .delete-btn {
    background: #dc3545;
    color: white;
  }

  .delete-btn:hover {
    background: #c82333;
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

  .list-actions {
    padding: 1rem;
    border-top: 1px solid #eee;
    background: #f8f9fa;
    text-align: center;
  }
</style>