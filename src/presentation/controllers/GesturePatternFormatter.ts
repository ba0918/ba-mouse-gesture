/**
 * GesturePatternFormatter
 * ジェスチャーパターンの表示・フォーマット処理専用クラス
 * Clean Architecture - Presentation層
 */

// 型定義
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'up' | 'down' | 'left' | 'right' | 'U' | 'D' | 'L' | 'R';
type Arrow = '↑' | '↓' | '←' | '→';

interface DirectionMap {
  [key: string]: Arrow;
}

interface ActionDisplayNames {
  [key: string]: string;
}

interface GesturePattern {
  _directions?: Direction[];
  toString?: () => string;
}

interface CategoryInfo {
  name: string;
  gestures: any[];
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
   * パターンを矢印表記に変換
   * @param pattern - ジェスチャーパターン（文字列、配列、オブジェクト）
   * @param maxLength - 最大表示長（省略表示用）
   * @returns 矢印表記のパターン
   */
  formatPatternToArrows(pattern: any, maxLength: number = 8): string {
    let arrowPattern = '';
    
    if (typeof pattern === 'string') {
      // 既に矢印文字列の場合はそのまま返す
      if (/^[↑↓←→]+$/.test(pattern)) {
        arrowPattern = pattern;
      } else if (pattern.includes(',')) {
        // カンマ区切りの場合は分割して処理
        arrowPattern = pattern
          .split(',')
          .map(dir => dir.trim())
          .map(dir => this.directionToArrow(dir))
          .join('');
      } else {
        // 英語方向文字列の場合は変換
        arrowPattern = pattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→');
      }
    } else if (Array.isArray(pattern)) {
      // 配列パターンの処理
      arrowPattern = pattern
        .map(dir => this.directionToArrow(dir))
        .join('');
    } else if (pattern && typeof pattern === 'object' && (pattern as GesturePattern)._directions && Array.isArray((pattern as GesturePattern)._directions)) {
      // GesturePatternオブジェクトの処理
      arrowPattern = (pattern as GesturePattern)._directions!
        .map(dir => this.directionToArrow(dir))
        .join('');
    } else if (pattern && typeof pattern.toString === 'function') {
      // その他のオブジェクトでtoStringメソッドがある場合
      const stringPattern = pattern.toString();
      if (/^[↑↓←→]+$/.test(stringPattern)) {
        arrowPattern = stringPattern;
      } else {
        arrowPattern = stringPattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→');
      }
    } else {
      arrowPattern = String(pattern || '');
    }
    
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
  directionToArrow(direction: any): string {
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
    const actionNames: ActionDisplayNames = {
      back: 'ブラウザの戻る',
      forward: 'ブラウザの進む',
      scroll_top: 'ページ最上部スクロール',
      scroll_bottom: 'ページ最下部スクロール',
      close_tab: 'タブを閉じる',
      new_tab: '新しいタブを開く',
      duplicate_tab: 'タブ複製',
      refresh: 'ページ更新',
      hard_refresh: 'スーパーリロード',
      super_refresh: 'スーパーリロード（キャッシュクリア付き）',
      prev_tab: '前のタブに切り替え',
      next_tab: '次のタブに切り替え',
      
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
    
    return actionNames[action] || action;
  }

  /**
   * ジェスチャーをカテゴリ別に分類
   * @param gestures - ジェスチャー配列
   * @returns カテゴリ別のジェスチャー
   */
  groupGesturesByCategory(gestures: any[]): GestureCategories {
    const categories: GestureCategories = {
      navigation: { name: 'ナビゲーション', gestures: [] },
      tabs: { name: 'タブ操作', gestures: [] },
      page: { name: 'ページ操作', gestures: [] },
      custom: { name: 'カスタム', gestures: [] }
    };

    gestures.forEach(gesture => {
      const action = gesture.action;
      
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
  calculatePatternComplexity(pattern: any): number {
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
  type GesturePattern,
  type CategoryInfo,
  type GestureCategories,
  type ArrowMap
};