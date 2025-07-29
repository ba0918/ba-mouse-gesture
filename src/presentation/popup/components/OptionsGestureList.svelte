<!-- OptionsGestureList.svelte - ジェスチャー一覧表示コンポーネント -->
<script lang="ts">
  // Props定義（Svelte 5）
  interface Props {
    gestures: any[];
    gestureSearch: string;
    gestureFilter: string;
    isLoading: boolean;
    onToggleGesture: (gestureId: string, enabled: boolean) => Promise<void>;
  }

  let {
    gestures = $bindable(),
    gestureSearch = $bindable(),
    gestureFilter = $bindable(),
    isLoading,
    onToggleGesture
  }: Props = $props();

  // パターンキャッシュ
  const patternCache = new Map<string, string>();

  // パターンを矢印に変換
  function convertPatternToArrows(pattern: any): string {
    if (!pattern) {
      return '';
    }
    
    // キャッシュキーを生成
    const cacheKey = JSON.stringify(pattern);
    if (patternCache.has(cacheKey)) {
      return patternCache.get(cacheKey)!;
    }
    
    let result = '';
    
    // 既に矢印形式の場合はそのまま返す（デフォルトジェスチャー用）
    if (typeof pattern === 'string' && /^[↑↓←→]+$/.test(pattern)) {
      result = pattern;
      patternCache.set(cacheKey, result);
      return result;
    }
    
    // 配列形式の場合
    if (Array.isArray(pattern) || (typeof pattern === 'object' && pattern.length !== undefined)) {
      try {
        const directions = Array.from(pattern);
        const converted = directions.map(dir => {
          const dirStr = String(dir).toLowerCase();
          switch (dirStr) {
            case 'up': return '↑';
            case 'down': return '↓';
            case 'left': return '←';
            case 'right': return '→';
            default: 
              console.warn('Unknown direction:', dirStr);
              return dirStr;
          }
        });
        result = converted.join('');
        patternCache.set(cacheKey, result);
        return result;
      } catch (error) {
        console.error('Pattern conversion error:', error, pattern);
        result = String(pattern);
        patternCache.set(cacheKey, result);
        return result;
      }
    }
    
    // 文字列形式の場合
    if (typeof pattern === 'string') {
      try {
        // 区切り文字が含まれているかチェック
        if (pattern.includes('→') && !pattern.match(/^[↑↓←→]+$/)) {
          // up→down→left→right のような形式（既に矢印形式でない場合のみ）
          result = pattern
            .split('→')
            .map(dir => {
              switch (dir.trim().toLowerCase()) {
                case 'up': return '↑';
                case 'down': return '↓';
                case 'left': return '←';
                case 'right': return '→';
                default: return dir.trim();
              }
            })
            .join('');
        } else if (pattern.match(/^[↑↓←→]+$/)) {
          // 既に矢印形式の場合はそのまま使用
          result = pattern;
        } else {
          // その他の文字列形式を矢印に変換
          result = pattern
            .replace(/UP/gi, '↑')
            .replace(/DOWN/gi, '↓')
            .replace(/LEFT/gi, '←')
            .replace(/RIGHT/gi, '→');
        }
        patternCache.set(cacheKey, result);
        return result;
      } catch (error) {
        console.error('String pattern conversion error:', error, pattern);
        result = pattern;
        patternCache.set(cacheKey, result);
        return result;
      }
    }
    
    // その他の場合
    result = String(pattern);
    patternCache.set(cacheKey, result);
    return result;
  }

  // フィルタされたジェスチャー一覧
  let filteredGestures = $derived(gestures.filter(gesture => {
    if (gestureSearch) {
      const query = gestureSearch.toLowerCase();
      if (!gesture.name.toLowerCase().includes(query) && 
        !gesture.description.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    if (gestureFilter === 'default') return gesture.type === 'default';
    if (gestureFilter === 'custom') return gesture.type === 'custom';
    
    return true;
  }));
</script>

<!-- ジェスチャー一覧 -->
<div class="section">
  <h2>📋 ジェスチャー一覧</h2>
  <div class="setting-item">
    <div style="width: 100%;">
      <div class="setting-label">利用可能なすべてのジェスチャー</div>
      <div class="setting-description">
        標準ジェスチャーとカスタムジェスチャーを一括管理・確認できます
      </div>
                    
      <!-- 検索・フィルター -->
      <div class="gesture-controls-bar" style="display: flex; gap: 8px; margin: 16px 0; align-items: center;">
        <input 
          type="text" 
          bind:value={gestureSearch} 
          placeholder="ジェスチャーを検索..." 
          style="flex: 1; padding: 8px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px;"
        >
        <select 
          bind:value={gestureFilter} 
          style="padding: 8px; border: 1px solid #dadce0; border-radius: 4px;"
        >
          <option value="all">すべて</option>
          <option value="default">標準ジェスチャー</option>
          <option value="custom">カスタムジェスチャー</option>
        </select>
      </div>
                    
      <!-- ジェスチャー一覧表示 -->
      <div class="all-gestures-container" style="border: 1px solid #e8eaed; border-radius: 8px; background: white; min-height: 200px;">
        {#each filteredGestures as gesture (gesture.id)}
          <div class="all-gesture-item" class:disabled={!gesture.enabled}>
            <div class="gesture-visual">
              <div class="gesture-pattern-large">{convertPatternToArrows(gesture.pattern)}</div>
            </div>
            <div class="gesture-details">
              <div class="gesture-title">
                {gesture.name}
              </div>
              <div class="gesture-description">{gesture.description}</div>
            </div>
            <div class="gesture-actions">
              <button 
                class="gesture-status-toggle" 
                class:enabled={gesture.enabled}
                aria-label={gesture.enabled ? 'ジェスチャーを無効にする' : 'ジェスチャーを有効にする'}
                onclick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                                                
                  // アクション名とジェスチャーIDのマッピングテーブル（UI側での修正）
                  const actionToIdMap: Record<string, string> = {
                    'back': 'left',
                    'forward': 'right',
                    'scroll_top': 'up', 
                    'scroll_bottom': 'down',
                    'close_tab': 'downright',
                    'new_tab': 'upright',
                    'duplicate_tab': 'rightdown',
                    'refresh': 'updown'
                  };
                  
                  // 正しいジェスチャーIDを特定
                  let actualGestureId = String(gesture.id);
                  if (actionToIdMap[actualGestureId]) {
                    actualGestureId = actionToIdMap[actualGestureId];
                  }
                  
                  // 正しいIDで現在のジェスチャー状態を最新のリストから取得
                  const currentGesture = gestures.find(g => g.id === actualGestureId);
                  const currentEnabled = currentGesture?.enabled ?? false;
                  const newEnabled = !currentEnabled;
                                                
                  console.log('🔘 Gesture toggle:', gesture.id, 'current enabled:', currentEnabled, 'new enabled:', newEnabled);
                  console.log('🔍 Debug - Gesture object:', {
                    id: gesture.id,
                    action: gesture.action,
                    name: gesture.name,
                    type: gesture.type,
                    enabled: gesture.enabled
                  });
                  console.log('🔍 Debug - Full gesture object:', gesture);
                  console.log('🔍 Debug - Using actualGestureId for toggle:', actualGestureId);
                  
                  // 正しいIDでトグル実行
                  await onToggleGesture(actualGestureId, newEnabled);
                }}
              ></button>
            </div>
          </div>
        {/each}
        {#if filteredGestures.length === 0}
          <div class="empty-state">
            <p>条件に一致するジェスチャーが見つかりません</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* セクション共通スタイル */
  .section {
    background: white;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 16px;
    box-shadow: 0 1px 3px rgba(60,64,67,0.3);
  }

  .section h2 {
    font-size: 18px;
    font-weight: 600;
    color: #202124;
    margin: 0 0 16px 0;
    border-bottom: 2px solid #1a73e8;
    padding-bottom: 8px;
  }

  .setting-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 12px 0;
  }

  .setting-label {
    font-weight: 500;
    color: #202124;
    margin-bottom: 4px;
  }

  .setting-description {
    font-size: 13px;
    color: #5f6368;
    line-height: 1.4;
    margin-bottom: 16px;
  }

  /* ジェスチャー一覧画面用スタイル */
  .all-gestures-container {
    max-height: 400px;
    overflow-y: auto;
  }

  .all-gesture-item {
    display: flex;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #f1f3f4;
    transition: background-color 0.2s;
  }

  .all-gesture-item:hover {
    background-color: #f8f9fa;
  }

  .all-gesture-item:last-child {
    border-bottom: none;
  }

  .all-gesture-item.disabled {
    opacity: 0.6;
    background-color: #fafbfc;
  }

  .gesture-visual {
    width: 80px;
    text-align: center;
    margin-right: 16px;
    flex-shrink: 0;
  }

  .gesture-pattern-large {
    font-size: 20px;
    line-height: 1.2;
    margin-bottom: 4px;
    word-break: break-all;
    overflow-wrap: break-word;
    max-width: 100%;
  }

  .gesture-details {
    flex: 1;
    min-width: 0;
  }

  .gesture-title {
    font-weight: 600;
    color: #202124;
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .gesture-description {
    color: #5f6368;
    font-size: 13px;
    line-height: 1.3;
  }

  .gesture-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .gesture-status-toggle {
    width: 40px;
    height: 20px;
    background: #dadce0;
    border: none;
    border-radius: 10px;
    cursor: pointer;
    position: relative;
    transition: background-color 0.3s;
  }

  .gesture-status-toggle.enabled {
    background: #34a853;
  }

  .gesture-status-toggle::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    background: white;
    border-radius: 50%;
    top: 2px;
    left: 2px;
    transition: transform 0.3s;
  }

  .gesture-status-toggle.enabled::after {
    transform: translateX(20px);
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #5f6368;
  }

  .empty-state p {
    margin: 0;
    font-size: 14px;
  }
</style>