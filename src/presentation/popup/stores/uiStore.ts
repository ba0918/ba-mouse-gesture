/**
 * UI状態管理ストア
 * ローディング状態、通知、ダイアログの状態を管理
 */

export function createUiStore() {
  // ローディング・通知状態
  let isLoading = $state(true);
  let saveStatus = $state('');
  let saveStatusType = $state<'success' | 'error'>('success');
  let saveStatusVisible = $state(false);

  // 確認ダイアログ状態
  let confirmDialog = $state(false);
  let confirmMessage = $state('');
  let confirmCallback = $state<(() => void) | null>(null);

  return {
    // State getters
    get isLoading() {
      return isLoading;
    },
    get saveStatus() {
      return saveStatus;
    },
    get saveStatusType() {
      return saveStatusType;
    },
    get saveStatusVisible() {
      return saveStatusVisible;
    },
    get confirmDialog() {
      return confirmDialog;
    },
    get confirmMessage() {
      return confirmMessage;
    },
    get confirmCallback() {
      return confirmCallback;
    },

    // State setters
    setLoading(loading: boolean) {
      isLoading = loading;
    },

    showSaveStatus(message: string, type: 'success' | 'error' = 'success') {
      saveStatus = message;
      saveStatusType = type;
      saveStatusVisible = true;

      // 3秒後に自動的に非表示
      setTimeout(() => {
        saveStatusVisible = false;
      }, 3000);
    },

    showConfirmDialog(message: string, callback: () => void) {
      confirmMessage = message;
      confirmCallback = callback;
      confirmDialog = true;
    },

    hideConfirmDialog() {
      confirmDialog = false;
      confirmMessage = '';
      confirmCallback = null;
    },

    executeConfirm() {
      if (confirmCallback) {
        confirmCallback();
      }
      this.hideConfirmDialog();
    },
  };
}

export type UiStore = ReturnType<typeof createUiStore>;
