/**
 * ジェスチャー認識と実行
 * Single Responsibility: ジェスチャーパターンの認識とアクション実行
 */

import type { Point, AppSettings, GestureRecognitionResult } from './types';
import type { SettingsManager } from './SettingsManager';
import { SimpleGestureRecognizer } from '../../domain/services/SimpleGestureRecognizer';
import { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase';
import { ChromeStorageAdapter } from '../../infrastructure/adapters/ChromeStorageAdapter';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository';

export class GestureRecognizer {
  private gestureRecognizer: SimpleGestureRecognizer | null = null;
  private customGestureUseCase: CustomGestureManagementUseCase | null = null;

  constructor(
    private settingsManager: SettingsManager
  ) {}

  /**
   * 初期化
   */
  async initialize(): Promise<void> {
    try {
      // Domain Services初期化
      this.gestureRecognizer = new SimpleGestureRecognizer();

      // UseCase初期化
      const storageAdapter = new ChromeStorageAdapter();
      const settingsRepository = new SettingsRepository(storageAdapter);
      const gestureRepository = new GestureRepository(storageAdapter);
      
      this.customGestureUseCase = new CustomGestureManagementUseCase(
        gestureRepository,
        settingsRepository
      );

    } catch (error) {
      console.warn('GestureRecognizer initialization failed:', error);
    }
  }

  /**
   * ジェスチャー認識と実行
   */
  async recognizeAndExecute(trail: Point[]): Promise<GestureRecognitionResult> {
    try {
      // 1. カスタムジェスチャー認識を優先
      const customResult = await this.recognizeCustomGesture(trail);
      if (customResult.type === 'custom' && customResult.action) {
        // カスタムジェスチャーも無効化チェックを実行
        if (!this.settingsManager.isGestureEnabled(customResult.action)) {
          console.log(`Custom gesture ${customResult.action} is disabled`);
          return { type: 'custom', action: undefined };
        }
        await this.executeAction(customResult.action);
        return customResult;
      }

      // 2. 標準ジェスチャー認識
      const standardResult = this.recognizeStandardGesture(trail);
      if (standardResult.type !== 'simple' || !standardResult.action) {
        return { type: 'simple', action: undefined };
      }

      // 3. ジェスチャーが有効かチェック
      if (!this.settingsManager.isGestureEnabled(standardResult.action)) {
        console.log(`Gesture ${standardResult.action} is disabled`);
        return { type: 'simple', action: undefined };
      }

      // 4. アクション実行
      await this.executeAction(standardResult.action);
      return standardResult;

    } catch (error) {
      console.error('Gesture recognition failed:', error);
      return { type: 'simple', action: undefined };
    }
  }

  /**
   * カスタムジェスチャー認識
   */
  private async recognizeCustomGesture(trail: Point[]): Promise<GestureRecognitionResult> {
    if (!this.customGestureUseCase) {
      return { type: 'custom', action: undefined };
    }

    try {
      // PointをRawPointに変換
      const rawPoints = trail.map(point => ({ x: point.x, y: point.y }));
      const result = await this.customGestureUseCase.matchPattern(rawPoints);
      
      if (result.match && result.match.action) {
        return {
          type: 'custom',
          action: result.match.action,
          name: result.match.name,
          confidence: result.confidence
        };
      }
    } catch (error) {
      console.warn('Custom gesture recognition failed:', error);
    }

    return { type: 'custom', action: undefined };
  }

  /**
   * 標準ジェスチャー認識
   */
  private recognizeStandardGesture(trail: Point[]): GestureRecognitionResult {
    if (!this.gestureRecognizer) {
      return { type: 'simple', action: undefined };
    }

    try {
      const gestureType = this.gestureRecognizer.recognizeGesture(trail);
      
      if (!gestureType) {
        return { type: 'simple', action: undefined };
      }

      // GestureTypeをアクション名に変換
      const action = this.convertGestureTypeToAction(gestureType);
      
      return {
        type: this.isComplexGesture(gestureType) ? 'complex' : 'simple',
        action: action,
        confidence: 0.8 // 固定値
      };
    } catch (error) {
      console.warn('Standard gesture recognition failed:', error);
      return { type: 'simple', action: undefined };
    }
  }


  /**
   * アクション実行
   */
  private async executeAction(action: string): Promise<void> {
    try {
      const message = { action };
      await chrome.runtime.sendMessage(message);
    } catch (error) {
      console.warn('Action execution failed:', error);
    }
  }

  /**
   * GestureTypeをアクション名に変換
   */
  private convertGestureTypeToAction(gestureType: string): string {
    const gestureMapping: { [key: string]: string } = {
      'LEFT': 'back',
      'RIGHT': 'forward',
      'UP': 'scroll_top',
      'DOWN': 'scroll_bottom',
      'downright': 'close_tab',
      'upright': 'new_tab',
      'rightdown': 'duplicate_tab',
      'updown': 'refresh',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab'
    };
    
    return gestureMapping[gestureType] || gestureType;
  }

  /**
   * 複合ジェスチャーかどうか判定
   */
  private isComplexGesture(gestureType: string): boolean {
    const complexGestures = ['downright', 'upright', 'rightdown', 'updown', 'super_refresh', 'prev_tab', 'next_tab'];
    return complexGestures.includes(gestureType);
  }

  /**
   * 設定更新
   */
  updateSettings(): void {
    // SettingsManagerから設定を再読み込み
    // 現在の実装では特に処理不要
  }
}