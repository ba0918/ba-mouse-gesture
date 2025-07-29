/**
 * ジェスチャー一覧管理ユースケース
 * Application層 - ビジネスロジックの調整
 */

import { CustomGesture } from '../../domain/entities/CustomGesture.js';
import { Settings } from '../../domain/entities/Settings.js';
import { GesturePatternFormatter } from '../../presentation/controllers/GesturePatternFormatter.js';

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
  private patternFormatter: GesturePatternFormatter;

  constructor(
    private gestureRepository: GestureRepository,
    private settingsRepository: SettingsRepository
  ) {
    this.patternFormatter = new GesturePatternFormatter();
  }

  /**
   * 全ジェスチャー（デフォルト + カスタム）を取得
   */
  async getAllGestures(): Promise<GestureListItem[]> {
    try {
      // デフォルトジェスチャーを取得
      const defaultGestures = await this.getDefaultGestures();

      // カスタムジェスチャーを取得
      const customGestures = await this.gestureRepository.getCustomGestures();

      console.log('🔍 Debug - Custom gestures raw data:', customGestures.map(g => ({
        id: g.id,
        name: g.name,
        pattern: g.pattern,
        patternType: typeof g.pattern,
        patternString: g.pattern?.toString ? g.pattern.toString() : String(g.pattern)
      })));

      // 統一形式に変換
      const allGestures: GestureListItem[] = [
        ...defaultGestures,
        ...customGestures.map(g => {
          let cleanPattern = '';
          try {
            // パターンの正しい変換を行う
            if (g.pattern && typeof g.pattern === 'object' && g.pattern.getDirections) {
              // GesturePatternオブジェクトの場合
              const directions = g.pattern.getDirections();
              cleanPattern = directions.map(dir => {
                switch (dir.toLowerCase()) {
                  case 'up': return '↑';
                  case 'down': return '↓';
                  case 'left': return '←';
                  case 'right': return '→';
                  default: return dir;
                }
              }).join('');
            } else if (g.pattern && typeof g.pattern === 'object' && g.pattern.toString) {
              // オブジェクトの場合はtoString()を使用
              const patternStr = g.pattern.toString();
              cleanPattern = patternStr
                .replace(/up/gi, '↑')
                .replace(/down/gi, '↓')
                .replace(/left/gi, '←')
                .replace(/right/gi, '→');
            } else if (Array.isArray(g.pattern)) {
              // 配列の場合
              cleanPattern = g.pattern.map(dir => {
                switch (String(dir).toLowerCase()) {
                  case 'up': return '↑';
                  case 'down': return '↓';
                  case 'left': return '←';
                  case 'right': return '→';
                  default: return String(dir);
                }
              }).join('');
            } else if (typeof g.pattern === 'string') {
              // 文字列の場合（区切り文字をクリーンアップ）
              const patternStr = g.pattern as string;
              if (patternStr.match(/^[↑↓←→]+$/)) {
                // 既に矢印形式の場合はそのまま使用
                cleanPattern = patternStr;
              } else if (patternStr.includes('→') && patternStr.match(/^[a-zA-Z→]+$/)) {
                // up→down→left→right のような形式（英単語と区切り文字のみの場合）
                cleanPattern = patternStr
                  .split('→')
                  .map((dir: string) => {
                    switch (dir.trim().toLowerCase()) {
                      case 'up': return '↑';
                      case 'down': return '↓';
                      case 'left': return '←';
                      case 'right': return '→';
                      default: return dir.trim();
                    }
                  })
                  .join('');
              } else {
                // その他の文字列形式を矢印に変換
                cleanPattern = patternStr
                  .replace(/up/gi, '↑')
                  .replace(/down/gi, '↓')
                  .replace(/left/gi, '←')
                  .replace(/right/gi, '→')
                  .replace(/→+/g, ''); // 余分な区切り文字を除去
              }
            } else {
              // その他の場合
              cleanPattern = this.patternFormatter.formatPatternToArrows(g.pattern);
            }
          } catch (error) {
            console.error('🚨 Pattern conversion error for gesture:', g.id, error);
            cleanPattern = '?';
          }

          console.log('🔍 Debug - Pattern conversion:', {
            gestureId: g.id,
            originalPattern: g.pattern,
            convertedPattern: cleanPattern
          });

          // アクション名を日本語で取得
          const actionDescription = this.patternFormatter.getActionDisplayName(g.action);

          return {
            id: g.id,
            name: g.name,
            pattern: cleanPattern,
            action: g.action,
            type: 'custom' as const,
            category: 'custom',
            description: actionDescription,
            enabled: g.enabled
          };
        })
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
    
    console.log('🔍 Debug - Default gesture states loaded:', gestureStates);

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