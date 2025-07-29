/**
 * ChromeStorage インフラストラクチャ
 * chrome.storage API の統一インターフェース
 */

// 型定義
type StorageArea = 'sync' | 'local' | 'session';

interface ChromeStorageOptions {
  defaultArea?: StorageArea;
  errorHandler?: (error: Error, operation: string, context: any) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

interface UsageStats {
  [key: string]: {
    bytesInUse?: number;
    quota?: number;
    percentUsed?: number;
    error?: string;
  };
}

interface HealthCheckResult {
  apiAvailable: boolean;
  syncWorking: boolean;
  localWorking: boolean;
  errors: string[];
}

class ChromeStorage {
  private readonly defaultArea: StorageArea;
  private readonly errorHandler: (error: Error, operation: string, context: any) => void;
  private readonly retryAttempts: number;
  private readonly retryDelay: number;

  /**
   * @param options - 設定オプション
   */
  constructor(options: ChromeStorageOptions = {}) {
    this.defaultArea = options.defaultArea || 'sync';
    this.errorHandler = options.errorHandler || this.defaultErrorHandler;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
  }

  /**
   * データを取得
   * @param keys - 取得するキー
   * @param area - ストレージエリア ('sync' | 'local')
   * @returns Promise<Object>
   */
  get(keys: string | string[] | { [key: string]: any }, area: StorageArea = this.defaultArea): Promise<{ [key: string]: any }> {
    return this.withRetry(() => {
      this.validateChromeApi();
      
      const storage = this.getStorageArea(area);
      
      return new Promise<{ [key: string]: any }>((resolve, reject) => {
        storage.get(keys, (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            // ログ出力（デバッグ用）
            this.logOperation('get', { keys, area, resultKeys: Object.keys(result) });
            resolve(result);
          }
        });
      });
    });
  }

