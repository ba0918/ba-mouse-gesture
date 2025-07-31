/**
 * 設定操作ロジックcomposable
 * 設定の初期化、保存、変更処理を管理
 */

import { DebugSettings } from '../../../domain/entities/DebugSettings';
import { DebugLogger } from '../../../infrastructure/adapters/DebugLogger';
import type { SettingsStore } from '../stores/settingsStore';
import type { UiStore } from '../stores/uiStore';

export function useSettings(settingsStore: SettingsStore, uiStore: UiStore) {
  let logger: DebugLogger | null = null;

  async function initializeSettings() {
    try {
      // servicesが初期化されるまで待機（最大10秒）
      let attempts = 0;
      const maxAttempts = 100; // 10秒

      while (attempts < maxAttempts) {
        const services = (window as any).services;
        if (services) {
          const settingsManagementUseCase = services.settingsManagementUseCase;
          const settings = await settingsManagementUseCase.getCurrentSettings();

          // 設定値を読み込み
          settingsStore.updateSettings(settings);

          // Clean Architecture準拠のデバッグ設定読み込み
          const debugEntity = DebugSettings.fromPlainObject(settings.debugSettings || {});
          settingsStore.updateDebugSettings(debugEntity);

          logger?.debug('🔍 Debug settings loaded via entity:', debugEntity.toString());

          // デバッグロガーを初期化
          logger = new DebugLogger(debugEntity);
          logger?.info('🚀 Debug logger initialized with settings');

          // ジェスチャー状態を読み込み
          await loadGestures();
          await loadCustomGestures();

          logger?.info('✅ Settings loaded successfully');
          uiStore.setLoading(false);
          return;
        }

        // 100ms待機して再試行
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      // タイムアウト
      throw new Error('Services initialization timeout');
    } catch (error) {
      logger?.error('❌ Settings initialization failed:', error);
      uiStore.showSaveStatus('設定の読み込みに失敗しました', 'error');
      uiStore.setLoading(false);
    }
  }

  async function loadGestures() {
    try {
      const services = (window as any).services;
      if (!services) {
        logger?.warn('Services not available for loadGestures');
        return;
      }

      const gestureListUseCase = services.gestureListUseCase;
      const loadedGestures = await gestureListUseCase.getAllGestures();

      // This will be handled by gesturesStore in the main component
      return loadedGestures || [];
    } catch (error) {
      logger?.error('❌ ジェスチャー読み込みエラー:', error);
      return [];
    }
  }

  async function loadCustomGestures() {
    try {
      const services = (window as any).services;
      if (!services) {
        logger?.warn('Services not available for loadCustomGestures');
        return;
      }

      const gestureListUseCase = services.gestureListUseCase;
      const loadedCustomGestures = await gestureListUseCase.getCustomGestures();

      // This will be handled by gesturesStore in the main component
      return loadedCustomGestures || [];
    } catch (error) {
      logger?.error('❌ カスタムジェスチャー読み込みエラー:', error);
      return [];
    }
  }

  async function handleEnabledChange() {
    try {
      const services = (window as any).services;
      const settingsManagementUseCase = services.settingsManagementUseCase;
      await settingsManagementUseCase.toggleExtension(settingsStore.enabled);
      uiStore.showSaveStatus(`マウスジェスチャーを${settingsStore.enabled ? '有効' : '無効'}にしました`);
    } catch (error) {
      logger?.error('設定保存エラー:', error);
      uiStore.showSaveStatus('設定の保存に失敗しました', 'error');
    }
  }

  async function handleTrackSettingsChange() {
    // 既存のタイマーをクリア
    settingsStore.clearTrackSettingsDebounceTimer();

    // デバウンス: 500ms後に保存処理を実行
    const timer = setTimeout(async () => {
      try {
        logger?.debug('🔄 Track settings change triggered (debounced):', {
          strokeColor: settingsStore.strokeColor,
          strokeWidth: settingsStore.strokeWidth,
          gestureThreshold: settingsStore.gestureThreshold,
        });

        const services = (window as any).services;
        if (!services) {
          logger?.warn('Services not available for track settings');
          return;
        }

        const settingsManagementUseCase = services.settingsManagementUseCase;

        logger?.debug('💾 Saving track settings individually...');

        // 既存のメソッドを使用して個別に保存
        await settingsManagementUseCase.updateStrokeSettings(settingsStore.strokeColor, settingsStore.strokeWidth);
        logger?.debug('✅ Stroke settings saved:', {
          strokeColor: settingsStore.strokeColor,
          strokeWidth: settingsStore.strokeWidth,
        });

        await settingsManagementUseCase.updateGestureThreshold(settingsStore.gestureThreshold);
        logger?.debug('✅ Gesture threshold saved:', settingsStore.gestureThreshold);

        logger?.info('✅ All track settings saved successfully');
        uiStore.showSaveStatus('軌跡設定を保存しました');
      } catch (error) {
        logger?.error('❌ 軌跡設定保存エラー:', error);
        uiStore.showSaveStatus('軌跡設定の保存に失敗しました', 'error');
      }
    }, 500); // 500ms のデバウンス

    settingsStore.setTrackSettingsDebounceTimer(timer);
  }

  async function addExcludeUrl() {
    if (!settingsStore.newExcludeUrl.trim()) return;

    try {
      const services = (window as any).services;
      const settingsManagementUseCase = services.settingsManagementUseCase;

      settingsStore.addExcludeUrl(settingsStore.newExcludeUrl);
      await settingsManagementUseCase.updateExcludeList(settingsStore.excludeList);

      settingsStore.setNewExcludeUrl('');
      uiStore.showSaveStatus('除外サイトを追加しました');
    } catch (error) {
      logger?.error('除外サイト追加エラー:', error);
      uiStore.showSaveStatus('除外サイトの追加に失敗しました', 'error');
    }
  }

  async function removeExcludeUrl(url: string) {
    try {
      const services = (window as any).services;
      const settingsManagementUseCase = services.settingsManagementUseCase;

      settingsStore.removeExcludeUrl(url);
      await settingsManagementUseCase.updateExcludeList(settingsStore.excludeList);

      uiStore.showSaveStatus('除外サイトを削除しました');
    } catch (error) {
      logger?.error('除外サイト削除エラー:', error);
      uiStore.showSaveStatus('除外サイトの削除に失敗しました', 'error');
    }
  }

  async function handleDebugSettingsChange() {
    try {
      logger?.debug('🔄 Debug settings change triggered:', {
        debugEnabled: settingsStore.debugEnabled,
        debugLogLevel: settingsStore.debugLogLevel,
        debugShowStatus: settingsStore.debugShowStatus,
        debugStatusPosition: settingsStore.debugStatusPosition,
      });

      const services = (window as any).services;
      if (!services) {
        logger?.warn('Services not available for debug settings');
        return;
      }

      const settingsManagementUseCase = services.settingsManagementUseCase;

      // Clean Architecture準拠のデバッグ設定エンティティを作成
      const debugEntity = new DebugSettings(
        settingsStore.debugEnabled,
        parseInt(settingsStore.debugLogLevel) as 0 | 1 | 2 | 3,
        settingsStore.debugShowStatus,
        settingsStore.debugStatusPosition as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
      );

      logger?.debug('💾 Saving debug settings via entity...', debugEntity.toString());

      await settingsManagementUseCase.updateDebugSettings(debugEntity.toPlainObject());

      // ロガーの設定を更新（新しいロガーインスタンスを作成）
      logger = new DebugLogger(debugEntity);
      logger?.info('🔄 Debug logger settings updated');

      logger?.info('✅ Debug settings saved successfully');
      uiStore.showSaveStatus('デバッグ設定を保存しました');
    } catch (error) {
      logger?.error('❌ デバッグ設定保存エラー:', error);
      uiStore.showSaveStatus('デバッグ設定の保存に失敗しました', 'error');
    }
  }

  return {
    initializeSettings,
    loadGestures,
    loadCustomGestures,
    handleEnabledChange,
    handleTrackSettingsChange,
    addExcludeUrl,
    removeExcludeUrl,
    handleDebugSettingsChange,
    get logger() {
      return logger;
    },
  };
}
