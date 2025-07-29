/**
 * ジェスチャー一覧管理ユースケース
 * Application層 - ビジネスロジックの調整
 */

import { Gesture } from '../../domain/entities/Gesture.js';
import { CustomGesture } from '../../domain/entities/CustomGesture.js';
import { Settings } from '../../domain/entities/Settings.js';

interface GestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>;
}

interface SettingsRepository {
  getSettings(): Promise<Settings>;
}

interface GestureListItem {
  id: string;
  name: string;
  pattern: string;
  action: string;
  type: 'default' | 'custom';
  category: string;
  description: string;
  enabled: boolean;
}

export class GestureListUseCase {
  constructor(
    private gestureRepository: GestureRepository,
    private settingsRepository: SettingsRepository
  ) {}

  /**
   * 全ジェスチャー（デフォルト + カスタム）を取得
   */
  async getAllGestures(): Promise<GestureListItem[]> {
    try {
      // デフォルトジェスチャーを取得
      const defaultGestures = await this.getDefaultGestures();
      
      // カスタムジェスチャーを取得
      const customGestures = await this.gestureRepository.getCustomGestures();
      
      // 統一形式に変換
      const allGestures: GestureListItem[] = [
        ...defaultGestures,
        ...customGestures.map(g => ({
          id: g.id,
          name: g.name,
          pattern: g.pattern.toString(),
          action: g.action,
          type: 'custom' as const,
          category: 'custom',
          description: (g as any).description || '',
          enabled: g.enabled
        }))
      ];
      
      return allGestures;
      
    } catch (error) {
      console.error('🚨 GestureListUseCase: Failed to load gestures:', error);
      throw new Error(`Failed to load gesture list: ${(error as Error).message}`);
    }
  }

  /**
   * デフォルトジェスチャーを状態込みで取得
   */
  async getDefaultGestures(): Promise<GestureListItem[]> {
    const settings = await this.settingsRepository.getSettings();
    const gestureStates = settings.defaultGestureStates;
    
    return [
      // 基本ジェスチャー
      {
        id: 'left',
        name: 'ブラウザの戻る',
        pattern: '←',
        action: 'back',
        type: 'default' as const,
        category: 'basic',
        description: 'ブラウザの前のページに戻る',
        enabled: gestureStates.left
      },
      {
        id: 'right',
        name: 'ブラウザの進む',
        pattern: '→',
        action: 'forward',
        type: 'default' as const,
        category: 'basic',
        description: 'ブラウザの次のページに進む',
        enabled: gestureStates.right
      },
      {
        id: 'up',
        name: 'ページ最上部スクロール',
        pattern: '↑',
        action: 'scroll_top',
        type: 'default' as const,
        category: 'basic',
        description: 'ページの最上部にスクロール',
        enabled: gestureStates.up
      },
      {
        id: 'down',
        name: 'ページ最下部スクロール',
        pattern: '↓',
        action: 'scroll_bottom',
        type: 'default' as const,
        category: 'basic',
        description: 'ページの最下部にスクロール',
        enabled: gestureStates.down
      },
      // 複合ジェスチャー
      {
        id: 'downright',
        name: 'タブを閉じる',
        pattern: '↓→',
        action: 'close_tab',
        type: 'default' as const,
        category: 'tab',
        description: '現在のタブを閉じる',
        enabled: gestureStates.downright
      },
      {
        id: 'upright',
        name: '新しいタブを開く',
        pattern: '↑→',
        action: 'new_tab',
        type: 'default' as const,
        category: 'tab',
        description: '新しいタブを開く',
        enabled: gestureStates.upright
      },
      {
        id: 'rightdown',
        name: 'タブ複製',
        pattern: '→↓',
        action: 'duplicate_tab',
        type: 'default' as const,
        category: 'tab',
        description: '現在のタブを複製',
        enabled: gestureStates.rightdown
      },
      {
        id: 'updown',
        name: 'ページ更新',
        pattern: '↑↓',
        action: 'refresh',
        type: 'default' as const,
        category: 'page',
        description: 'ページを更新',
        enabled: gestureStates.updown
      },
      // Phase 10 新機能
      {
        id: 'super_refresh',
        name: 'スーパーリロード',
        pattern: '↑↓↑',
        action: 'super_refresh',
        type: 'default' as const,
        category: 'page',
        description: 'キャッシュクリア付きリロード',
        enabled: gestureStates.super_refresh
      },
      {
        id: 'prev_tab',
        name: '前のタブ',
        pattern: '←→',
        action: 'prev_tab',
        type: 'default' as const,
        category: 'tab',
        description: '前のタブに切り替え',
        enabled: gestureStates.prev_tab
      },
      {
        id: 'next_tab',
        name: '次のタブ',
        pattern: '→←',
        action: 'next_tab',
        type: 'default' as const,
        category: 'tab',
        description: '次のタブに切り替え',
        enabled: gestureStates.next_tab
      }
    ];
  }

  /**
   * 有効なジェスチャーのみを取得
   */
  async getEnabledGestures(): Promise<GestureListItem[]> {
    const allGestures = await this.getAllGestures();
    return allGestures.filter(gesture => gesture.enabled);
  }

  /**
   * カテゴリ別ジェスチャー取得
   */
  async getGesturesByCategory(category: string): Promise<GestureListItem[]> {
    const allGestures = await this.getAllGestures();
    return allGestures.filter(gesture => gesture.category === category);
  }

  /**
   * ジェスチャー統計情報を取得
   */
  async getGestureStats(): Promise<{
    total: number;
    enabled: number;
    default: number;
    custom: number;
    categories: Record<string, number>;
  }> {
    const allGestures = await this.getAllGestures();
    
    const stats = {
      total: allGestures.length,
      enabled: allGestures.filter(g => g.enabled).length,
      default: allGestures.filter(g => g.type === 'default').length,
      custom: allGestures.filter(g => g.type === 'custom').length,
      categories: {} as Record<string, number>
    };

    // カテゴリ別統計
    allGestures.forEach(gesture => {
      stats.categories[gesture.category] = (stats.categories[gesture.category] || 0) + 1;
    });

    return stats;
  }
}