/**
 * GesturePatternFormatter
 * ジェスチャーパターンの表示・フォーマット処理専用クラス
 * Clean Architecture - Presentation層
 */

import { DefaultGestureDefinitions } from '../../domain/definitions/DefaultGestureDefinitions';
import { GesturePattern as DomainGesturePattern } from '../../domain/valueObjects/GesturePattern';

// 型定義
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'up' | 'down' | 'left' | 'right' | 'U' | 'D' | 'L' | 'R';
type Arrow = '↑' | '↓' | '←' | '→';

interface DirectionMap {
  [key: string]: Arrow;
}

interface ActionDisplayNames {
  [key: string]: string;
}

interface LegacyGesturePattern {
  _directions?: Direction[];
  toString?: () => string;
}

interface CategoryInfo {
  name: string;
  gestures: unknown[];
}

interface GestureCategories {
  navigation: CategoryInfo;
  tabs: CategoryInfo;
  page: CategoryInfo;
  custom: CategoryInfo;
}

interface ArrowMap {
  UP: Arrow;
  DOWN: Arrow;
  LEFT: Arrow;
  RIGHT: Arrow;
}

class GesturePatternFormatter {
  /**
   * パターンを矢印表記に変換（統一メソッド使用）
   * @param pattern - ジェスチャーパターン（文字列、配列、オブジェクト）
   * @param maxLength - 最大表示長（省略表示用）
   * @returns 矢印表記のパターン
   */
  formatPatternToArrows(pattern: unknown, maxLength: number = 8): string {
    // ドメイン層の統一変換メソッドを使用
    const arrowPattern = DomainGesturePattern.normalizePattern(pattern);
    
    // 長すぎる場合は省略表示
    if (maxLength > 1 && arrowPattern.length > maxLength) {
      return arrowPattern.substring(0, maxLength - 1) + '…';
    }
    
    return arrowPattern;
  }

  /**
   * 方向文字列を矢印に変換
   * @param direction - 方向文字列
   * @returns 矢印文字
   */
  directionToArrow(direction: unknown): string {
    // 既に矢印の場合はそのまま
    if (typeof direction === 'string' && /^[↑↓←→]$/.test(direction)) {
      return direction;
    }
    
    const directionMap: DirectionMap = {
      'UP': '↑', 'up': '↑', 'U': '↑',
      'DOWN': '↓', 'down': '↓', 'D': '↓',
      'LEFT': '←', 'left': '←', 'L': '←',
      'RIGHT': '→', 'right': '→', 'R': '→'
    };
    
    return directionMap[String(direction)] || String(direction);
  }

  /**
   * アクションの表示名を取得
   * @param action - アクション名
   * @returns 表示用アクション名
   */
  getActionDisplayName(action: string): string {
    // 統一定義からアクション表示名を取得
    const unifiedActionNames = DefaultGestureDefinitions.getActionDisplayNames();
    
    // 統一定義にない場合は拡張定義を使用
    const additionalActionNames: ActionDisplayNames = {
      // 追加のアクション名（将来拡張用）
      bookmark: 'ブックマーク追加',
      zoom_in: '拡大',
      zoom_out: '縮小',
      zoom_reset: 'ズームリセット',
      devtools: '開発者ツール',
      view_source: 'ソース表示',
      print: '印刷',
      find: '検索',
      fullscreen: 'フルスクリーン'
    };
    
    return unifiedActionNames[action] || additionalActionNames[action] || action;
  }

  /**
   * ジェスチャーをカテゴリ別に分類
   * @param gestures - ジェスチャー配列
   * @returns カテゴリ別のジェスチャー
   */
  groupGesturesByCategory(gestures: unknown[]): GestureCategories {
    const categories: GestureCategories = {
      navigation: { name: 'ナビゲーション', gestures: [] },
      tabs: { name: 'タブ操作', gestures: [] },
      page: { name: 'ページ操作', gestures: [] },
      custom: { name: 'カスタム', gestures: [] }
    };

    gestures.forEach(gesture => {
      const gestureItem = gesture as { action: string };
      const action = gestureItem.action;
      
      if (['back', 'forward'].includes(action)) {
        categories.navigation.gestures.push(gesture);
      } else if (['close_tab', 'new_tab', 'duplicate_tab', 'prev_tab', 'next_tab'].includes(action)) {
        categories.tabs.gestures.push(gesture);
      } else if (['scroll_top', 'scroll_bottom', 'refresh', 'hard_refresh'].includes(action)) {
        categories.page.gestures.push(gesture);
      } else {
        categories.custom.gestures.push(gesture);
      }
    });

    return categories;
  }

  /**
   * パターン表示用の矢印マップを取得
   * @returns 方向→矢印のマップ
   */
  getArrowMap(): ArrowMap {
    return {
      'UP': '↑',
      'DOWN': '↓', 
      'LEFT': '←',
      'RIGHT': '→'
    };
  }

  /**
   * パターンの複雑度を計算
   * @param pattern - ジェスチャーパターン
   * @returns 複雑度スコア（1-5）
   */
  calculatePatternComplexity(pattern: unknown): number {
    const arrowPattern = this.formatPatternToArrows(pattern);
    const length = arrowPattern.length;
    
    if (length <= 1) return 1;
    if (length <= 2) return 2;
    if (length <= 4) return 3;
    if (length <= 6) return 4;
    return 5;
  }
}

// ES6 Module export
export { 
  GesturePatternFormatter,
  type Direction,
  type Arrow,
  type DirectionMap,
  type ActionDisplayNames,
  type LegacyGesturePattern,
  type CategoryInfo,
  type GestureCategories,
  type ArrowMap
};