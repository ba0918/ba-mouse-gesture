/**
 * DefaultGestureDefinitions
 * デフォルトジェスチャーの統一定義（ドメイン層）
 *
 * Clean Architecture原則：
 * - ドメイン層で業務ルールを一元管理
 * - DRY原則：重複を排除し、単一の情報源（Single Source of Truth）を確立
 * - OCP原則：新しいジェスチャー追加時の既存コード変更を最小化
 */

import { ActionName } from '../types';

export interface GestureDefinition {
  id: string; // ジェスチャーID（内部管理用）
  name: string; // 表示名
  pattern: string; // パターン表示（矢印）
  action: ActionName; // アクション名（実行処理用）
  category: string; // カテゴリ
  description: string; // 説明
}

export interface GestureListItem extends GestureDefinition {
  type: 'default' | 'custom';
  enabled: boolean;
}

/**
 * デフォルトジェスチャー定義の中央管理クラス
 */
export class DefaultGestureDefinitions {
  /**
   * すべてのデフォルトジェスチャー定義（マスターデータ）
   */
  private static readonly GESTURE_DEFINITIONS: readonly GestureDefinition[] = [
    // 基本ジェスチャー（方向キーベース）
    {
      id: 'left',
      name: 'ブラウザの戻る',
      pattern: '←',
      action: 'back',
      category: 'basic',
      description: 'ブラウザの前のページに戻る',
    },
    {
      id: 'right',
      name: 'ブラウザの進む',
      pattern: '→',
      action: 'forward',
      category: 'basic',
      description: 'ブラウザの次のページに進む',
    },
    {
      id: 'up',
      name: 'ページ最上部スクロール',
      pattern: '↑',
      action: 'scroll_top',
      category: 'basic',
      description: 'ページの最上部にスクロール',
    },
    {
      id: 'down',
      name: 'ページ最下部スクロール',
      pattern: '↓',
      action: 'scroll_bottom',
      category: 'basic',
      description: 'ページの最下部にスクロール',
    },

    // 複合ジェスチャー（組み合わせベース）
    {
      id: 'downright',
      name: 'タブを閉じる',
      pattern: '↓→',
      action: 'close_tab',
      category: 'tab',
      description: '現在のタブを閉じる',
    },
    {
      id: 'upright',
      name: '新しいタブを開く',
      pattern: '↑→',
      action: 'new_tab',
      category: 'tab',
      description: '新しいタブを開く',
    },
    {
      id: 'rightdown',
      name: 'タブ複製',
      pattern: '→↓',
      action: 'duplicate_tab',
      category: 'tab',
      description: '現在のタブを複製',
    },
    {
      id: 'updown',
      name: 'ページ更新',
      pattern: '↑↓',
      action: 'refresh',
      category: 'page',
      description: 'ページを更新',
    },

    // Phase 10 新機能（高度な機能）
    {
      id: 'super_refresh',
      name: 'スーパーリロード（キャッシュクリア付き）',
      pattern: '↑↓↑',
      action: 'super_refresh',
      category: 'page',
      description: 'キャッシュクリア付きリロード',
    },
    {
      id: 'prev_tab',
      name: '前のタブに切り替え',
      pattern: '←→',
      action: 'prev_tab',
      category: 'tab',
      description: '前のタブに切り替え',
    },
    {
      id: 'next_tab',
      name: '次のタブに切り替え',
      pattern: '→←',
      action: 'next_tab',
      category: 'tab',
      description: '次のタブに切り替え',
    },
  ] as const;

  /**
   * すべてのデフォルトジェスチャー定義を取得
   */
  static getAllDefinitions(): readonly GestureDefinition[] {
    return this.GESTURE_DEFINITIONS;
  }

  /**
   * 特定のジェスチャーIDの定義を取得
   */
  static getDefinitionById(gestureId: string): GestureDefinition | undefined {
    return this.GESTURE_DEFINITIONS.find((def) => def.id === gestureId);
  }

  /**
   * 特定のアクション名の定義を取得
   */
  static getDefinitionByAction(action: ActionName): GestureDefinition | undefined {
    return this.GESTURE_DEFINITIONS.find((def) => def.action === action);
  }

  /**
   * カテゴリ別のジェスチャー定義を取得
   */
  static getDefinitionsByCategory(category: string): readonly GestureDefinition[] {
    return this.GESTURE_DEFINITIONS.filter((def) => def.category === category);
  }

  /**
   * 状態と組み合わせたジェスチャーリストアイテムを生成
   */
  static createGestureListItems(gestureStates: Record<string, boolean>): GestureListItem[] {
    return this.GESTURE_DEFINITIONS.map((definition) => ({
      ...definition,
      type: 'default' as const,
      enabled: gestureStates[definition.id] !== false, // デフォルトは有効
    }));
  }

  /**
   * 有効なジェスチャーIDの一覧を取得（バリデーション用）
   */
  static getValidGestureIds(): readonly string[] {
    return this.GESTURE_DEFINITIONS.map((def) => def.id);
  }

  /**
   * アクション名とジェスチャーIDのマッピングを取得
   */
  static getActionToIdMapping(): Record<ActionName, string> {
    const mapping: Record<ActionName, string> = {} as Record<ActionName, string>;
    this.GESTURE_DEFINITIONS.forEach((def) => {
      mapping[def.action] = def.id;
    });
    return mapping;
  }

  /**
   * ジェスチャーIDとアクション名のマッピングを取得
   */
  static getIdToActionMapping(): Record<string, ActionName> {
    const mapping: Record<string, ActionName> = {} as Record<string, ActionName>;
    this.GESTURE_DEFINITIONS.forEach((def) => {
      mapping[def.id] = def.action;
    });
    return mapping;
  }

  /**
   * アクション名の日本語表示名マッピングを取得
   */
  static getActionDisplayNames(): Record<ActionName, string> {
    const mapping: Record<ActionName, string> = {} as Record<ActionName, string>;
    this.GESTURE_DEFINITIONS.forEach((def) => {
      mapping[def.action] = def.name;
    });
    return mapping;
  }
}
