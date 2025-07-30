/**
 * ジェスチャー一覧管理ユースケース
 * Application層 - ビジネスロジックの調整
 */

import { CustomGesture } from '../../domain/entities/CustomGesture.js';
import { Settings } from '../../domain/entities/Settings.js';
import { DefaultGestureDefinitions, GestureListItem } from '../../domain/definitions/DefaultGestureDefinitions.js';
import { GesturePattern } from '../../domain/valueObjects/GesturePattern.js';
import { GesturePatternFormatter } from '../../presentation/controllers/GesturePatternFormatter.js';

interface GestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>;
}

interface SettingsRepository {
  getSettings(): Promise<Settings>;
}

// GestureListItemはドメイン層から継承

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
            // 統一パターン変換メソッドを使用（ドメイン層）
            cleanPattern = GesturePattern.normalizePattern(g.pattern);
          } catch (error) {
            console.error('🚨 Pattern conversion error for gesture:', g.id, error);
            cleanPattern = '?';
          }

          console.log('✅ UNIFIED - Pattern normalized:', {
            gestureId: g.id,
            originalPattern: g.pattern,
            normalizedPattern: cleanPattern
          });

          // アクション名を日本語で取得
          const actionDescription = this.patternFormatter.getActionDisplayName(g.action);

          const gestureItem = {
            id: g.id,
            name: g.name,
            pattern: cleanPattern,
            action: g.action,
            type: 'custom' as const,
            category: 'custom',
            description: actionDescription,
            enabled: g.enabled
          };
          
          console.log('🔍 Debug - Custom gesture item created:', gestureItem);
          return gestureItem;
        })
      ];

      console.log('✅ FIXED - All gestures with correct ID/action mapping:');
      allGestures.slice(0, 3).forEach((gesture, index) => {
        console.log(`  [${index}] id: "${gesture.id}", action: "${gesture.action}", enabled: ${gesture.enabled}`);
      });
      
      return allGestures;

    } catch (error) {
      console.error('🚨 GestureListUseCase: Failed to load gestures:', error);
      throw new Error(`Failed to load gesture list: ${(error as Error).message}`);
    }
  }

  /**
   * デフォルトジェスチャーを状態込みで取得（統一定義使用）
   */
  async getDefaultGestures(): Promise<GestureListItem[]> {
    const settings = await this.settingsRepository.getSettings();
    const gestureStates = settings.defaultGestureStates;
    
    console.log('🔍 Debug - Default gesture states loaded:', gestureStates);

    // 統一定義から状態付きジェスチャーリストを生成
    const defaultGestures = DefaultGestureDefinitions.createGestureListItems(gestureStates as unknown as Record<string, boolean>);
    
    console.log('✅ UNIFIED - Default gestures from central definition:');
    defaultGestures.slice(0, 3).forEach((gesture, index) => {
      console.log(`  [${index}] id: "${gesture.id}", action: "${gesture.action}", enabled: ${gesture.enabled}`);
    });
    
    return defaultGestures;
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