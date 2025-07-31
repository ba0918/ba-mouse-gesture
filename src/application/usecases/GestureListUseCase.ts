/**
 * GestureListUseCase - ジェスチャー一覧取得UseCase
 * Clean Architecture - Application層
 */

import { DefaultGestureDefinitions } from '../../domain/definitions/DefaultGestureDefinitions';
import { CustomGesture } from '../../domain/entities/CustomGesture';
import type { GestureAction } from '../../domain/entities/Gesture';
import { IGestureRepository, ISettingsRepository } from '../interfaces';

interface UIGesture {
  id: string;
  name: string;
  pattern: string;
  action: GestureAction;
  type: 'default' | 'custom';
  enabled: boolean;
  description: string;
}

export class GestureListUseCase {
  constructor(
    private gestureRepository: IGestureRepository,
    private settingsRepository: ISettingsRepository
  ) {}

  async getAllGestures(): Promise<UIGesture[]> {
    // 設定から標準ジェスチャーの有効/無効状態を取得
    const settings = await this.settingsRepository.getSettings();
    const gestureStates = settings.defaultGestureStates || {};

    // デフォルトジェスチャーを取得
    const defaultGestures = DefaultGestureDefinitions.getAllDefinitions().map((def) => ({
      id: def.id, // 正しいIDを使用（left, right, etc）
      name: def.name,
      pattern: def.pattern,
      action: def.action,
      type: 'default' as const,
      enabled: gestureStates[def.id] ?? true, // 設定から状態を取得、デフォルトはtrue
      description: def.description,
    }));

    // カスタムジェスチャーを取得
    const customGestures = await this.gestureRepository.getCustomGestures();
    const customGestureList = customGestures.map((gesture: CustomGesture) => ({
      id: gesture.id,
      name: gesture.name,
      pattern: gesture.pattern.toString(),
      action: gesture.action,
      type: 'custom' as const,
      enabled: gesture.enabled,
      description: gesture.name, // カスタムジェスチャーはnameをdescriptionとして使用
    }));

    return [...defaultGestures, ...customGestureList];
  }
}
