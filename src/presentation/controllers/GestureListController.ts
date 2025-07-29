/**
 * GestureListController (リファクタリング後)
 * ジェスチャー一覧の状態管理・イベント処理専用クラス
 * Clean Architecture - Presentation層
 */

import { GestureListView } from './GestureListView.js';

interface GestureItem {
  id: string;
  name: string;
  description: string;
  pattern: string | string[] | { _directions: string[] };
  enabled: boolean;
  category: string;
  getFormattedPattern?: (maxLength: number) => string;
}

interface GestureListUseCase {
  getAllGestures(): Promise<GestureItem[]>;
  toggleGesture(gestureId: string, enabled: boolean): Promise<void>;
  deleteCustomGesture(gestureId: string): Promise<void>;
}

interface GestureStatistics {
  total: number;
  enabled: number;
  disabled: number;
  custom: number;
  default: number;
}

type FilterType = 'all' | 'enabled' | 'disabled' | 'custom' | 'default';
type ViewMode = 'list' | 'card';

export class GestureListController {
  private readonly gestureListUseCase: GestureListUseCase;
  private readonly view: GestureListView;
  private currentViewMode: ViewMode = 'list';
  private currentFilter: FilterType = 'all';
  private searchQuery: string = '';
  private allGestures: GestureItem[] = [];

  /**
   * @param gestureListUseCase - ジェスチャー一覧UseCase
   */
  constructor(gestureListUseCase: GestureListUseCase) {
    this.gestureListUseCase = gestureListUseCase;
    
    // 依存クラスの読み込み（テスト環境対応）
    this.loadDependencies();
    
    // 描画コンポーネントの初期化
    this.view = new GestureListView({
      onToggleGesture: (gestureId: string, enabled: boolean) => this.handleToggleGesture(gestureId, enabled),
      onDeleteCustomGesture: (gestureId: string) => this.handleDeleteCustomGesture(gestureId)
    });
  }

  /**
   * ジェスチャー一覧の初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 GestureListController: Initializing gesture list');
      
      // DOM要素の存在確認
      const container = document.getElementById('allGesturesList');
      if (!container) {
        throw new Error('allGesturesList container not found');
      }

      // ジェスチャーデータを読み込み
      await this.loadGestures();
      
      // イベントリスナーを設定
      this.setupEventListeners();
      
      // 初期表示
      await this.renderGestures();
      
      console.log('🔧 GestureListController: Initialization completed');
      
    } catch (error) {
      console.error('🚨 GestureListController: Initialization failed:', error);
      this.showError((error as Error).message);
      throw error;
    }
  }

  /**
   * ジェスチャーデータを読み込み
   */
  async loadGestures(): Promise<void> {
    try {
      console.log('🔧 GestureListController: Loading gestures');
      this.allGestures = await this.gestureListUseCase.getAllGestures();
      console.log(`🔧 GestureListController: Loaded ${this.allGestures.length} gestures`);
    } catch (error) {
      console.error('🚨 GestureListController: Failed to load gestures:', error);
      this.allGestures = [];
      throw error;
    }
  }