  /**
   * データを保存
   * @param items - 保存するデータ
   * @param area - ストレージエリア
   * @returns Promise<void>
   */
  set(items: { [key: string]: any }, area: StorageArea = this.defaultArea): Promise<void> {
    return this.withRetry(() => {
      this.validateChromeApi();
      this.validateItems(items);
      
      const storage = this.getStorageArea(area);
      
      return new Promise<void>((resolve, reject) => {
        storage.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this.logOperation('set', { keys: Object.keys(items), area });
            resolve();
          }
        });
      });
    });
  }

  /**
   * データを削除
   * @param keys - 削除するキー
   * @param area - ストレージエリア
   * @returns Promise<void>
   */
  remove(keys: string | string[], area: StorageArea = this.defaultArea): Promise<void> {
    return this.withRetry(() => {
      this.validateChromeApi();
      
      const storage = this.getStorageArea(area);
      
      return new Promise<void>((resolve, reject) => {
        storage.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this.logOperation('remove', { keys, area });
            resolve();
          }
        });
      });
    });
  }

  /**
   * 全データを削除
   * @param area - ストレージエリア
   * @returns Promise<void>
   */
  clear(area: StorageArea = this.defaultArea): Promise<void> {
    return this.withRetry(() => {
      this.validateChromeApi();
      
      const storage = this.getStorageArea(area);
      
      return new Promise<void>((resolve, reject) => {
        storage.clear(() => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            this.logOperation('clear', { area });
            resolve();
          }
        });
      });
    });
  }

  /**
   * 使用容量を取得
   * @param keys - 対象キー（null で全体）
   * @param area - ストレージエリア
   * @returns Promise<number> バイト数
   */
  getBytesInUse(keys: string | string[] | null = null, area: StorageArea = this.defaultArea): Promise<number> {
    return this.withRetry(() => {
      this.validateChromeApi();
      
      const storage = this.getStorageArea(area);
      
      return new Promise<number>((resolve, reject) => {
        if (!storage.getBytesInUse) {
          // getBytesInUse が利用できない場合の代替実装
          storage.get(keys, (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(this.calculateDataSize(result));
            }
          });
        } else {
          storage.getBytesInUse(keys, (bytesInUse) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(bytesInUse);
            }
          });
        }
      });
    });
  }

  /**
   * ストレージ変更を監視
   * @param callback - 変更時コールバック
   * @param area - 監視対象エリア
   * @returns リスナー削除関数
   */
  onChanged(callback: (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => void, area: StorageArea | null = null): () => void {
    this.validateChromeApi();
    
    const wrappedCallback = (changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => {
      // エリア指定がある場合はフィルタリング
      if (area && namespace !== area) return;
      
      this.logOperation('changed', { 
        changedKeys: Object.keys(changes), 
        namespace 
      });
      
      callback(changes, namespace);
    };
    
    chrome.storage.onChanged.addListener(wrappedCallback);
    
    // リスナー削除関数を返す
    return () => {
      chrome.storage.onChanged.removeListener(wrappedCallback);
    };
  }

  /**
   * データの一括更新（マージ）
   * @param updates - 更新データ
   * @param area - ストレージエリア
   * @returns Promise<Object> 更新後のデータ
   */
  async update(updates: { [key: string]: any }, area: StorageArea = this.defaultArea): Promise<{ [key: string]: any }> {
    return this.withRetry(async () => {
      // 既存データを取得
      const keys = Object.keys(updates);
      const existing = await this.get(keys, area);
      
      // マージ処理
      const merged: { [key: string]: any } = {};
      for (const key of keys) {
        if (typeof updates[key] === 'object' && !Array.isArray(updates[key])) {
          // オブジェクトの場合は深いマージ
          merged[key] = { ...existing[key], ...updates[key] };
        } else {
          // プリミティブまたは配列の場合は置換
          merged[key] = updates[key];
        }
      }
      
      await this.set(merged, area);
      return merged;
    });
  }

  /**
   * 安全なデータ取得（デフォルト値付き）
   * @param key - 取得するキー
   * @param defaultValue - デフォルト値
   * @param area - ストレージエリア
   * @returns Promise<T>
   */
  async getSafe<T>(key: string, defaultValue: T, area: StorageArea = this.defaultArea): Promise<T> {
    try {
      const result = await this.get(key, area);
      return result[key] !== undefined ? result[key] : defaultValue;
    } catch (error) {
      this.errorHandler(error as Error, 'getSafe', { key, area });
      return defaultValue;
    }
  }

  /**
   * ストレージエリアを取得
   * @param area
   * @returns chrome.storage area
   */
  private getStorageArea(area: StorageArea): chrome.storage.StorageArea {
    if (area === 'sync') return chrome.storage.sync;
    if (area === 'local') return chrome.storage.local;
    if (area === 'session') return chrome.storage.session;
    
    throw new Error(`Invalid storage area: ${area}`);
  }

  /**
   * Chrome API の可用性をチェック
   */
  private validateChromeApi(): void {
    if (typeof chrome === 'undefined' || !chrome.storage) {
      throw new Error('Chrome storage API is not available');
    }
  }

  /**
   * 保存データの妥当性をチェック
   * @param items
   */
  private validateItems(items: { [key: string]: any }): void {
    if (!items || typeof items !== 'object') {
      throw new Error('Items must be an object');
    }
    
    // データサイズのチェック（Chrome制限対応）
    const dataSize = this.calculateDataSize(items);
    const maxSize = this.defaultArea === 'sync' ? 8192 : 10485760; // 8KB(sync) or 10MB(local)
    
    if (dataSize > maxSize) {
      throw new Error(`Data size (${dataSize} bytes) exceeds limit (${maxSize} bytes)`);
    }
  }

  /**
   * データサイズを計算
   * @param data
   * @returns バイト数
   */
  private calculateDataSize(data: any): number {
    return new window.Blob([JSON.stringify(data)]).size;
  }

  /**
   * リトライ付きで操作を実行
   * @param operation
   * @returns Promise<T>
   */
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Chrome runtime エラーやvalidationエラーは即座に諦める
        if (lastError.message && (
          lastError.message.includes('Extension context invalidated') ||
          lastError.message.includes('Items must be an object') ||
          lastError.message.includes('Data size') ||
          lastError.message.includes('Invalid storage area')
        )) {
          throw lastError;
        }
        
        // 最後の試行でなければリトライ
        if (attempt < this.retryAttempts) {
          await this.delay(this.retryDelay * attempt);
          continue;
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 遅延処理
   * @param ms
   * @returns Promise<void>
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 操作ログ出力
   * @param operation
   * @param details
   */
  private logOperation(operation: string, details: any): void {
    if (typeof console !== 'undefined' && console.log) {
      console.log(`[ChromeStorage] ${operation}:`, details);
    }
  }

  /**
   * デフォルトエラーハンドラー
   * @param error
   * @param operation
   * @param context
   */
  private defaultErrorHandler(error: Error, operation: string, context: any): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error(`[ChromeStorage] Error in ${operation}:`, error, context);
    }
  }

  /**
   * ストレージ使用量の統計を取得
   * @returns Promise<UsageStats>
   */
  async getUsageStats(): Promise<UsageStats> {
    const stats: UsageStats = {};
    
    try {
      // 各エリアの使用量を取得
      for (const area of ['sync', 'local'] as StorageArea[]) {
        try {
          const bytesInUse = await this.getBytesInUse(null, area);
          const quota = area === 'sync' ? chrome.storage.sync.QUOTA_BYTES : 
            chrome.storage.local.QUOTA_BYTES;
          
          stats[area] = {
            bytesInUse,
            quota,
            percentUsed: Math.round((bytesInUse / quota) * 100)
          };
        } catch (error) {
          stats[area] = { error: (error as Error).message };
        }
      }
    } catch (error) {
      this.errorHandler(error as Error, 'getUsageStats', {});
    }
    
    return stats;
  }

  /**
   * ストレージの健全性チェック
   * @returns Promise<HealthCheckResult>
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const health: HealthCheckResult = {
      apiAvailable: false,
      syncWorking: false,
      localWorking: false,
      errors: []
    };
    
    try {
      // API可用性チェック
      this.validateChromeApi();
      health.apiAvailable = true;
      
      // 各エリアの動作チェック
      const testKey = '_healthCheck_' + Date.now();
      const testValue = { timestamp: Date.now() };
      
      // Sync storage test
      try {
        await this.set({ [testKey]: testValue }, 'sync');
        const result = await this.get(testKey, 'sync');
        if (result[testKey]?.timestamp === testValue.timestamp) {
          health.syncWorking = true;
        }
        await this.remove(testKey, 'sync');
      } catch (error) {
        health.errors.push(`Sync storage error: ${(error as Error).message}`);
      }
      
      // Local storage test
      try {
        await this.set({ [testKey]: testValue }, 'local');
        const result = await this.get(testKey, 'local');
        if (result[testKey]?.timestamp === testValue.timestamp) {
          health.localWorking = true;
        }
        await this.remove(testKey, 'local');
      } catch (error) {
        health.errors.push(`Local storage error: ${(error as Error).message}`);
      }
      
    } catch (error) {
      health.errors.push(`API error: ${(error as Error).message}`);
    }
    
    return health;
  }
}

// ES6 Module export
export { ChromeStorage, type ChromeStorageOptions, type StorageArea, type UsageStats, type HealthCheckResult };