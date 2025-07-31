/**
 * GestureListUseCase - ジェスチャー一覧取得UseCase
 * Clean Architecture - Application層
 */

import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository.js';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository.js';
import { DefaultGestureDefinitions } from '../../domain/definitions/DefaultGestureDefinitions.js';
import { CustomGesture } from '../../domain/entities/CustomGesture.js';
import type { GestureAction } from '../../domain/entities/Gesture.js';

export interface UIGesture {
    id: string;
    name: string;
    pattern: string;
    action: GestureAction;
    type: 'default' | 'custom';
    enabled: boolean;
}

export class GestureListUseCase {
    constructor(
        private gestureRepository: GestureRepository,
        private settingsRepository: SettingsRepository
    ) {}

    async getAllGestures(): Promise<UIGesture[]> {
        // 設定から標準ジェスチャーの有効/無効状態を取得
        const settings = await this.settingsRepository.getSettings();
        const gestureStates = settings.defaultGestureStates || {};

        // デフォルトジェスチャーを取得
        const defaultGestures = DefaultGestureDefinitions.getAllDefinitions().map(def => ({
            id: def.id, // 正しいIDを使用（left, right, etc）
            name: def.description,
            pattern: def.pattern,
            action: def.action,
            type: 'default' as const,
            enabled: gestureStates[def.id] ?? true // 設定から状態を取得、デフォルトはtrue
        }));

        // カスタムジェスチャーを取得
        const customGestures = await this.gestureRepository.getCustomGestures();
        const customGestureList = customGestures.map((gesture: CustomGesture) => ({
            id: gesture.id,
            name: gesture.name,
            pattern: gesture.pattern.toString(),
            action: gesture.action,
            type: 'custom' as const,
            enabled: gesture.enabled
        }));

        return [...defaultGestures, ...customGestureList];
    }
}