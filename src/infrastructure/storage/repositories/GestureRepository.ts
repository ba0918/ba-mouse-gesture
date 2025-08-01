/**
 * GestureRepository
 * ジェスチャーデータ（カスタムジェスチャー・学習データ）の永続化を担当するリポジトリ
 * Clean Architecture - Infrastructure層
 */

import { IGestureRepository } from '../../../application/interfaces';
import { CustomGesture } from '../../../domain/entities/CustomGesture';
import type { ChromeStorageAdapter } from '../../adapters/ChromeStorageAdapter';

// Type definitions
interface CacheEntry {
  data: any;
  timestamp: number;
}

export class GestureRepository implements IGestureRepository {
  private readonly storage: ChromeStorageAdapter;
  private readonly customGesturesKey: string = 'customGestures';

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
      console.error('Failed to load custom gestures:', error);
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
        throw new Error('Gestures must be an array');
      }

      for (const gesture of gestures) {
        // バリデーション実行

        if (!gesture) {
          console.error('❌ Gesture is null/undefined');
          throw new Error('Invalid gesture: gesture is null/undefined');
        }

        if (typeof gesture.isValid !== 'function') {
          console.error('❌ Gesture does not have isValid method:', typeof gesture.isValid);
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - no isValid method`);
        }

        const isValidResult = gesture.isValid();

        if (!isValidResult) {
          console.error('❌ Gesture.isValid() returned false for:', gesture?.id);
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - isValid() returned false`);
        }
      }

      const serializedData = gestures.map((gesture) => gesture.toJSON());
      await this.storage.set({ [this.customGesturesKey]: serializedData });

      // キャッシュ更新
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save custom gestures:', error);
      throw new GestureRepositoryError('Failed to save custom gestures', error);
    }
  }

  /**
   * カスタムジェスチャーを追加
   * @param gesture - 追加するジェスチャー
   */
  async addCustomGesture(gesture: CustomGesture): Promise<void> {
    const gestures = await this.getCustomGestures();

    // 重複チェック
    const existingGesture = gestures.find((g) => g.id === gesture.id || g.name === gesture.name);

    if (existingGesture) {
      const errorMessage = `Gesture with id '${gesture.id}' or name '${gesture.name}' already exists`;
      console.error('🔧 [Debug] Duplicate gesture error:', errorMessage);
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
    const gestureIndex = gestures.findIndex((g) => g.id === gestureId);

    if (gestureIndex === -1) {
      throw new Error(`Gesture with id '${gestureId}' not found`);
    }

    const gesture = gestures[gestureIndex];

    // 更新の適用
    Object.keys(updates).forEach((key) => {
      if (key in gesture && key !== 'id') {
        // IDは変更不可
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

    const filteredGestures = gestures.filter((g) => g.id !== gestureId);

    if (filteredGestures.length === gestures.length) {
      const errorMessage = `Gesture with id '${gestureId}' not found`;
      console.error('🔧 [Debug] Delete failed - gesture not found:', errorMessage);
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
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * GestureRepository専用エラークラス
 */
class GestureRepositoryError extends Error {
  readonly originalError?: unknown;

  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'GestureRepositoryError';
    this.originalError = originalError;
  }
}
