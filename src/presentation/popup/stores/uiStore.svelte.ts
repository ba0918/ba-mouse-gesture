/**
 * UI状態管理ストア
 * ローディング状態、通知、ダイアログの状態を管理
 */

export function createUiStore() {
  // UI状態をオブジェクトとして管理（直接再代入を避ける）
  const store = $state({
    // ローディング・通知状態
    isLoading: true,
    saveStatus: '',
    saveStatusType: 'success' as 'success' | 'error',
    saveStatusVisible: false,

    // 確認ダイアログ状態
    confirmDialog: false,
    confirmMessage: '',
    confirmCallback: null as (() => void) | null,
  });

  // トーストタイマーの参照を保持
  let toastTimer: NodeJS.Timeout | null = null;

  return {
    // State getters
    get isLoading() {
      return store.isLoading;
    },
    get saveStatus() {
      return store.saveStatus;
    },
    get saveStatusType() {
      return store.saveStatusType;
    },
    get saveStatusVisible() {
      return store.saveStatusVisible;
    },
    get confirmDialog() {
      return store.confirmDialog;
    },
    get confirmMessage() {
      return store.confirmMessage;
    },
    get confirmCallback() {
      return store.confirmCallback;
    },

    // State setters
    setLoading(loading: boolean) {
      store.isLoading = loading;
    },

    showSaveStatus(message: string, type: 'success' | 'error' = 'success') {
      // 既存のタイマーをクリア
      if (toastTimer) {
        clearTimeout(toastTimer);
        toastTimer = null;
      }

      store.saveStatus = message;
      store.saveStatusType = type;
      store.saveStatusVisible = true;

      // 3秒後に自動的に非表示
      toastTimer = setTimeout(() => {
        store.saveStatusVisible = false;
        toastTimer = null;
      }, 3000);
    },

    showConfirmDialog(message: string, callback: () => void) {
      store.confirmMessage = message;
      store.confirmCallback = callback;
      store.confirmDialog = true;
    },

    hideConfirmDialog() {
      store.confirmDialog = false;
      store.confirmMessage = '';
      store.confirmCallback = null;
    },

    executeConfirm() {
      if (store.confirmCallback) {
        store.confirmCallback();
      }
      this.hideConfirmDialog();
    },
  };
}

export type UiStore = ReturnType<typeof createUiStore>;
