/**
 * GestureListUseCase - ジェスチャー一覧取得UseCase
 * Clean Architecture - Application層
 */

import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository.js';
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
        private gestureRepository: GestureRepository
    ) {}

    async getAllGestures(): Promise<UIGesture[]> {
        // デフォルトジェスチャーを取得
        const defaultGestures = DefaultGestureDefinitions.getAllDefinitions().map(def => ({
            id: def.id, // 正しいIDを使用（left, right, etc）
            name: def.description,
            pattern: def.pattern,
            action: def.action,
            type: 'default' as const,
            enabled: true
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