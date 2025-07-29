/**
 * GestureListView
 * ジェスチャー一覧のHTML描画専用クラス
 * Clean Architecture - Presentation層
 */

interface GestureItem {
  id: string;
  name: string;
  description: string;
  pattern: string | string[] | { _directions: string[] };
  enabled: boolean;
  category: string;
  getFormattedPattern?: (maxLength: number) => string;
}

interface GestureListViewOptions {
  onToggleGesture?: (gestureId: string, enabled: boolean) => void;
  onDeleteCustomGesture?: (gestureId: string) => void;
}

type FilterType = 'all' | 'enabled' | 'disabled' | 'custom' | 'default';
type ViewMode = 'list' | 'card';

export class GestureListView {
  private readonly onToggleGesture?: (gestureId: string, enabled: boolean) => void;
  private readonly onDeleteCustomGesture?: (gestureId: string) => void;
  private searchQuery: string = '';

  /**
   * @param options - 設定オプション
   */
  constructor(options: GestureListViewOptions = {}) {
    this.onToggleGesture = options.onToggleGesture;
    this.onDeleteCustomGesture = options.onDeleteCustomGesture;
  }

  /**
   * ジェスチャー一覧を描画
   * @param gestures - ジェスチャー配列
   * @param filter - フィルター条件
   * @param searchQuery - 検索クエリ
   * @param viewMode - 表示モード
   * @returns 生成されたHTML
   */
  renderGestures(gestures: GestureItem[], filter: FilterType = 'all', searchQuery: string = '', viewMode: ViewMode = 'list'): string {
    console.log('🔧 GestureListView: Rendering gestures');
    
    this.searchQuery = searchQuery.toLowerCase();
    
    // フィルタリング
    const filteredGestures = gestures.filter(gesture => {
      // 検索フィルター
      if (this.searchQuery) {
        const matchesName = gesture.name.toLowerCase().includes(this.searchQuery);
        const matchesDescription = gesture.description.toLowerCase().includes(this.searchQuery);
        if (!matchesName && !matchesDescription) return false;
      }
      
      // ステータスフィルター
      if (filter === 'enabled') return gesture.enabled;
      if (filter === 'disabled') return !gesture.enabled;
      if (filter === 'custom') return gesture.category === 'custom';
      if (filter === 'default') return gesture.category !== 'custom';
      
      return true; // 'all'
    });

    if (filteredGestures.length === 0) {
      return this.renderEmptyState(filter, this.searchQuery);
    }

    // カテゴリ別にグループ化
    const groupedGestures = this.groupGesturesByCategory(filteredGestures);
    
    // HTML生成
    const html = Object.entries(groupedGestures)
      .map(([category, gestures]) => this.renderGestureCategory(category, gestures, viewMode))
      .join('');

    console.log('🔧 GestureListView: Gestures rendered successfully');
    return html;
  }

  /**
   * カテゴリ別ジェスチャーのHTML生成
   * @param category - カテゴリ名
   * @param gestures - ジェスチャー配列
   * @param viewMode - 表示モード
   * @returns カテゴリHTML
   */
  private renderGestureCategory(category: string, gestures: GestureItem[], viewMode: ViewMode = 'list'): string {
    const categoryNames: Record<string, string> = {
      basic: '基本ジェスチャー',
      advanced: '高度ジェスチャー',
      custom: 'カスタムジェスチャー'
    };
    
    const categoryName = categoryNames[category] || category;
    const itemsHtml = gestures.map(gesture => this.renderGestureItem(gesture, viewMode)).join('');
    
    return `
      <div class="gesture-category">
        <div class="category-header">${categoryName} (${gestures.length})</div>
        <div class="gesture-items ${viewMode}">
          ${itemsHtml}
        </div>
      </div>
    `;
  }

  /**
   * 個別ジェスチャーアイテムのHTML生成
   * @param gesture - ジェスチャーオブジェクト
   * @param viewMode - 表示モード
   * @returns アイテムHTML
   */
  private renderGestureItem(gesture: GestureItem, viewMode: ViewMode = 'list'): string {
    const highlightedName = this.highlightSearchText(gesture.name);
    const highlightedDescription = this.highlightSearchText(gesture.description);
    
    const patternDisplay = gesture.getFormattedPattern ? 
      gesture.getFormattedPattern(6) : 
      this.formatPattern(gesture.pattern);
    
    const isCustom = gesture.category === 'custom';
    const statusClass = gesture.enabled ? 'enabled' : 'disabled';
    
    if (viewMode === 'card') {
      return this.renderGestureCard(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom);
    }
    
    return this.renderGestureListItem(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom);
  }

  /**
   * リスト形式のジェスチャーアイテムHTML生成
   * @param gesture - ジェスチャーオブジェクト
   * @param highlightedName - ハイライト済み名前
   * @param highlightedDescription - ハイライト済み説明
   * @param patternDisplay - パターン表示
   * @param statusClass - ステータスクラス
   * @param isCustom - カスタムジェスチャーかどうか
   * @returns リストアイテムHTML
   */
  private renderGestureListItem(gesture: GestureItem, highlightedName: string, highlightedDescription: string, patternDisplay: string, statusClass: string, isCustom: boolean): string {
    const deleteButton = isCustom ? `
      <button class="delete-gesture-btn" data-gesture-id="${gesture.id}" title="削除">
        ✕
      </button>
    ` : '';
    
    return `
      <div class="gesture-item ${statusClass}" data-gesture-id="${gesture.id}">
        <div class="gesture-pattern" title="ジェスチャーパターン">
          ${patternDisplay}
        </div>
        <div class="gesture-info">
          <div class="gesture-name">${highlightedName}</div>
          <div class="gesture-description">${highlightedDescription}</div>
        </div>
        <div class="gesture-controls">
          <label class="switch" title="${gesture.enabled ? '無効にする' : '有効にする'}">
            <input type="checkbox" 
                   data-gesture-id="${gesture.id}" 
                   ${gesture.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          ${deleteButton}
        </div>
      </div>
    `;
  }