  /**
   * ジェスチャーを描画（Viewに委譲）
   */
  renderGestures(): void {
    try {
      const html = this.view.renderGestures(
        this.allGestures, 
        this.currentFilter, 
        this.searchQuery, 
        this.currentViewMode
      );
      
      this.view.renderToDOM('allGesturesList', html);
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to render gestures:', error);
      this.showError('ジェスチャー一覧の表示に失敗しました');
    }
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // 検索
    const searchInput = document.getElementById('gestureSearch') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        this.searchQuery = target.value.toLowerCase();
        this.renderGestures();
      });
    }

    // フィルター
    const filterSelect = document.getElementById('gestureFilter') as HTMLSelectElement;
    if (filterSelect) {
      filterSelect.addEventListener('change', (e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.currentFilter = target.value as FilterType;
        this.renderGestures();
      });
    }

    // 表示モード切り替え
    const toggleViewBtn = document.getElementById('toggleViewMode');
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => {
        this.toggleViewMode();
      });
    }

    // 全選択/全解除
    const selectAllBtn = document.getElementById('selectAllGestures');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.toggleAllGestures();
      });
    }

    // リフレッシュボタン
    const refreshBtn = document.getElementById('refreshGestures');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh();
      });
    }
  }

  /**
   * ジェスチャーの有効/無効を切り替え
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効かどうか
   */
  async handleToggleGesture(gestureId: string, enabled: boolean): Promise<void> {
    try {
      console.log(`🔧 GestureListController: Toggling gesture ${gestureId} to ${enabled}`);
      
      await this.gestureListUseCase.toggleGesture(gestureId, enabled);
      
      // ローカル状態を更新
      const gesture = this.allGestures.find(g => g.id === gestureId);
      if (gesture) {
        gesture.enabled = enabled;
      }
      
      // 表示を更新
      await this.renderGestures();
      
      this.showMessage(`ジェスチャー「${gestureId}」を${enabled ? '有効' : '無効'}にしました`, 'success');
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to toggle gesture:', error);
      this.showError('ジェスチャーの設定変更に失敗しました');
      
      // 表示を元に戻す
      await this.renderGestures();
    }
  }

  /**
   * カスタムジェスチャーの削除
   * @param gestureId - ジェスチャーID
   */
  async handleDeleteCustomGesture(gestureId: string): Promise<void> {
    try {
      // 確認ダイアログ
      const confirmed = await this.showConfirm('このカスタムジェスチャーを削除しますか？');
      if (!confirmed) return;
      
      console.log(`🔧 GestureListController: Deleting custom gesture ${gestureId}`);
      
      await this.gestureListUseCase.deleteCustomGesture(gestureId);
      
      // データを再読み込みして表示更新
      await this.loadGestures();
      await this.renderGestures();
      
      this.showMessage('カスタムジェスチャーを削除しました', 'success');
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to delete custom gesture:', error);
      this.showError('カスタムジェスチャーの削除に失敗しました');
    }
  }

  /**
   * 表示モードの切り替え
   */
  private toggleViewMode(): void {
    this.currentViewMode = this.currentViewMode === 'list' ? 'card' : 'list';
    
    // ボタンのテキストを更新
    const toggleBtn = document.getElementById('toggleViewMode');
    if (toggleBtn) {
      const modeNames: Record<ViewMode, string> = {
        list: 'リスト表示',
        card: 'カード表示'
      };
      toggleBtn.textContent = modeNames[this.currentViewMode];
    }
    
    this.renderGestures();
  }

  /**
   * 全ジェスチャーの有効/無効を切り替え
   */
  async toggleAllGestures(): Promise<void> {
    try {
      const visibleGestures = this.getVisibleGestures();
      const allEnabled = visibleGestures.every(g => g.enabled);
      const newState = !allEnabled;
      
      console.log(`🔧 GestureListController: Toggling all gestures to ${newState}`);
      
      // 並列で処理
      await Promise.all(
        visibleGestures.map(gesture => 
          this.gestureListUseCase.toggleGesture(gesture.id, newState)
        )
      );
      
      // ローカル状態を更新
      visibleGestures.forEach(gesture => {
        gesture.enabled = newState;
      });
      
      await this.renderGestures();
      
      this.showMessage(`表示中のジェスチャーを${newState ? '有効' : '無効'}にしました`, 'success');
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to toggle all gestures:', error);
      this.showError('一括設定に失敗しました');
    }
  }

  /**
   * 現在表示中のジェスチャーを取得
   * @returns フィルタリング済みジェスチャー配列
   */
  private getVisibleGestures(): GestureItem[] {
    return this.allGestures.filter(gesture => {
      // 検索フィルター
      if (this.searchQuery) {
        const matchesName = gesture.name.toLowerCase().includes(this.searchQuery);
        const matchesDescription = gesture.description.toLowerCase().includes(this.searchQuery);
        if (!matchesName && !matchesDescription) return false;
      }
      
      // ステータスフィルター
      if (this.currentFilter === 'enabled') return gesture.enabled;
      if (this.currentFilter === 'disabled') return !gesture.enabled;
      if (this.currentFilter === 'custom') return gesture.category === 'custom';
      if (this.currentFilter === 'default') return gesture.category !== 'custom';
      
      return true; // 'all'
    });
  }

  /**
   * データをリフレッシュ
   */
  async refresh(): Promise<void> {
    try {
      console.log('🔧 GestureListController: Refreshing gesture list');
      await this.loadGestures();
      await this.renderGestures();
      this.showMessage('ジェスチャー一覧を更新しました', 'success');
    } catch (error) {
      console.error('🚨 GestureListController: Failed to refresh:', error);
      this.showError('ジェスチャー一覧の更新に失敗しました');
    }
  }

  /**
   * 検索クエリを設定
   * @param query - 検索クエリ
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query.toLowerCase();
    this.renderGestures();
  }

  /**
   * フィルターを設定
   * @param filter - フィルター値
   */
  setFilter(filter: FilterType): void {
    this.currentFilter = filter;
    this.renderGestures();
  }

  /**
   * 統計情報を取得
   * @returns 統計情報
   */
  getStatistics(): GestureStatistics {
    const total = this.allGestures.length;
    const enabled = this.allGestures.filter(g => g.enabled).length;
    const custom = this.allGestures.filter(g => g.category === 'custom').length;
    
    return {
      total,
      enabled,
      disabled: total - enabled,
      custom,
      default: total - custom
    };
  }

  /**
   * 依存クラスの読み込み（テスト環境対応）
   */
  private loadDependencies(): void {
    // Node.js/テスト環境での依存クラス読み込み
    if (typeof module !== 'undefined' && typeof require !== 'undefined') {
      try {
        // グローバルに定義（既に定義されていない場合のみ）
        if (typeof global !== 'undefined') {
          (global as any).GestureListView = (global as any).GestureListView || GestureListView;
        }
      } catch (error) {
        console.warn('Failed to load GestureListView in test environment:', error);
      }
    }
  }

  // ========== UI ユーティリティメソッド ==========

  /**
   * エラーメッセージの表示
   * @param message - エラーメッセージ
   */
  private showError(message: string): void {
    this.showMessage(message, 'error');
  }

  /**
   * メッセージの表示
   * @param message - メッセージ
   * @param type - メッセージタイプ
   */
  private showMessage(message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    // 簡易実装（実際の実装では適切なUI要素に表示）
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // ステータス要素が存在する場合は表示
    const statusElement = document.getElementById('gestureListStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status ${type}`;
      
      setTimeout(() => {
        statusElement.textContent = '';
        statusElement.className = 'status';
      }, 3000);
    }
  }

  /**
   * 確認ダイアログの表示
   * @param message - 確認メッセージ
   * @returns 確認結果
   */
  private showConfirm(message: string): Promise<boolean> {
    // 簡易実装
    // eslint-disable-next-line no-alert
    return Promise.resolve(confirm(message));
  }
}

// CommonJS用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureListController;
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  (window as any).GestureListController = GestureListController;
}