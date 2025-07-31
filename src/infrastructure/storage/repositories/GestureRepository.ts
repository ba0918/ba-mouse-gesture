/**
 * GestureRepository
 * ジェスチャーデータ（カスタムジェスチャー・学習データ）の永続化を担当するリポジトリ
 * Clean Architecture - Infrastructure層
 */

import { IGestureRepository } from "../../../application/interfaces";
import { CustomGesture } from "../../../domain/entities/CustomGesture";
import type { ChromeStorageAdapter } from "../../adapters/ChromeStorageAdapter";

// Type definitions
interface CacheEntry {
  data: any;
  timestamp: number;
}

interface UsageStats {
  id: string;
  name: string;
  totalUsage: number;
  successRate: number;
  enabled: boolean;
}

interface PerformanceStats {
  totalCustomGestures: number;
  enabledGestures: number;
  totalUsage: number;
  averageSuccessRate: number;
  topPerformers: UsageStats[];
}

interface OptimizationResult {
  beforeSize: number;
  afterSize: number;
  optimizations: string[];
  error?: string;
}

interface RepositoryStatus {
  isHealthy: boolean;
  customGesturesCount?: number;
  cacheSize?: number;
  storage?: any;
  error?: string;
}

type GestureChangeCallback = (changes: any) => void;

export class GestureRepository implements IGestureRepository {
  private readonly storage: ChromeStorageAdapter;
  private readonly customGesturesKey: string = "customGestures";

  private readonly cache: Map<string, CacheEntry> = new Map();
  private readonly cacheTimeout: number = 3000; // 3秒でキャッシュ無効化

  constructor(storage: ChromeStorageAdapter) {
    this.storage = storage;
  }

  /**
   * カスタムジェスチャーを全て取得
   */
  async getCustomGestures(): Promise<CustomGesture[]> {
    // キャッシュチェック
    const cachedData = this.cache.get(this.customGesturesKey);
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.data;
    }