  /**
   * カード形式のジェスチャーアイテムHTML生成
   * @param gesture - ジェスチャーオブジェクト
   * @param highlightedName - ハイライト済み名前
   * @param highlightedDescription - ハイライト済み説明
   * @param patternDisplay - パターン表示
   * @param statusClass - ステータスクラス
   * @param isCustom - カスタムジェスチャーかどうか
   * @returns カードアイテムHTML
   */
  private renderGestureCard(gesture: GestureItem, highlightedName: string, highlightedDescription: string, patternDisplay: string, statusClass: string, isCustom: boolean): string {
    const deleteButton = isCustom ? `
      <button class="delete-gesture-btn card-delete" data-gesture-id="${gesture.id}" title="削除">
        ✕
      </button>
    ` : '';
    
    return `
      <div class="gesture-card ${statusClass}" data-gesture-id="${gesture.id}">
        ${deleteButton}
        <div class="gesture-card-pattern">${patternDisplay}</div>
        <div class="gesture-card-info">
          <div class="gesture-card-name">${highlightedName}</div>
          <div class="gesture-card-description">${highlightedDescription}</div>
        </div>
        <div class="gesture-card-toggle">
          <label class="switch" title="${gesture.enabled ? '無効にする' : '有効にする'}">
            <input type="checkbox" 
                   data-gesture-id="${gesture.id}" 
                   ${gesture.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `;
  }

  /**
   * 空の状態のHTML生成
   * @param filter - 現在のフィルター
   * @param searchQuery - 検索クエリ
   * @returns 空状態のHTML
   */
  private renderEmptyState(filter: FilterType, searchQuery: string): string {
    let message = 'ジェスチャーが見つかりませんでした';
    let icon = '🔍';
    
    if (searchQuery) {
      message = `「${searchQuery}」に一致するジェスチャーが見つかりませんでした`;
      icon = '🔍';
    } else if (filter === 'enabled') {
      message = '有効なジェスチャーがありません';
      icon = '✅';
    } else if (filter === 'disabled') {
      message = '無効なジェスチャーがありません';
      icon = '❌';
    } else if (filter === 'custom') {
      message = 'カスタムジェスチャーがありません';
      icon = '🎨';
    }
    
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-message">${message}</div>
        <div class="empty-suggestion">
          ${filter === 'custom' ? 
    'カスタムジェスチャー作成で新しいジェスチャーを追加できます' : 
    'フィルターを変更するか、検索条件を調整してください'
}
        </div>
      </div>
    `;
  }

  /**
   * ジェスチャーをカテゴリ別にグループ化
   * @param gestures - ジェスチャー配列
   * @returns カテゴリ別のジェスチャー
   */
  private groupGesturesByCategory(gestures: GestureItem[]): Record<string, GestureItem[]> {
    const groups: Record<string, GestureItem[]> = {
      basic: [],
      advanced: [],
      custom: []
    };
    
    gestures.forEach(gesture => {
      const category = gesture.category || 'basic';
      if (groups[category]) {
        groups[category].push(gesture);
      } else {
        groups.basic.push(gesture);
      }
    });
    
    // 空のカテゴリを除去
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key];
      }
    });
    
    return groups;
  }

  /**
   * 検索テキストをハイライト
   * @param text - 対象テキスト
   * @returns ハイライト済みテキスト
   */
  private highlightSearchText(text: string): string {
    if (!this.searchQuery || !text) return text;
    
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
    return text.replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  /**
   * パターンをフォーマット
   * @param pattern - パターンデータ
   * @returns フォーマット済みパターン
   */
  private formatPattern(pattern: string | string[] | { _directions: string[] }): string {
    if (typeof pattern === 'string') {
      return pattern;
    }
    
    if (Array.isArray(pattern)) {
      const arrows: Record<string, string> = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' };
      return pattern.map(dir => arrows[dir] || dir).join('');
    }
    
    if (pattern && typeof pattern === 'object' && '_directions' in pattern) {
      const arrows: Record<string, string> = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' };
      return pattern._directions.map(dir => arrows[dir] || dir).join('');
    }
    
    return String(pattern || '');
  }

  /**
   * 正規表現のエスケープ
   * @param string - エスケープ対象文字列
   * @returns エスケープ済み文字列
   */
  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * DOMにHTMLを挿入し、イベントリスナーを設定
   * @param containerId - コンテナ要素のID
   * @param html - 挿入するHTML
   */
  renderToDOM(containerId: string, html: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error(`Container not found: ${containerId}`);
      return;
    }
    
    container.innerHTML = html;
    this.setupEventListeners(container);
  }

  /**
   * イベントリスナーの設定
   * @param container - コンテナ要素
   */
  private setupEventListeners(container: HTMLElement): void {
    // チェックボックス変更イベント（イベント委譲）
    container.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'checkbox' && target.dataset.gestureId) {
        const gestureId = target.dataset.gestureId;
        const enabled = target.checked;
        
        if (this.onToggleGesture) {
          this.onToggleGesture(gestureId, enabled);
        }
      }
    });
    
    // 削除ボタンクリックイベント（イベント委譲）
    container.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('delete-gesture-btn')) {
        const gestureId = target.dataset.gestureId;
        
        if (this.onDeleteCustomGesture && gestureId) {
          this.onDeleteCustomGesture(gestureId);
        }
      }
    });
  }
}

// CommonJS用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureListView;
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  (window as any).GestureListView = GestureListView;
}