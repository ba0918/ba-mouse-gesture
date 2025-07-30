<script lang="ts">
  import { onMount } from 'svelte';
  import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';
  
  // コンポーネントのインポート
  import OptionsBasicSettings from './components/OptionsBasicSettings.svelte';
  import OptionsTrackSettings from './components/OptionsTrackSettings.svelte';
  import OptionsDebugSettings from './components/OptionsDebugSettings.svelte';
  import OptionsCustomGestures from './components/OptionsCustomGestures.svelte';
  import OptionsGestureList from './components/OptionsGestureList.svelte';
  import OptionsExcludeList from './components/OptionsExcludeList.svelte';

  // 状態管理
  let isLoading = $state(true);
  let saveStatus = $state('');
  let saveStatusType = $state<'success' | 'error'>('success');
  let saveStatusVisible = $state(false);
  
  // 基本設定
  let enabled = $state(true);
  
  // 軌跡設定
  let strokeColor = $state('#2196F3');
  let strokeWidth = $state(3);
  let gestureThreshold = $state(15);
  
  // 除外サイト
  let excludeList = $state<string[]>([]);
  let newExcludeUrl = $state('');
  
  // デバッグ設定
  let debugEnabled = $state(false);
  let debugLogLevel = $state('2'); // 文字列型に変更
  let debugShowStatus = $state(false);
  let debugStatusPosition = $state('top-right');
  
  // ジェスチャー関連
  let gestures = $state<any[]>([]);
  let customGestures = $state<any[]>([]);
  let gestureSearch = $state('');
  let gestureFilter = $state('all');
  
  // カスタムジェスチャー追加フォーム
  let gestureName = $state('');
  let gesturePatternDisplay = $state('');
  let gestureAction = $state('back');
  let currentPattern = $state<string[]>([]);
  let customGestureError = $state('');
  
  // 確認ダイアログ
  let confirmDialog = $state(false);
  let confirmMessage = $state('');
  let confirmCallback = $state<(() => void) | null>(null);

  // デバッグロガー
  let logger: DebugLogger | null = null;

  onMount(async () => {
    await initializeSettings();
  });


  async function initializeSettings() {
    try {
      console.log('🔄 Settings initialization started');
      
      // ServiceFactoryが初期化されるまで待機（最大10秒）
      let attempts = 0;
      const maxAttempts = 100; // 10秒
      
      while (attempts < maxAttempts) {
        const serviceFactory = (window as any).ServiceFactory;
        if (serviceFactory) {
          console.log('✅ ServiceFactory found, loading settings...');
          
          const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
          const settings = await settingsManagementUseCase.getCurrentSettings();
          
          // 設定値を読み込み
          enabled = settings.enabled !== false;
          strokeColor = settings.strokeColor || '#2196F3';
          strokeWidth = settings.strokeWidth || 3;
          gestureThreshold = settings.gestureThreshold || 15;
          excludeList = settings.excludeList || [];
          
          // デバッグ設定を読み込み（複数の可能性を考慮）
          const debugSettings = settings.debugSettings || settings;
          debugEnabled = settings.debugEnabled ?? debugSettings.debugEnabled ?? debugSettings.enabled ?? false;
          let logLevelValue = settings.debugLogLevel ?? debugSettings.debugLogLevel ?? debugSettings.logLevel ?? 2;
          debugShowStatus = settings.debugShowStatus ?? debugSettings.debugShowStatus ?? debugSettings.showStatus ?? false;
          debugStatusPosition = settings.debugStatusPosition ?? debugSettings.debugStatusPosition ?? debugSettings.statusPosition ?? 'top-right';
          
          // デバッグログレベルの型確認と文字列化
          if (typeof logLevelValue === 'string') {
            const parsed = parseInt(logLevelValue, 10);
            if (!isNaN(parsed) && parsed >= 0 && parsed <= 3) {
              debugLogLevel = logLevelValue;
            } else {
              debugLogLevel = '2';
            }
          } else if (typeof logLevelValue === 'number') {
            if (logLevelValue >= 0 && logLevelValue <= 3) {
              debugLogLevel = logLevelValue.toString();
            } else {
              debugLogLevel = '2';
            }
          } else {
            debugLogLevel = '2';
          }
          
          console.log('🔍 Debug log level after processing:', debugLogLevel, typeof debugLogLevel);

          // DebugLoggerを初期化
          const logLevel = typeof debugLogLevel === 'string' ? parseInt(debugLogLevel) : debugLogLevel;
          const initialDebugSettings = {
            logLevel: logLevel as 0 | 1 | 2 | 3,
            shouldLog: (level: 0 | 1 | 2 | 3) => debugEnabled && level <= logLevel
          };
          logger = new DebugLogger(initialDebugSettings);
          
          logger?.info('Raw settings loaded from storage:', settings);
          logger?.debug('Debug settings properties in raw data:', {
            hasDebugEnabled: 'debugEnabled' in settings,
            hasDebugLogLevel: 'debugLogLevel' in settings, 
            hasDebugShowStatus: 'debugShowStatus' in settings,
            hasDebugStatusPosition: 'debugStatusPosition' in settings,
            allKeys: Object.keys(settings)
          });
          
          logger?.info('Applied track settings:', { strokeColor, strokeWidth, gestureThreshold });
          logger?.info('Applied debug settings:', {
            debugEnabled,
            debugLogLevel,
            debugShowStatus,
            debugStatusPosition,
            rawDebugEnabled: settings.debugEnabled,
            rawDebugLogLevel: settings.debugLogLevel,
            rawDebugShowStatus: settings.debugShowStatus,
            rawDebugStatusPosition: settings.debugStatusPosition,
            debugSettingsObject: debugSettings,
            hasDebugSettings: 'debugSettings' in settings
          });
          
          // ジェスチャー一覧を読み込み
          await loadGestures();
          await loadCustomGestures();
          
          console.log('✅ Settings loaded successfully');
          isLoading = false;
          return;
        }
        
        // 100ms待機して再試行
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
        console.log(`⏳ Waiting for ServiceFactory... (${attempts}/${maxAttempts})`);
      }
      
      // タイムアウト
      throw new Error('ServiceFactory initialization timeout');
      
    } catch (error) {
      console.error('❌ Settings initialization failed:', error);
      showSaveStatus('設定の読み込みに失敗しました', 'error');
      isLoading = false;
    }
  }

  async function loadGestures() {
    try {
      console.log('🔍 DEBUG: loadGestures() called');
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available for loadGestures');
        return;
      }
      
      console.log('🔍 DEBUG: Creating GestureListUseCase');
      const gestureListUseCase = serviceFactory.createGestureListUseCase();
      console.log('🔍 DEBUG: Calling getAllGestures()');
      const loadedGestures = await gestureListUseCase.getAllGestures();
      console.log('🔍 DEBUG: getAllGestures() returned:', loadedGestures ? loadedGestures.length : 'null', 'items');
      
      // Svelte 5の$stateで配列の変更を確実に検出させるため、新しい配列を作成
      gestures = [...(loadedGestures || [])];
      console.log('✅ FIXED - Gestures loaded with correct ID/action mapping:', gestures.length);
      gestures.slice(0, 3).forEach((g: any, i: number) => {
        console.log(`  [${i}] id: "${g.id}", action: "${g.action}", enabled: ${g.enabled}`);
      });
    } catch (error) {
      console.error('❌ ジェスチャー読み込みエラー:', error);
      gestures = [];
    }
  }

  async function loadCustomGestures() {
    try {
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available for loadCustomGestures');
        return;
      }
      
      // GestureListUseCaseから統一されたデータを取得
      const gestureListUseCase = serviceFactory.createGestureListUseCase();
      const allGestures = await gestureListUseCase.getAllGestures();
      
      // カスタムジェスチャーのみをフィルタリング
      const customGestureData = allGestures.filter(g => g.type === 'custom').map(g => ({
        id: g.id,
        name: g.name,
        pattern: g.pattern, // 既に矢印形式に変換済み
        action: g.action,
        description: g.description, // 既に日本語表記に変換済み
        enabled: g.enabled
      }));
      
      // Svelte 5の$stateで配列の変更を確実に検出させるため、新しい配列を作成
      customGestures = [...customGestureData];
      console.log('✅ Custom gestures loaded:', customGestures.length);
      console.log('📊 Custom gesture data structure:', customGestures.slice(0, 2));
      console.log('🔍 Custom gesture full data:', customGestures.map(g => ({
        id: g.id,
        name: g.name,
        action: g.action,
        description: g.description,
        pattern: g.pattern,
        enabled: g.enabled
      })));
    } catch (error) {
      console.error('❌ カスタムジェスチャー読み込みエラー:', error);
      customGestures = [];
    }
  }

  function showSaveStatus(message: string, type: 'success' | 'error' = 'success') {
    saveStatus = message;
    saveStatusType = type;
    saveStatusVisible = true;
    setTimeout(() => {
      saveStatusVisible = false;
    }, 3000);
  }


  async function handleEnabledChange() {
    try {
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      await settingsManagementUseCase.toggleExtension(enabled);
      showSaveStatus(`マウスジェスチャーを${enabled ? '有効' : '無効'}にしました`);
    } catch (error) {
      console.error('設定保存エラー:', error);
      showSaveStatus('設定の保存に失敗しました', 'error');
    }
  }

  async function handleTrackSettingsChange() {
    try {
      console.log('🔄 Track settings change triggered:', { strokeColor, strokeWidth, gestureThreshold });
      
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available for track settings');
        return;
      }
      
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      
      console.log('💾 Saving track settings individually...');
      
      // 既存のメソッドを使用して個別に保存
      await settingsManagementUseCase.updateStrokeSettings(strokeColor, strokeWidth);
      console.log('✅ Stroke settings saved:', { strokeColor, strokeWidth });
      
      await settingsManagementUseCase.updateGestureThreshold(gestureThreshold);
      console.log('✅ Gesture threshold saved:', gestureThreshold);
      
      console.log('✅ All track settings saved successfully');
      showSaveStatus('軌跡設定を保存しました');
    } catch (error) {
      console.error('❌ 軌跡設定保存エラー:', error);
      showSaveStatus('軌跡設定の保存に失敗しました', 'error');
    }
  }


  async function addExcludeUrl() {
    if (!newExcludeUrl.trim()) return;
    
    try {
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      await settingsManagementUseCase.addExcludeSite(newExcludeUrl.trim());
      excludeList = [...excludeList, newExcludeUrl.trim()];
      newExcludeUrl = '';
      showSaveStatus('除外サイトを追加しました');
    } catch (error) {
      console.error('除外サイト追加エラー:', error);
      showSaveStatus('除外サイトの追加に失敗しました', 'error');
    }
  }

  async function removeExcludeUrl(url: string) {
    try {
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      await settingsManagementUseCase.removeExcludeSite(url);
      excludeList = excludeList.filter(item => item !== url);
      showSaveStatus('除外サイトを削除しました');
    } catch (error) {
      console.error('除外サイト削除エラー:', error);
      showSaveStatus('除外サイトの削除に失敗しました', 'error');
    }
  }

  async function handleDebugSettingsChange() {
    try {
      const debugConfig = {
        debugEnabled,
        debugLogLevel: parseInt(debugLogLevel, 10), // 文字列を数値に変換
        debugShowStatus,
        debugStatusPosition
      };
      logger?.debug('Saving debug settings:', debugConfig);
      
      const serviceFactory = (window as any).ServiceFactory;
      const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
      await settingsManagementUseCase.updateDebugSettings(debugConfig);
      
      // DebugLoggerの設定も更新
      const logLevel = typeof debugLogLevel === 'string' ? parseInt(debugLogLevel) : debugLogLevel;
      const updatedDebugSettings = {
        logLevel: logLevel as 0 | 1 | 2 | 3,
        shouldLog: (level: 0 | 1 | 2 | 3) => debugEnabled && level <= logLevel
      };
      logger?.updateDebugSettings(updatedDebugSettings);
      
      logger?.info('Debug settings saved successfully');
      showSaveStatus('デバッグ設定を保存しました');
    } catch (error) {
      logger?.error('Debug settings save error:', error);
      showSaveStatus('デバッグ設定の保存に失敗しました', 'error');
    }
  }



  function convertArrowsToPattern(arrows: string): string {
    if (!arrows || typeof arrows !== 'string') {
      console.warn('Invalid arrows for conversion:', arrows);
      return '';
    }
    
    return arrows
      .replace(/↑/g, 'UP')
      .replace(/↓/g, 'DOWN')
      .replace(/←/g, 'LEFT')
      .replace(/→/g, 'RIGHT');
  }

  function convertArrowsToPatternArray(arrows: string): string[] {
    if (!arrows || typeof arrows !== 'string') {
      console.warn('Invalid arrows for pattern array conversion:', arrows);
      return [];
    }
    
    // 矢印文字列を個別の矢印に分割して配列に変換
    return arrows.split('').map(arrow => {
      switch (arrow) {
        case '↑': return 'UP';
        case '↓': return 'DOWN';
        case '←': return 'LEFT';
        case '→': return 'RIGHT';
        default: 
          console.warn('Unknown arrow character:', arrow);
          return arrow;
      }
    }).filter(item => ['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(item));
  }




  // カスタムジェスチャー用ハンドラー関数
  function handleAddDirection(direction: string) {
    currentPattern.push(direction);
    // 矢印表記で表示 - 簡易変換
    const arrowMap: Record<string, string> = {
      'UP': '↑',
      'DOWN': '↓', 
      'LEFT': '←',
      'RIGHT': '→'
    };
    gesturePatternDisplay = currentPattern.map(p => arrowMap[p] || p).join('');
    // エラーをクリア
    clearCustomGestureError();
  }

  function handleClearPattern() {
    currentPattern = [];
    gesturePatternDisplay = '';
  }

  function handleClearCustomGestureError() {
    customGestureError = '';
  }

  function clearCustomGestureError() {
    customGestureError = '';
  }

  async function addCustomGesture() {
    // 前回のエラーをクリア
    clearCustomGestureError();
    
    if (!gestureName.trim() || !gesturePatternDisplay) {
      customGestureError = 'ジェスチャー名とパターンを入力してください';
      return;
    }

    try {
      logger?.debug('Adding custom gesture:', {
        name: gestureName,
        displayPattern: gesturePatternDisplay,
        currentPattern: currentPattern,
        action: gestureAction
      });
      
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        throw new Error('ServiceFactory not available');
      }
      
      const customGestureUseCase = serviceFactory.createCustomGestureManagementUseCase();
      
      // 矢印表記を方向文字列配列に変換
      const patternArray = convertArrowsToPatternArray(gesturePatternDisplay);
      logger?.debug('Pattern conversion:', {
        original: gesturePatternDisplay,
        currentPattern: currentPattern,
        converted: patternArray
      });
      
      const gestureData = {
        name: gestureName.trim(),
        pattern: patternArray,
        action: gestureAction
      };
      logger?.debug('Sending gesture data:', gestureData);
      
      await customGestureUseCase.addCustomGesture(gestureData);
      
      // フォームをリセット
      gestureName = '';
      gesturePatternDisplay = '';
      currentPattern = [];
      gestureAction = 'back';
      clearCustomGestureError();
      
      // リスト更新（統一されたデータを取得）
      await Promise.all([
        loadCustomGestures(),
        loadGestures()
      ]);
      
      logger?.info('Custom gesture added successfully');
      showSaveStatus('カスタムジェスチャーを追加しました');
    } catch (error) {
      logger?.error('Custom gesture add error:', error);
      
      // エラーの詳細情報を表示
      let errorMessage = 'カスタムジェスチャーの追加に失敗しました';
      if (error instanceof Error) {
        logger?.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          originalError: (error as any).originalError
        });
        
        // ユーザーフレンドリーなエラーメッセージ
        if (error.message.includes('already exists')) {
          errorMessage = '同じ名前のジェスチャーが既に存在します';
        } else if (error.message.includes('similar')) {
          errorMessage = '似たパターンのジェスチャーが既に存在します';
        } else if (error.message.includes('Invalid')) {
          errorMessage = 'ジェスチャーパターンが無効です';
        }
      }
      
      customGestureError = errorMessage;
    }
  }

  // トグル処理中の重複防止（Promise管理）
  let togglePromises = new Map<string, Promise<void>>();

  async function toggleGesture(gestureId: string, enabled: boolean) {
    // 既に処理中の場合は既存のPromiseを返す
    if (togglePromises.has(gestureId)) {
      console.log('🚫 Already toggling gesture, returning existing promise:', gestureId);
      return togglePromises.get(gestureId);
    }
    
    console.log('🔄 Starting toggle gesture:', gestureId, 'enabled:', enabled);
    
    // 新しいPromiseを作成してマップに保存
    const togglePromise = performToggle(gestureId, enabled);
    togglePromises.set(gestureId, togglePromise);
    
    try {
      await togglePromise;
    } finally {
      // 処理完了後にPromiseを削除
      togglePromises.delete(gestureId);
      console.log('🧹 Toggle promise completed for:', gestureId);
    }
  }
  
  async function performToggle(gestureId: string, enabled: boolean) {
    
    try {
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available');
        showSaveStatus('設定の更新に失敗しました', 'error');
        return;
      }
      
      // 標準ジェスチャーかカスタムジェスチャーかを判定
      // カスタムジェスチャーは必ず custom_ で始まるIDを持つ
      const isCustomGesture = gestureId.startsWith('custom_');
      
      console.log('✅ FIXED - OptionsApp received correct gesture ID:', gestureId, 'enabled:', enabled);
      
      if (isCustomGesture) {
        const customGestureUseCase = serviceFactory.createCustomGestureManagementUseCase();
        await customGestureUseCase.toggleCustomGesture(gestureId, enabled);
        console.log('✅ Custom gesture saved');
      } else {
        const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
        await settingsManagementUseCase.toggleGesture(gestureId, enabled);
        console.log('✅ Default gesture saved');
      }
      
      // 両方のリストを同期更新
      await Promise.all([
        loadCustomGestures(),
        loadGestures()
      ]);
      
      showSaveStatus(`ジェスチャー「${gestureId}」を${enabled ? '有効' : '無効'}にしました`);
      
    } catch (error) {
      console.error('❌ Toggle gesture error:', error);
      showSaveStatus('ジェスチャーの設定変更に失敗しました', 'error');
    }
  }

  function handleConfirmOk() {
    if (confirmCallback) {
      confirmCallback();
      confirmCallback = null;
    }
    confirmDialog = false;
  }

  function handleConfirmCancel() {
    confirmCallback = null;
    confirmDialog = false;
  }

  async function deleteCustomGesture(gestureId: string, gestureName: string) {
    // 確認ダイアログを表示
    confirmMessage = `カスタムジェスチャー「${gestureName}」を削除しますか？\n\nこの操作は取り消せません。`;
    confirmCallback = async () => {
      try {
        logger?.debug('Deleting custom gesture:', gestureId, gestureName);
        
        const serviceFactory = (window as any).ServiceFactory;
        if (!serviceFactory) {
          throw new Error('ServiceFactory not available');
        }
        
        const customGestureUseCase = serviceFactory.createCustomGestureManagementUseCase();
        await customGestureUseCase.deleteCustomGesture(gestureId);
        
        // リスト更新
        await Promise.all([
          loadCustomGestures(),
          loadGestures()
        ]);
        
        logger?.info('Custom gesture deleted successfully');
        showSaveStatus(`カスタムジェスチャー「${gestureName}」を削除しました`);
      } catch (error) {
        logger?.error('Custom gesture delete error:', error);
        
        let errorMessage = 'カスタムジェスチャーの削除に失敗しました';
        if (error instanceof Error) {
          logger?.error('Delete error details:', {
            name: error.name,
            message: error.message,
            originalError: (error as any).originalError
          });
          
          if (error.message.includes('not found')) {
            errorMessage = 'カスタムジェスチャーが見つかりませんでした';
          }
        }
        
        showSaveStatus(errorMessage, 'error');
      }
    };
    
    confirmDialog = true;
  }


