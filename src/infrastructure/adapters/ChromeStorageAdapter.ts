/**
 * Chrome Storage API アダプター
 * Infrastructure层 - 外部システムとのインターフェース
 */

import { NoOpLogger } from './NoOpLogger';

// Type definitions
interface Logger {
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

interface StorageData {
  [key: string]: any;
}

type StorageChangeCallback = (changes: chrome.storage.StorageChange, areaName: chrome.storage.AreaName) => void;

export class ChromeStorageAdapter {
  private readonly storage: typeof chrome.storage | undefined;
  private logger: Logger;

  constructor(logger: Logger | null = null) {
    this.storage = chrome?.storage;
    this.logger = logger || new NoOpLogger(); // Null Objectパターン適用

    if (!this.storage) {
      this.logger.warn('Chrome storage API not available');
    }
  }

  /**
   * DebugLoggerを設定
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
  }

  /**
   * データを取得（chrome.storage.sync）
   */
  async get(key: string): Promise<Record<string, any>> {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Getting data from sync storage:', key);

      const result = await new Promise<Record<string, any>>((resolve, reject) => {
        this.storage!.sync.get(key, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Data retrieved successfully');
      return result;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to get data:', error);
      throw new Error(`Failed to get data from storage: ${(error as Error).message}`);
    }
  }

  /**
   * データを保存（chrome.storage.sync）
   */
  async set(data: StorageData): Promise<void> {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Setting data to sync storage');

      await new Promise<void>((resolve, reject) => {
        this.storage!.sync.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Data saved successfully');
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to set data:', error);
      throw new Error(`Failed to set data to storage: ${(error as Error).message}`);
    }
  }

  /**
   * 同期設定専用（content_script通知用）
   * 🔧 重要: デバッグ設定同期問題の解決
   */
  async syncSet(data: StorageData): Promise<boolean> {
    try {
      this.logger.info('ChromeStorageAdapter: Syncing data for content script notification');

      // まずsync storageに保存
      await this.set(data);

      // storage.onChangedイベントが発火され、content_scriptが反応する
      this.logger.info('ChromeStorageAdapter: Sync data saved, content script will be notified');

      return true;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to sync data:', error);
      throw error;
    }
  }

  /**
   * データを削除
   */
  async remove(keys: string | string[]): Promise<boolean> {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Removing data from sync storage:', keys);

      await new Promise<void>((resolve, reject) => {
        this.storage!.sync.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Data removed successfully');
      return true;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to remove data:', error);
      throw new Error(`Failed to remove data from storage: ${(error as Error).message}`);
    }
  }

  /**
   * 全データをクリア
   */
  async clear(): Promise<boolean> {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Clearing all sync storage data');

      await new Promise<void>((resolve, reject) => {
        this.storage!.sync.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: All data cleared successfully');
      return true;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to clear data:', error);
      throw new Error(`Failed to clear storage: ${(error as Error).message}`);
    }
  }

  /**
   * ローカルストレージからデータを取得（chrome.storage.local）
   */
  async getLocal(keys: string | string[] | null = null): Promise<StorageData> {
    if (!this.storage?.local) {
      throw new Error('Chrome storage.local not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Getting data from local storage:', keys);

      const result = await new Promise<StorageData>((resolve, reject) => {
        this.storage!.local.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Local data retrieved successfully');
      return result;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to get local data:', error);
      throw new Error(`Failed to get data from local storage: ${(error as Error).message}`);
    }
  }

  /**
   * ローカルストレージにデータを保存（chrome.storage.local）
   */
  async setLocal(data: StorageData): Promise<boolean> {
    if (!this.storage?.local) {
      throw new Error('Chrome storage.local not available');
    }

    try {
      this.logger.info('ChromeStorageAdapter: Setting data to local storage');

      await new Promise<void>((resolve, reject) => {
        this.storage!.local.set(data, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Local data saved successfully');
      return true;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to set local data:', error);
      throw new Error(`Failed to set data to local storage: ${(error as Error).message}`);
    }
  }

  /**
   * ストレージの使用量を取得
   */
  async getBytesInUse(keys: string | string[] | null = null): Promise<number> {
    if (!this.storage?.sync) {
      throw new Error('Chrome storage.sync not available');
    }

    try {
      const bytesInUse = await new Promise<number>((resolve, reject) => {
        this.storage!.sync.getBytesInUse(keys, (bytesInUse) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(bytesInUse);
          }
        });
      });

      this.logger.info('ChromeStorageAdapter: Storage usage:', bytesInUse, 'bytes');
      return bytesInUse;
    } catch (error) {
      this.logger.error('ChromeStorageAdapter: Failed to get storage usage:', error);
      throw error;
    }
  }

  /**
   * アダプターの可用性チェック
   */
  isAvailable(): boolean {
    return Boolean(this.storage?.sync && this.storage?.local);
  }

  /**
   * ストレージ変更リスナーを設定
   * @param callback - 変更時のコールバック関数
   * @returns リスナー削除関数
   */
  addChangeListener(callback: StorageChangeCallback): () => void {
    if (!this.storage?.onChanged) {
      this.logger.warn('Chrome storage.onChanged not available');
      return () => {}; // 空の削除関数を返す
    }

    this.storage.onChanged.addListener(callback);
    this.logger.info('ChromeStorageAdapter: Change listener added');

    // リスナー削除関数を返す
    return () => {
      this.removeChangeListener(callback);
    };
  }

  /**
   * ストレージ変更リスナーを削除
   */
  removeChangeListener(callback: StorageChangeCallback): void {
    if (!this.storage?.onChanged) {
      this.logger.warn('Chrome storage.onChanged not available');
      return;
    }

    this.storage.onChanged.removeListener(callback);
    this.logger.info('ChromeStorageAdapter: Change listener removed');
  }

  /**
   * Storageインターフェース用のonChangedメソッド
   */
  onChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => void,
    namespace: string,
  ): () => void {
    return this.addChangeListener((changes, areaName) => {
      if (areaName === namespace || namespace === 'both') {
        callback(changes, areaName);
      }
    });
  }
}
