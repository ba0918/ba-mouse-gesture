/**
 * IGestureRepository - Gesture Repository Interface
 * Clean Architecture - Application層のインターフェース定義
 * 依存性逆転原則（DIP）に従い、UseCaseが依存するRepositoryの契約を定義
 */

import { CustomGesture } from '../../domain/entities/CustomGesture';

export interface IGestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>;
  addCustomGesture(gesture: CustomGesture): Promise<void>;
  updateCustomGesture(gestureId: string, updates: Record<string, unknown>): Promise<CustomGesture>;
  deleteCustomGesture(gestureId: string): Promise<CustomGesture[]>;
  toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGesture>;
}
