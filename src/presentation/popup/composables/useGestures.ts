/**
 * ジェスチャー操作ロジックcomposable
 * カスタムジェスチャーの追加、削除、有効/無効切り替えを管理
 */

import type { Direction } from '../../../domain/valueObjects/GesturePattern';
import type { ActionName } from '../../../domain/types/ActionName';
import type { GesturesStore } from '../stores/gesturesStore.svelte';
import type { UiStore } from '../stores/uiStore.svelte';

export function useGestures(gesturesStore: GesturesStore, uiStore: UiStore) {
  let logger: any = null; // Will be set from parent

  function setLogger(newLogger: any) {
    logger = newLogger;
  }

  // ストレージから最新のカスタムジェスチャーを再読み込みしてUIを同期
  async function reloadCustomGesturesFromStorage() {
    try {
      const services = (window as any).services;
      if (!services) {
        logger?.warn('⚠️ Services not available, skipping custom gesture reload');
        return; // サービスが無い場合は何もしない（UI状態を保持）
      }

      const customGestureManagementUseCase = services.customGestureManagementUseCase;
      const latestCustomGestures = await customGestureManagementUseCase.getAllCustomGestures();

      const uiCustomGestures = latestCustomGestures.map((gesture: any) => ({
        id: gesture.id,
        name: gesture.name,
        pattern: gesture.pattern.toString(),
        action: gesture.action,
        description: `カスタムジェスチャー: ${gesture.name}`,
        enabled: gesture.enabled,
        type: 'custom' as const,
      }));

      gesturesStore.setCustomGestures(uiCustomGestures);

      logger?.debug('🔄 Custom gestures reloaded from storage:', {
        count: uiCustomGestures.length,
        gestureIds: uiCustomGestures.map((g: any) => g.id),
      });

      // デバッグ用：現在のUI状態も確認
      logger?.debug('🐛 [Debug] Current UI store state after reload:', {
        uiStoreCount: gesturesStore.customGestures.length,
        uiStoreIds: gesturesStore.customGestures.map((g: any) => g.id),
      });
    } catch (error) {
      logger?.error('❌ Failed to reload custom gestures, keeping current UI state:', error);
      // エラー時はUI状態を変更しない（重要：空配列にリセットしない）
    }
  }

  async function addCustomGesture() {
    if (!gesturesStore.gestureName.trim()) {
      gesturesStore.setCustomGestureError('ジェスチャー名を入力してください');
      return;
    }

    if (gesturesStore.currentPattern.length === 0) {
      gesturesStore.setCustomGestureError('ジェスチャーパターンを入力してください');
      return;
    }

    try {
      logger?.debug('🔄 Adding custom gesture:', {
        name: gesturesStore.gestureName,
        pattern: gesturesStore.currentPattern,
        action: gesturesStore.gestureAction,
      });

      const services = (window as any).services;
      if (!services) {
        throw new Error('Services not available');
      }

      const customGestureManagementUseCase = services.customGestureManagementUseCase;

      // カスタムジェスチャーを追加（正しい引数形式）
      const customGesture = await customGestureManagementUseCase.addCustomGesture({
        name: gesturesStore.gestureName.trim(),
        pattern: gesturesStore.currentPattern as Direction[],
        action: gesturesStore.gestureAction as ActionName,
        description: `カスタムジェスチャー: ${gesturesStore.gestureName.trim()}`,
      });

      logger?.info('✅ Custom gesture added successfully:', customGesture.name);

      // ストレージから最新データを再読み込みしてUIを同期
      //await reloadCustomGesturesFromStorage();
      gesturesStore.addCustomGesture(customGesture);

      // フォームをクリア
      gesturesStore.clearCustomGestureForm();
      uiStore.showSaveStatus('カスタムジェスチャーを追加しました');
    } catch (error) {
      logger?.error('❌ カスタムジェスチャー追加エラー:', error);
      gesturesStore.setCustomGestureError('カスタムジェスチャーの追加に失敗しました');
    }
  }

  async function toggleGesture(gestureId: string, enabled: boolean) {
    try {
      logger?.debug('🔄 Toggling gesture:', { gestureId, enabled });

      // UI を即座に更新（楽観的更新）
      gesturesStore.updateGestureEnabled(gestureId, enabled);

      // バックエンドへの保存はバックグラウンドで実行
      await performToggle(gestureId, enabled);

      logger?.info('✅ Gesture toggle completed:', { gestureId, enabled });
    } catch (error) {
      logger?.error('❌ Gesture toggle failed:', { gestureId, enabled, error });

      // エラーが発生した場合、UIを元に戻す
      gesturesStore.updateGestureEnabled(gestureId, !enabled);
      uiStore.showSaveStatus('ジェスチャー設定の変更に失敗しました', 'error');
    }
  }

  async function performToggle(gestureId: string, enabled: boolean) {
    const services = (window as any).services;
    if (!services) {
      throw new Error('Services not available');
    }

    logger?.debug('🐛 [Debug] Gesture toggle request:', {
      gestureId,
      enabled,
      gestureIdType: typeof gestureId,
      gestureIdLength: gestureId?.length,
      isCustomGesture: gestureId.startsWith('custom_'),
    });

    // 効率的な事前判定による適切なUseCase選択
    if (gestureId.startsWith('custom_')) {
      // カスタムジェスチャーの場合
      try {
        const customGestureManagementUseCase = services.customGestureManagementUseCase;
        await customGestureManagementUseCase.toggleCustomGesture(gestureId, enabled);
        logger?.debug('✅ Custom gesture toggled directly:', { gestureId, enabled });
      } catch (error) {
        logger?.error('❌ Custom gesture toggle failed:', error);
        throw error;
      }
    } else {
      // デフォルトジェスチャーの場合
      try {
        const settingsManagementUseCase = services.settingsManagementUseCase;
        await settingsManagementUseCase.toggleGesture(gestureId, enabled);
        logger?.debug('✅ Default gesture toggled directly:', { gestureId, enabled });
      } catch (error) {
        logger?.error('❌ Default gesture toggle failed:', error);
        throw error;
      }
    }
  }

  async function deleteCustomGesture(gestureId: string, gestureName: string) {
    uiStore.showConfirmDialog(`カスタムジェスチャー「${gestureName}」を削除しますか？`, async () => {
      try {
        logger?.debug('🔄 Deleting custom gesture:', { gestureId, gestureName });

        const services = (window as any).services;
        if (!services) {
          throw new Error('Services not available');
        }

        const customGestureManagementUseCase = services.customGestureManagementUseCase;

        // 削除前の状態をログ出力
        const beforeDeletion = await customGestureManagementUseCase.getAllCustomGestures();
        logger?.debug('🐛 [Debug] Before deletion:', {
          total: beforeDeletion.length,
          gestureIds: beforeDeletion.map((g: any) => g.id),
          targetId: gestureId,
        });

        // 削除実行前にUIから即座に削除（楽観的削除で即座にUIを更新）
        gesturesStore.removeCustomGesture(gestureId);
        logger?.debug('🐛 [Debug] UI gesture removed immediately:', gestureId);

        // バックエンドから削除実行
        await customGestureManagementUseCase.deleteCustomGesture(gestureId);

        // ストレージから最新データを再読み込みしてUIを完全同期
        //await reloadCustomGesturesFromStorage();

        logger?.info('✅ Custom gesture deleted successfully:', gestureName);
        uiStore.showSaveStatus('カスタムジェスチャーを削除しました');
      } catch (error) {
        logger?.error('❌ カスタムジェスチャー削除エラー:', error);
        uiStore.showSaveStatus('カスタムジェスチャーの削除に失敗しました', 'error');
      }
    });
  }

  function handleAddDirection(direction: string) {
    gesturesStore.addDirection(direction);
    gesturesStore.clearCustomGestureError();
  }

  function handleClearPattern() {
    gesturesStore.clearPattern();
  }

  function handleClearCustomGestureError() {
    gesturesStore.clearCustomGestureError();
  }

  return {
    addCustomGesture,
    toggleGesture,
    deleteCustomGesture,
    handleAddDirection,
    handleClearPattern,
    handleClearCustomGestureError,
    setLogger,
  };
}
