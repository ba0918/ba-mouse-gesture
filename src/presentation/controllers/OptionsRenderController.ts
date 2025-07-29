/**
 * OptionsRenderController
 * 設定画面の描画・HTML生成専用クラス
 * Clean Architecture - Presentation層
 */

// 必要な型インポート
import type { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import type { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase';
import type { GestureListUseCase } from '../../application/usecases/GestureListUseCase';
import type { CustomGesture } from '../../domain/entities/CustomGesture';
import type { Gesture } from '../../domain/entities/Gesture';

// 型定義
interface OptionsRenderControllerDependencies {
  settingsUseCase: SettingsManagementUseCase;
  customGestureUseCase: CustomGestureManagementUseCase;
  gestureListUseCase: GestureListUseCase;
  patternFormatter: GesturePatternFormatter;
  showStatus: (message: string, type?: string, duration?: number) => void;
}

interface GesturePatternFormatter {
  formatPatternToArrows(pattern: any, maxLength?: number): string;
  getActionDisplayName(action: string): string;
}

interface GestureDisplayInfo {
  id: string;
  name: string;
  pattern: any;
  action: string;
  enabled: boolean;
  category?: string;
  isNew?: boolean;
  getFormattedPattern?: (maxLength: number) => string;
  getActionDisplayName?: () => string;
}

interface GestureCategories {
  [categoryName: string]: GestureDisplayInfo[];
}

type EditHandler = (gestureId: string) => void;
type ConfirmHandler = (message: string) => Promise<boolean>;

class OptionsRenderController {
  private readonly settingsUseCase: SettingsManagementUseCase;
  private readonly customGestureUseCase: CustomGestureManagementUseCase;
  private readonly gestureListUseCase: GestureListUseCase;
  private readonly patternFormatter: GesturePatternFormatter;
  private readonly showStatus: (message: string, type?: string, duration?: number) => void;
  
  // 外部ハンドラー
  private editCustomGesture?: EditHandler;
  private showConfirmDialog?: ConfirmHandler;
  
  // 外部レンダリングコールバック
  public externalRenderCustomGestureList?: () => Promise<void>;
  public externalRenderGestureList?: () => Promise<void>;

  /**
   * @param dependencies - 依存関係
   */
  constructor(dependencies: OptionsRenderControllerDependencies) {
    this.settingsUseCase = dependencies.settingsUseCase;
    this.customGestureUseCase = dependencies.customGestureUseCase;
    this.gestureListUseCase = dependencies.gestureListUseCase;
    this.patternFormatter = dependencies.patternFormatter;
    this.showStatus = dependencies.showStatus;
  }

  /**
   * ジェスチャー一覧を描画
   */
  async renderGestureList(): Promise<void> {
    try {
      const gestures = await this.gestureListUseCase.getAllGestures();
      const listElement = document.getElementById('allGesturesList');
      
      if (!listElement) return;

      const html = this.buildGestureListHTML(gestures as any);
      listElement.innerHTML = html;
      // イベント設定は OptionsEventController でドキュメントレベルのイベントデリゲーションで処理

    } catch (error) {
      console.error('ジェスチャー一覧表示エラー:', error);
      this.showStatus('ジェスチャー一覧の表示に失敗しました', 'error');
    }
  }

  /**
   * カスタムジェスチャー一覧を描画
   */
  async renderCustomGestureList(): Promise<void> {
    try {
      const customGestures = await this.customGestureUseCase.getAllCustomGestures();
      const listElement = document.getElementById('customGestureList');
      
      if (!listElement) return;

      const html = this.buildCustomGestureListHTML(customGestures);
      listElement.innerHTML = html;
      // イベント設定は OptionsEventController でドキュメントレベルのイベントデリゲーションで処理

    } catch (error) {
      console.error('カスタムジェスチャー一覧表示エラー:', error);
      this.showStatus('カスタムジェスチャー一覧の表示に失敗しました', 'error');
    }
  }

  /**
   * 除外サイト一覧を描画
   */
  async renderExcludeList(): Promise<void> {
    try {
      const settings = await this.settingsUseCase.getCurrentSettings();
      const excludedSites = settings.getExcludeList();
      const listElement = document.getElementById('excludeList');
      
      if (!listElement) return;

      if (excludedSites.length === 0) {
        listElement.innerHTML = '<div style="text-align: center; color: #5f6368; padding: 16px;">除外サイトが設定されていません</div>';
        return;
      }

      let html = '';
      excludedSites.forEach(pattern => {
        html += `
          <div class="exclude-item">
            <span class="exclude-pattern">${this.escapeHtml(pattern)}</span>
            <button class="remove-exclude-btn" data-pattern="${this.escapeHtml(pattern)}">削除</button>
          </div>
        `;
      });

      listElement.innerHTML = html;

    } catch (error) {
      console.error('除外サイト一覧表示エラー:', error);
      this.showStatus('除外サイト一覧の表示に失敗しました', 'error');
    }
  }

  /**
   * ジェスチャー一覧のHTMLを生成
   * @param gestures - ジェスチャー配列
   * @returns HTML文字列
   */
  buildGestureListHTML(gestures: Gesture[]): string {
    let html = '';
    
    const categories = this.groupGesturesByCategory(gestures as GestureDisplayInfo[]);
    
    Object.entries(categories).forEach(([categoryName, categoryGestures]) => {
      if (categoryGestures.length > 0) {
        html += `<div class="gesture-category"><div class="category-header">${categoryName} (${categoryGestures.length})</div>`;
        
        categoryGestures.forEach(gesture => {
          const pattern = gesture.getFormattedPattern ? gesture.getFormattedPattern(8) : this.patternFormatter.formatPatternToArrows(gesture.pattern, 8);
          
          html += `
            <div class="all-gesture-item ${gesture.enabled ? '' : 'disabled'}">
              <div class="gesture-pattern">${pattern}</div>
              <div class="gesture-info">
                <div class="gesture-name">${gesture.name}${gesture.isNew ? ' <span class="new-badge">NEW</span>' : ''}</div>
                <div class="gesture-description">${gesture.getActionDisplayName ? gesture.getActionDisplayName() : this.patternFormatter.getActionDisplayName(gesture.action)}</div>
              </div>
              <div class="gesture-actions">
                <label class="switch">
                  <input type="checkbox" data-gesture-id="${gesture.id}" ${gesture.enabled ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          `;
        });
        
        html += '</div>';
      }
    });
    
    return html || '<div style="padding: 32px; text-align: center; color: #5f6368;">表示するジェスチャーがありません</div>';
  }

  /**
   * カスタムジェスチャー一覧のHTMLを生成
   * @param customGestures - カスタムジェスチャー配列
   * @returns HTML文字列
   */
  buildCustomGestureListHTML(customGestures: CustomGesture[]): string {
    if (customGestures.length === 0) {
      return `
        <div style="padding: 24px; text-align: center; color: #5f6368;">
          <div style="font-size: 14px; margin-bottom: 8px;">カスタムジェスチャーがありません</div>
          <div style="font-size: 12px;">下のフォームから新しいジェスチャーを追加してください</div>
        </div>
      `;
    }

    let html = '';
    customGestures.forEach(gesture => {
      // パターンを矢印表記に統一変換
      const formattedPattern = this.patternFormatter.formatPatternToArrows(gesture.pattern, 8);
      const actionDisplayName = this.patternFormatter.getActionDisplayName(gesture.action);
      
      html += `
        <div class="gesture-item ${gesture.enabled ? '' : 'disabled'}">
          <div class="gesture-info">
            <div class="gesture-name">${this.escapeHtml(gesture.name)}</div>
            <div>
              <span class="gesture-pattern">${formattedPattern}</span>
              <span class="gesture-action">${actionDisplayName}</span>
            </div>
          </div>
          <div class="gesture-controls">
            <label class="switch">
              <input type="checkbox" data-gesture-id="${gesture.id}" ${gesture.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <button class="edit-btn" data-gesture-id="${gesture.id}">編集</button>
            <button class="delete-btn" data-gesture-id="${gesture.id}">削除</button>
          </div>
        </div>
      `;
    });

    return html;
  }

  /**
   * ジェスチャーをカテゴリ別に分類
   * @param gestures - ジェスチャー配列
   * @returns カテゴリ別のジェスチャー
   */
  private groupGesturesByCategory(gestures: GestureDisplayInfo[]): GestureCategories {
    const categories: GestureCategories = {
      '標準ジェスチャー': [],
      'カスタムジェスチャー': []
    };

    gestures.forEach(gesture => {
      if (gesture.category === 'custom' || gesture.id.startsWith('custom_')) {
        categories['カスタムジェスチャー'].push(gesture);
      } else {
        categories['標準ジェスチャー'].push(gesture);
      }
    });

    return categories;
  }

  /**
   * HTMLエスケープ
   * @param text - エスケープ対象文字列
   * @returns エスケープ済み文字列
   */
  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 確認ダイアログの表示（外部から注入される）
   * @param message - 確認メッセージ
   * @returns 確認結果
   */
  async showConfirm(message: string): Promise<boolean> {
    if (this.showConfirmDialog) {
      return this.showConfirmDialog(message);
    }
    // フォールバック
    return confirm(message);
  }

  /**
   * 外部ハンドラーの設定
   * @param editHandler - 編集ハンドラー
   * @param confirmHandler - 確認ダイアログハンドラー
   */
  setExternalHandlers(editHandler: EditHandler, confirmHandler: ConfirmHandler): void {
    this.editCustomGesture = editHandler;
    this.showConfirmDialog = confirmHandler;
  }
}

// ES6 Module export
export { 
  OptionsRenderController,
  type OptionsRenderControllerDependencies,
  type GesturePatternFormatter,
  type GestureDisplayInfo,
  type GestureCategories,
  type EditHandler,
  type ConfirmHandler
};