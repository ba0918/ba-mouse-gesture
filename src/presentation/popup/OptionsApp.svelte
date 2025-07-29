<script lang="ts">
  import { onMount } from 'svelte';
  import { DebugLogger } from '../../infrastructure/adapters/DebugLogger';
  
  // コンポーネントのインポート
  import OptionsBasicSettings from './components/OptionsBasicSettings.svelte';
  import OptionsTrackSettings from './components/OptionsTrackSettings.svelte';
  import OptionsDebugSettings from './components/OptionsDebugSettings.svelte';
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
      const serviceFactory = (window as any).ServiceFactory;
      if (!serviceFactory) {
        console.warn('ServiceFactory not available for loadGestures');
        return;
      }
      
      const gestureListUseCase = serviceFactory.createGestureListUseCase();
      const loadedGestures = await gestureListUseCase.getAllGestures();
      gestures = loadedGestures || [];
      console.log('✅ Gestures loaded:', gestures.length);
      console.log('📊 Gesture data structure:', gestures.slice(0, 2)); // 最初の2つをデバッグ
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
      
      customGestures = customGestureData;
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

  // パターン変換キャッシュ
  const patternCache = new Map<string, string>();
  
  // パターン表示用ヘルパー関数（統一形式、キャッシュ付き）
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
            default: return dirStr;
          }
        }).join('');
        result = converted;
        patternCache.set(cacheKey, result);
        return result;
      } catch (error) {
        console.error('Array conversion error:', error);
      }
    }
    
    // 文字列パターンの変換（区切り文字を処理）
    if (typeof pattern === 'string') {
      let converted = pattern;
      
      // 区切り文字で区切られている場合
      if (pattern.includes('→')) {
        // up→down→left→right のような形式
        converted = pattern
          .split('→')
          .map(dir => {
            const dirStr = dir.trim().toLowerCase();
            switch (dirStr) {
              case 'up': return '↑';
              case 'down': return '↓';
              case 'left': return '←';
              case 'right': return '→';
              default: return dirStr;
            }
          })
          .join('');
      } else {
        // 単純な置換
        converted = pattern
          .replace(/UP/g, '↑')
          .replace(/DOWN/g, '↓')
          .replace(/LEFT/g, '←')
          .replace(/RIGHT/g, '→')
          .replace(/up/g, '↑')
          .replace(/down/g, '↓')
          .replace(/left/g, '←')
          .replace(/right/g, '→');
      }
      
      result = converted;
      patternCache.set(cacheKey, result);
      return result;
    }
    
    // その他の形式（オブジェクトなど）
    const stringPattern = String(pattern);
    result = stringPattern
      .replace(/UP/g, '↑')
      .replace(/DOWN/g, '↓')
      .replace(/LEFT/g, '←')
      .replace(/RIGHT/g, '→')
      .replace(/up/g, '↑')
      .replace(/down/g, '↓')
      .replace(/left/g, '←')
      .replace(/right/g, '→');
    
    patternCache.set(cacheKey, result);
    return result;
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


  function addDirection(direction: string) {
    currentPattern.push(direction);
    // 矢印表記で表示
    gesturePatternDisplay = convertPatternToArrows(currentPattern.join(''));
    // エラーをクリア
    clearCustomGestureError();
  }

  function clearPattern() {
    currentPattern = [];
    gesturePatternDisplay = '';
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
      await loadCustomGestures();
      await loadGestures(); // 全体のジェスチャーリストも更新
      
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
      const isCustomGesture = customGestures.some(g => g.id === gestureId);
      
      if (isCustomGesture) {
        const customGestureUseCase = serviceFactory.createCustomGestureManagementUseCase();
        await customGestureUseCase.toggleCustomGesture(gestureId, enabled);
        console.log('✅ Custom gesture saved');
        
        // カスタムジェスチャーのUI更新
        customGestures = customGestures.map(g => 
          g.id === gestureId ? { ...g, enabled } : g
        );
        
        // gestures配列も同期更新（filteredGesturesのreactivity用）
        const gestureIndex = gestures.findIndex(g => g.id === gestureId);
        if (gestureIndex !== -1) {
          gestures[gestureIndex] = { ...gestures[gestureIndex], enabled };
          gestures = [...gestures]; // Svelteに変更を通知
        }
      } else {
        const settingsManagementUseCase = serviceFactory.createSettingsManagementUseCase();
        await settingsManagementUseCase.toggleDefaultGesture(gestureId, enabled);
        console.log('✅ Default gesture saved');
        
        // デフォルトジェスチャーのUI更新
        gestures = gestures.map(g => 
          g.id === gestureId ? { ...g, enabled } : g
        );
      }
      
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
        await loadCustomGestures();
        await loadGestures(); // 全体のジェスチャーリストも更新
        
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
              <input type="text" bind:value={gestureSearch} placeholder="ジェスチャーを検索..." 
                style="flex: 1; padding: 8px; border: 1px solid #dadce0; border-radius: 4px; font-size: 14px;">
              <select bind:value={gestureFilter} style="padding: 8px; border: 1px solid #dadce0; border-radius: 4px;">
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
                                                
                        // 現在のジェスチャー状態を最新のリストから取得
                        const currentGesture = gestures.find(g => g.id === gesture.id);
                        const currentEnabled = currentGesture?.enabled ?? false;
                        const newEnabled = !currentEnabled;
                                                
                        console.log('🔘 Default gesture toggle:', gesture.id, 'current enabled:', currentEnabled, 'new enabled:', newEnabled);
                        await toggleGesture(gesture.id, newEnabled);
                      }}
                    ></button>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- カスタムジェスチャー -->
      <div class="section">
        <h2>カスタムジェスチャー</h2>
        <div class="setting-item">
          <div style="width: 100%;">
            <div class="setting-label">独自のジェスチャーを作成・管理</div>
            <div class="setting-description">
              デフォルトジェスチャーをカスタマイズしたり、新しいパターンを追加できます
            </div>
                        
            <!-- カスタムジェスチャー一覧 -->
            <div class="custom-gesture-list">
              <div class="all-gestures-container" style="border: 1px solid #e8eaed; border-radius: 8px; background: white; max-height: 300px; overflow-y: auto;">
                {#each customGestures as gesture (gesture.id)}
                  <div class="all-gesture-item" class:disabled={!gesture.enabled}>
                    <div class="gesture-visual">
                      <div class="gesture-pattern-large">{convertPatternToArrows(gesture.pattern)}</div>
                    </div>
                    <div class="gesture-details">
                      <div class="gesture-title">{gesture.name}</div>
                      <div class="gesture-description">{gesture.description}</div>
                    </div>
                    <div class="gesture-actions">
                      <button 
                        class="gesture-status-toggle" 
                        class:enabled={gesture.enabled}
                        aria-label={gesture.enabled ? 'カスタムジェスチャーを無効にする' : 'カスタムジェスチャーを有効にする'}
                        onclick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                                                    
                          // 現在のカスタムジェスチャー状態を最新のリストから取得
                          const currentCustomGesture = customGestures.find(g => g.id === gesture.id);
                          const currentEnabled = currentCustomGesture?.enabled ?? false;
                          const newEnabled = !currentEnabled;
                                                    
                          console.log('🔘 Custom gesture toggle:', gesture.id, 'current enabled:', currentEnabled, 'new enabled:', newEnabled);
                          await toggleGesture(gesture.id, newEnabled);
                        }}
                      ></button>
                      <button 
                        class="gesture-delete-btn" 
                        aria-label="カスタムジェスチャーを削除"
                        onclick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await deleteCustomGesture(gesture.id, gesture.name);
                        }}
                      >削除</button>
                    </div>
                  </div>
                {/each}
                {#if customGestures.length === 0}
                  <div class="empty-state">
                    <p>カスタムジェスチャーが登録されていません</p>
                  </div>
                {/if}
              </div>
            </div>
                        
            <!-- 新規ジェスチャー追加フォーム -->
            <div class="add-gesture-form" style="margin-top: 16px;">
              <h3 style="font-size: 14px; margin: 0 0 12px 0; color: #202124;">新しいジェスチャーを追加</h3>
              <div class="form-group">
                <label for="gestureName">ジェスチャー名:</label>
                <input type="text" bind:value={gestureName} class="form-input" placeholder="例: カスタム戻る" oninput={clearCustomGestureError}>
              </div>
              <div class="form-group">
                <label for="gesturePattern">パターン:</label>
                <div class="pattern-input-container">
                  <input type="text" bind:value={gesturePatternDisplay} class="form-input" placeholder="下のボタンでパターンを入力" readonly>
                  <button class="clear-btn" onclick={clearPattern}>クリア</button>
                </div>
                <div class="pattern-buttons">
                  <button class="direction-btn" onclick={() => addDirection('UP')}>↑</button>
                  <button class="direction-btn" onclick={() => addDirection('DOWN')}>↓</button>
                  <button class="direction-btn" onclick={() => addDirection('LEFT')}>←</button>
                  <button class="direction-btn" onclick={() => addDirection('RIGHT')}>→</button>
                </div>
              </div>
              <div class="form-group">
                <label for="gestureAction">アクション:</label>
                <select bind:value={gestureAction} class="form-select">
                  <option value="back">戻る</option>
                  <option value="forward">進む</option>
                  <option value="scroll_up">上スクロール</option>
                  <option value="scroll_down">下スクロール</option>
                  <option value="close_tab">タブを閉じる</option>
                  <option value="new_tab">新しいタブ</option>
                  <option value="refresh">更新</option>
                  <option value="duplicate_tab">タブを複製</option>
                  <option value="super_refresh">スーパーリロード (NEW)</option>
                  <option value="prev_tab">前のタブ (NEW)</option>
                  <option value="next_tab">次のタブ (NEW)</option>
                </select>
              </div>
              
              <!-- カスタムジェスチャー追加エラー表示 -->
              {#if customGestureError}
                <div class="custom-gesture-error">
                  {customGestureError}
                </div>
              {/if}
              
              <button class="add-btn" onclick={addCustomGesture}>カスタムジェスチャーを追加</button>
            </div>
          </div>
        </div>
      </div>

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
    
    .section {
        background: white;
        border-radius: 12px;
        padding: 24px;
        margin-bottom: 20px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    
    .section h2 {
        font-size: 18px;
        margin: 0 0 20px 0;
        color: #1a73e8;
        border-bottom: 2px solid #e8f0fe;
        padding-bottom: 12px;
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

    .form-group {
        margin-bottom: 12px;
    }

    .form-group label {
        display: block;
        font-size: 13px;
        font-weight: 500;
        color: #202124;
        margin-bottom: 4px;
    }

    .form-input, .form-select {
        width: 100%;
        padding: 8px;
        border: 1px solid #dadce0;
        border-radius: 4px;
        font-size: 14px;
    }

    .pattern-input-container {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 8px;
    }

    .pattern-input-container .form-input {
        flex: 1;
    }

    .clear-btn {
        background: #5f6368;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        white-space: nowrap;
    }

    .clear-btn:hover {
        background: #4a4a4a;
    }

    .pattern-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
    }

    .direction-btn {
        background: #f8f9fa;
        border: 1px solid #dadce0;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        min-width: 40px;
    }

    .direction-btn:hover {
        background: #e8f0fe;
        border-color: #1a73e8;
    }

    .direction-btn:active {
        background: #1a73e8;
        color: white;
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

    .gesture-pattern-text {
        font-family: monospace;
        font-size: 9px;
        color: #5f6368;
        background: #f1f3f4;
        padding: 2px 4px;
        border-radius: 3px;
        word-break: break-all;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 76px;
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

    .custom-badge {
        background: #34a853;
        color: white;
        font-size: 10px;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-left: 8px;
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

    .gesture-delete-btn {
        padding: 6px 12px;
        background: #ea4335;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        flex-shrink: 0;
        min-width: 50px;
    }

    .gesture-delete-btn:hover {
        background: #d33b2c;
        transform: scale(1.05);
    }

    .gesture-delete-btn:active {
        transform: scale(0.95);
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

    /* 空状態表示 */
    .empty-state {
        text-align: center;
        padding: 32px 16px;
    }

    .empty-state p {
        margin: 0;
        color: #9aa0a6;
        font-size: 14px;
        font-weight: 400;
        line-height: 1.4;
    }

    /* カスタムジェスチャーエラー表示 */
    .custom-gesture-error {
        background: #fce8e6;
        color: #d33b2c;
        padding: 8px 12px;
        border-radius: 4px;
        margin: 8px 0;
        font-size: 13px;
        border-left: 3px solid #ea4335;
    }
</style>