    try {
      const result = await this.storage.get(this.customGesturesKey);
      const gesturesData = result[this.customGesturesKey] || [];

      const gestures = gesturesData.map((data: any) => CustomGesture.fromJSON(data));

      // キャッシュに保存
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now(),
      });

      return gestures;
    } catch (error) {
      console.error("Failed to load custom gestures:", error);
      return [];
    }
  }

  /**
   * カスタムジェスチャーを保存
   * @param gestures - カスタムジェスチャー配列
   */
  async saveCustomGestures(gestures: CustomGesture[]): Promise<void> {
    try {
      // バリデーション
      if (!Array.isArray(gestures)) {
        throw new Error("Gestures must be an array");
      }

      for (const gesture of gestures) {
        // バリデーション実行

        if (!gesture) {
          console.error("❌ Gesture is null/undefined");
          throw new Error("Invalid gesture: gesture is null/undefined");
        }

        if (typeof gesture.isValid !== "function") {
          console.error("❌ Gesture does not have isValid method:", typeof gesture.isValid);
          throw new Error(`Invalid gesture: ${gesture?.id || "unknown"} - no isValid method`);
        }

        const isValidResult = gesture.isValid();

        if (!isValidResult) {
          console.error("❌ Gesture.isValid() returned false for:", gesture?.id);
          throw new Error(`Invalid gesture: ${gesture?.id || "unknown"} - isValid() returned false`);
        }
      }

      const serializedData = gestures.map(gesture => gesture.toJSON());
      await this.storage.set({ [this.customGesturesKey]: serializedData });

      // キャッシュ更新
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to save custom gestures:", error);
      throw new GestureRepositoryError("Failed to save custom gestures", error);
    }
  }

  /**
   * カスタムジェスチャーを追加
   * @param gesture - 追加するジェスチャー
   */
  async addCustomGesture(gesture: CustomGesture): Promise<void> {
    const gestures = await this.getCustomGestures();

    // 重複チェック
    const existingGesture = gestures.find(g => g.id === gesture.id || g.name === gesture.name);

    if (existingGesture) {
      const errorMessage = `Gesture with id '${gesture.id}' or name '${gesture.name}' already exists`;
      console.error("🔧 [Debug] Duplicate gesture error:", errorMessage);
      throw new Error(errorMessage);
    }

    gestures.push(gesture);

    await this.saveCustomGestures(gestures);
  }

  /**
   * カスタムジェスチャーを更新
   * @param gestureId - ジェスチャーID
   * @param updates - 更新データ
   */
  async updateCustomGesture(gestureId: string, updates: Partial<CustomGesture>): Promise<CustomGesture> {
    const gestures = await this.getCustomGestures();
    const gestureIndex = gestures.findIndex(g => g.id === gestureId);

    if (gestureIndex === -1) {
      throw new Error(`Gesture with id '${gestureId}' not found`);
    }

    const gesture = gestures[gestureIndex];

    // 更新の適用
    Object.keys(updates).forEach(key => {
      if (key in gesture && key !== "id") { // IDは変更不可
        (gesture as any)[key] = updates[key as keyof CustomGesture];
      }
    });

    await this.saveCustomGestures(gestures);
    return gesture;
  }

  /**
   * カスタムジェスチャーを削除
   * @param gestureId - ジェスチャーID
   */
  async deleteCustomGesture(gestureId: string): Promise<CustomGesture[]> {
    const gestures = await this.getCustomGestures();

    const filteredGestures = gestures.filter(g => g.id !== gestureId);

    if (filteredGestures.length === gestures.length) {
      const errorMessage = `Gesture with id '${gestureId}' not found`;
      console.error("🔧 [Debug] Delete failed - gesture not found:", errorMessage);
      throw new Error(errorMessage);
    }

    await this.saveCustomGestures(filteredGestures);

    return filteredGestures;
  }

  /**
   * カスタムジェスチャーの有効/無効を切り替え
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   */
  async toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture> {
    return await this.updateCustomGesture(gestureId, { enabled });
  }

  /**
   * ジェスチャー使用統計を記録
   * @param gestureId - ジェスチャーID
   * @param success - 実行成功
   */
  async recordGestureUsage(gestureId: string, success: boolean): Promise<void> {
    const gestures = await this.getCustomGestures();
    const gesture = gestures.find(g => g.id === gestureId);

    if (gesture) {
      gesture.recordUsage(success);
      await this.saveCustomGestures(gestures);
    }
  }

  /**
   * ジェスチャーパフォーマンス統計を取得
   */
  async getPerformanceStats(): Promise<Record<string, unknown>> {
    const customGestures = await this.getCustomGestures();

    const stats: PerformanceStats = {
      totalCustomGestures: customGestures.length,
      enabledGestures: customGestures.filter(g => g.enabled).length,
      totalUsage: 0,
      averageSuccessRate: 0,
      topPerformers: [],
    };

    return stats;
  }

  /**
   * データ容量の最適化
   */
  async optimizeStorage(): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      beforeSize: 0,
      afterSize: 0,
      optimizations: [],
    };

    try {
      // 現在のサイズを測定
      result.beforeSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
      ]);

      // カスタムジェスチャーの最適化
      const gestures = await this.getCustomGestures();
      const optimizedGestures = gestures.filter(gesture => {
        // 使用されていないジェスチャーを除去（長期間未使用）
        if (!gesture.enabled && gesture.usage.totalCount === 0) {
          result.optimizations.push(`Removed unused gesture: ${gesture.name}`);
          return false;
        }
        return true;
      });

      if (optimizedGestures.length !== gestures.length) {
        await this.saveCustomGestures(optimizedGestures);
      }

      // 最適化後のサイズを測定
      result.afterSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
      ]);
    } catch (error) {
      result.error = (error as Error).message;
    }

    return result;
  }

  /**
   * ジェスチャー変更を監視
   * @param callback - 変更時コールバック
   * @returns リスナー削除関数
   */
  onGesturesChanged(callback: GestureChangeCallback): () => void {
    return this.storage.addChangeListener((changes, namespace) => {
      if (namespace === "sync") {
        let changed = false;

        if (this.customGesturesKey in changes) {
          this.cache.delete(this.customGesturesKey);
          changed = true;
        }

        if (changed) {
          callback(changes);
        }
      }
    });
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * リポジトリの状態確認
   */
  async getRepositoryStatus(): Promise<RepositoryStatus> {
    try {
      const customGestures = await this.getCustomGestures();

      // ChromeStorageAdapterにはgetUsageStatsメソッドがないため、getBytesInUseを使用
      const storageUsage = await this.storage.getBytesInUse();

      return {
        isHealthy: true,
        customGesturesCount: customGestures.length,

        cacheSize: this.cache.size,
        storage: { bytesInUse: storageUsage },
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: (error as Error).message,
        cacheSize: this.cache.size,
      };
    }
  }
}

/**
 * GestureRepository専用エラークラス
 */
export class GestureRepositoryError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = "GestureRepositoryError";
    this.originalError = originalError;
  }
}