</script>

<div class="container">
  <h1>🖱️ マウスジェスチャーツール - 設定</h1>
    
  <!-- ローディング状態 -->
  {#if isLoading}
    <div class="loading">設定を読み込み中</div>
  {:else}
    <!-- メインコンテンツ -->
    <div id="mainContent">
      <!-- 基本設定 -->
      <OptionsBasicSettings 
        bind:enabled={enabled}
        isLoading={isLoading}
        onEnabledChange={handleEnabledChange}
      />
            
      <!-- 軌跡カスタマイズ -->
      <OptionsTrackSettings
        bind:strokeColor={strokeColor}
        bind:strokeWidth={strokeWidth}
        bind:gestureThreshold={gestureThreshold}
        isLoading={isLoading}
        onTrackSettingsChange={handleTrackSettingsChange}
      />
            
      <!-- ジェスチャー一覧 -->
      <OptionsGestureList
        bind:gestures={gestures}
        bind:gestureSearch={gestureSearch}
        bind:gestureFilter={gestureFilter}
        isLoading={isLoading}
        onToggleGesture={toggleGesture}
      />

      <!-- カスタムジェスチャー -->
      <OptionsCustomGestures
        bind:customGestures={customGestures}
        bind:gestureName={gestureName}
        bind:gesturePatternDisplay={gesturePatternDisplay}
        bind:gestureAction={gestureAction}
        bind:currentPattern={currentPattern}
        bind:customGestureError={customGestureError}
        isLoading={isLoading}
        onAddCustomGesture={addCustomGesture}
        onDeleteCustomGesture={deleteCustomGesture}
        onToggleGesture={toggleGesture}
        onAddDirection={handleAddDirection}
        onClearPattern={handleClearPattern}
        onClearCustomGestureError={handleClearCustomGestureError}
      />

      <!-- 除外サイト -->
      <OptionsExcludeList
        bind:excludeList={excludeList}
        bind:newExcludeUrl={newExcludeUrl}
        isLoading={isLoading}
        onAddExcludeUrl={addExcludeUrl}
        onRemoveExcludeUrl={removeExcludeUrl}
      />

      <!-- デバッグ設定 -->
      <OptionsDebugSettings
        bind:debugEnabled={debugEnabled}
        bind:debugLogLevel={debugLogLevel}
        bind:debugShowStatus={debugShowStatus}
        bind:debugStatusPosition={debugStatusPosition}
        isLoading={isLoading}
        onDebugSettingsChange={handleDebugSettingsChange}
      />
            
      <!-- 保存ステータス -->
      {#if saveStatusVisible}
        <div class="save-status {saveStatusType}">
          {saveStatus}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- カスタム確認ダイアログ -->
{#if confirmDialog}
  <div class="confirm-dialog">
    <div class="confirm-overlay"></div>
    <div class="confirm-content">
      <h3 class="confirm-title">確認</h3>
      <p class="confirm-message">{confirmMessage}</p>
      <div class="confirm-buttons">
        <button class="confirm-btn confirm-btn-cancel" onclick={handleConfirmCancel}>キャンセル</button>
        <button class="confirm-btn confirm-btn-ok" onclick={handleConfirmOk}>OK</button>
      </div>
    </div>
  </div>
{/if}

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
    
    
    .setting-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 16px;
        padding: 8px 0;
    }
    
    .setting-item:last-child {
        margin-bottom: 0;
    }
    
    .setting-label {
        font-weight: 500;
        color: #202124;
        flex: 1;
    }
    
    .setting-description {
        font-size: 12px;
        color: #5f6368;
        margin-top: 4px;
    }
    
    
    .color-input, .range-input {
        padding: 8px;
        border: 1px solid #dadce0;
        border-radius: 4px;
        width: 80px;
    }
    
    .range-input {
        width: 120px;
    }
    
    .range-value {
        margin-left: 8px;
        font-weight: 500;
        color: #1a73e8;
        min-width: 30px;
    }
    
    .exclude-list {
        margin-top: 12px;
    }
    
    .exclude-input {
        width: 100%;
        padding: 8px;
        border: 1px solid #dadce0;
        border-radius: 4px;
        margin-bottom: 8px;
    }
    
    .exclude-item {
        display: flex;
        align-items: center;
        padding: 8px;
        background: white;
        border: 1px solid #e8eaed;
        border-radius: 4px;
        margin-bottom: 4px;
    }
    
    .exclude-item:last-child {
        margin-bottom: 0;
    }
    
    .exclude-url {
        flex: 1;
        font-family: monospace;
        color: #5f6368;
    }
    
    .remove-btn {
        background: #ea4335;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }
    
    .remove-btn:hover {
        background: #d33b2c;
    }
    
    .add-btn {
        background: #34a853;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        width: 100%;
    }
    
    .add-btn:hover {
        background: #2d8f3f;
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
    
    .preview-canvas {
        border: 1px solid #dadce0;
        border-radius: 4px;
        margin-top: 8px;
        background: white;
    }

    /* カスタムジェスチャー用スタイル */
    .gesture-list-container {
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #e8eaed;
        border-radius: 4px;
        background: white;
    }

    .gesture-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        border-bottom: 1px solid #f1f3f4;
    }

    .gesture-item:last-child {
        border-bottom: none;
    }

    .gesture-item.disabled {
        opacity: 0.6;
        background-color: #f8f9fa;
    }

    .gesture-info {
        flex: 1;
    }

    .gesture-name {
        font-weight: 500;
        color: #202124;
        margin-bottom: 4px;
    }

    .gesture-pattern {
        font-family: monospace;
        font-size: 14px;
        color: #5f6368;
        background: #f1f3f4;
        padding: 2px 6px;
        border-radius: 3px;
        display: inline-block;
        margin-right: 8px;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        word-break: break-all;
    }

    .gesture-action {
        font-size: 12px;
        color: #1a73e8;
    }

    .gesture-controls {
        display: flex;
        gap: 8px;
    }

    .gesture-toggle {
        background: none;
        border: 1px solid #dadce0;
        padding: 4px 8px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
    }

    .gesture-toggle.enabled {
        background: #e8f5e8;
        border-color: #34a853;
        color: #137333;
    }

    .gesture-toggle.disabled {
        background: #fce8e6;
        border-color: #ea4335;
        color: #d33b2c;
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

    /* ローディング状態 */
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


</style>