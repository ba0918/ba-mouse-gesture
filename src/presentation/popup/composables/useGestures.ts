/**
 * ジェスチャー操作ロジックcomposable
 * カスタムジェスチャーの追加、削除、有効/無効切り替えを管理
 */

import { GesturePattern } from '../../../domain/valueObjects/GesturePattern';
import type { ActionName } from '../../../domain/types/ActionName';
import type { GesturesStore, UICustomGesture } from '../stores/gesturesStore';
import type { UiStore } from '../stores/uiStore';

export function useGestures(gesturesStore: GesturesStore, uiStore: UiStore) {
  let logger: any = null; // Will be set from parent

  function setLogger(newLogger: any) {
    logger = newLogger;
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

      // GesturePatternエンティティを作成
      const gesturePattern = GesturePattern.fromDirections(gesturesStore.currentPattern);

      // カスタムジェスチャーを追加
      const result = await customGestureManagementUseCase.addCustomGesture(
        gesturesStore.gestureName.trim(),
        gesturePattern,
        gesturesStore.gestureAction as ActionName,
      );

      if (result.success) {
        logger?.info('✅ Custom gesture added successfully:', result.gesture?.name);

        // UI更新用のジェスチャーオブジェクトを作成
        if (result.gesture) {
          const uiGesture: UICustomGesture = {
            id: result.gesture.id,
            name: result.gesture.name,
            pattern: result.gesture.pattern.toDisplayString(),
            action: result.gesture.action,
            description: `カスタムジェスチャー: ${result.gesture.name}`,
            enabled: result.gesture.enabled,
            type: 'custom',
          };

          gesturesStore.addCustomGesture(uiGesture);
        }

        // フォームをクリア
        gesturesStore.clearCustomGestureForm();
        uiStore.showSaveStatus('カスタムジェスチャーを追加しました');
      } else {
        gesturesStore.setCustomGestureError(result.error || 'カスタムジェスチャーの追加に失敗しました');
      }
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

    // まずデフォルトジェスチャーを試行
    try {
      const gestureListUseCase = services.gestureListUseCase;
      const result = await gestureListUseCase.toggleDefaultGesture(gestureId, enabled);

      if (result.success) {
        logger?.debug('✅ Default gesture toggled:', { gestureId, enabled });
        return;
      }
    } catch (error) {
      logger?.debug('Default gesture toggle failed, trying custom gesture:', error);
    }

    // デフォルトジェスチャーで失敗した場合、カスタムジェスチャーを試行
    try {
      const customGestureManagementUseCase = services.customGestureManagementUseCase;
      const result = await customGestureManagementUseCase.toggleCustomGesture(gestureId, enabled);

      if (result.success) {
        logger?.debug('✅ Custom gesture toggled:', { gestureId, enabled });
        return;
      } else {
        throw new Error(result.error || 'Custom gesture toggle failed');
      }
    } catch (error) {
      logger?.error('Both default and custom gesture toggle failed:', error);
      throw error;
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
        const result = await customGestureManagementUseCase.deleteCustomGesture(gestureId);

        if (result.success) {
          gesturesStore.removeCustomGesture(gestureId);
          logger?.info('✅ Custom gesture deleted successfully:', gestureName);
          uiStore.showSaveStatus('カスタムジェスチャーを削除しました');
        } else {
          throw new Error(result.error || 'Delete failed');
        }
      } catch (error) {
        logger?.error('❌ カスタムジェスチャー削除エラー:', error);
        uiStore.showSaveStatus('カスタムジェスチャーの削除に失敗しました', 'error');
      }
    });
  }

  return {
    addCustomGesture,
    toggleGesture,
    deleteCustomGesture,
    setLogger,
  };
}
