/**
 * ThinOptionsController - 統合コントローラー（真に薄い実装）
 * 各専用コントローラーを統合し、初期化・コーディネートのみを担当
 * Clean Architecture - Presentation層
 */

// 必要な型インポート
import type { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import type { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase';
import type { GestureListUseCase } from '../../application/usecases/GestureListUseCase';
import type { Settings } from '../../domain/entities/Settings';
import type { CustomGesture } from '../../domain/entities/CustomGesture';

// 型定義
interface ThinOptionsControllerDependencies {
  settingsUseCase: SettingsManagementUseCase;
  customGestureUseCase: CustomGestureManagementUseCase;
  gestureListUseCase: GestureListUseCase;
}

interface ExternalControllerOptions {
  settingsUseCase: SettingsManagementUseCase;
  customGestureUseCase: CustomGestureManagementUseCase;
  gestureListUseCase?: GestureListUseCase;
  patternFormatter?: any;
  showStatus: (message: string, type?: string, duration?: number) => void;
  updateElement?: (elementId: string, value: any, property?: string) => void;
  updatePreview?: () => void;
  renderExcludeList?: () => void;
}

// グローバル変数の型定義（window.xxx で利用される外部コントローラー）
declare global {
  interface Window {
    GesturePatternFormatter: new () => any;
    OptionsRenderController: new (options: ExternalControllerOptions) => any;
    OptionsEventController: new (options: ExternalControllerOptions) => any;
  }
}

class ThinOptionsController {
  private readonly settingsUseCase: SettingsManagementUseCase;
  private readonly customGestureUseCase: CustomGestureManagementUseCase;
  private readonly gestureListUseCase: GestureListUseCase;
  private isInitialized: boolean;
  private patternFormatter: any;
  private renderController: any;
  private eventController: any;

  /**
   * @param dependencies - 依存関係
   */
  constructor(dependencies: ThinOptionsControllerDependencies) {
    this.settingsUseCase = dependencies.settingsUseCase;
    this.customGestureUseCase = dependencies.customGestureUseCase;
    this.gestureListUseCase = dependencies.gestureListUseCase;
    
    this.isInitialized = false;
    
    // 専用コントローラーの初期化
    this.initializeControllers();
  }

  /**
   * 専用コントローラーの初期化
   */
  private initializeControllers(): void {
    // 依存クラスの読み込み（テスト環境対応）
    this.loadDependencies();
    
    // パターンフォーマッター
    this.patternFormatter = new window.GesturePatternFormatter();
    
    // 描画コントローラー
    this.renderController = new window.OptionsRenderController({
      settingsUseCase: this.settingsUseCase,
      customGestureUseCase: this.customGestureUseCase,
      gestureListUseCase: this.gestureListUseCase,
      patternFormatter: this.patternFormatter,
      showStatus: (message: string, type?: string, duration?: number) => this.showStatus(message, type, duration)
    });
    
    // イベントコントローラー
    this.eventController = new window.OptionsEventController({
      settingsUseCase: this.settingsUseCase,
      customGestureUseCase: this.customGestureUseCase,
      showStatus: (message: string, type?: string, duration?: number) => this.showStatus(message, type, duration),
      updateElement: (elementId: string, value: any, property?: string) => this.updateElement(elementId, value, property),
      updatePreview: () => this.updatePreview(),
      renderExcludeList: () => this.renderController.renderExcludeList()
    });
    
    // 相互参照の設定
    this.setupControllerInteractions();
  }

  /**
   * コントローラー間の相互作用を設定
   */
  private setupControllerInteractions(): void {
    // 描画コントローラーに外部ハンドラーを設定
    this.renderController.setExternalHandlers(
      (gestureId: string) => this.editCustomGesture(gestureId),
      (message: string) => this.showConfirm(message)
    );
    
    // 外部レンダリングコールバックを設定
    this.renderController.externalRenderCustomGestureList = () => this.renderCustomGestureList();
    this.renderController.externalRenderGestureList = () => this.renderGestureList();
    
    // イベントコントローラーにコールバックを設定
    this.eventController.setCallbacks(
      async () => {
        await this.renderController.renderCustomGestureList();
        await this.renderController.renderGestureList();
      },
      (gestureId: string) => this.editCustomGesture(gestureId),
      (message: string) => this.showConfirm(message),
      () => this.eventController.getEditingGestureIdInternal(),
      () => this.exitEditMode(),
      async () => {
        // 削除時はアクションフィールドのみ保持、他はクリア
        console.log('🔧 [Debug] Delete callback: preserving action field only');
        
        // アクションフィールドの値を保存
        const actionField = document.getElementById('gestureAction') as HTMLInputElement;
        const preservedAction = actionField?.value || '';
        console.log('🔧 [Debug] Preserving action:', preservedAction);
        
        // UI更新
        await this.renderController.renderCustomGestureList();
        await this.renderController.renderGestureList();
        
        // アクションフィールドのみ復元（名前とパターンはクリア）
        const nameField = document.getElementById('gestureName') as HTMLInputElement;
        if (nameField) nameField.value = '';
        
        if (actionField && preservedAction) {
          actionField.value = preservedAction;
          // changeイベントを発火して状態を同期
          actionField.dispatchEvent(new Event('change', { bubbles: true }));
          console.log('🔧 [Debug] Action field restored:', actionField.value);
        }
        
        // パターンをクリア
        if (this.eventController) {
          this.eventController.currentPattern = [];
          this.eventController.updatePatternDisplay();
        }
        
        console.log('🔧 [Debug] Delete callback completed');
      }
    );
  }

  /**
   * 初期化（統合的な初期化処理）
   */
  async initialize(): Promise<void> {
    try {
      // イベント設定
      this.eventController.setupBasicSettingsEvents();
      this.eventController.setupGestureListEvents();
      this.eventController.setupCustomGestureEvents();
      this.eventController.setupExcludeSiteEvents();
      this.eventController.setupDebugEvents();
      
      // 初期データ読み込み
      await this.loadInitialData();
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Thin Options Controller: Initialization failed:', error);
      this.showStatus('設定画面の初期化に失敗しました', 'error');
    }
  }

  /**
   * 初期データの読み込み
   */
  private async loadInitialData(): Promise<void> {
    try {
      // 設定取得
      const settings = await this.settingsUseCase.getCurrentSettings();
      this.updateUIFromSettings(settings);

      // ジェスチャー一覧表示
      await this.renderController.renderGestureList();
      
      // カスタムジェスチャー一覧表示
      await this.renderController.renderCustomGestureList();
      
      // 除外サイト一覧表示
      await this.renderController.renderExcludeList();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      this.showStatus('初期データの読み込みに失敗しました', 'error');
    }
  }

  /**
   * 設定からUIを更新
   * @param settings - 設定オブジェクト
   */
  private updateUIFromSettings(settings: Settings): void {
    console.log('🔧 [Debug] ThinOptionsController.updateUIFromSettings called with settings:', {
      fullSettings: settings,
      debugSettings: settings.debugSettings,
      debugSettingsLogLevel: settings.debugSettings?.logLevel,
      debugSettingsLogLevelType: typeof settings.debugSettings?.logLevel
    });
    
    // 基本設定
    this.updateElement('enabled', settings.enabled, 'checked');
    this.updateElement('strokeColor', settings.strokeColor, 'value');
    this.updateElement('strokeWidth', settings.strokeWidth, 'value');
    this.updateElement('strokeWidthValue', `${settings.strokeWidth}px`);
    this.updateElement('gestureThreshold', settings.gestureThreshold, 'value');
    this.updateElement('gestureThresholdValue', `${settings.gestureThreshold}px`);
    
    // デバッグ設定
    const debugSettings = settings.debugSettings || {};
    const debugEnabled = debugSettings.enabled || false;
    // logLevelは数値0も有効なので、厳密にundefinedチェック
    const debugLogLevel = debugSettings.logLevel !== undefined ? debugSettings.logLevel : 2;
    
    console.log('🔧 [Debug] ThinOptionsController.updateUIFromSettings - Debug settings processing:', {
      originalDebugSettings: debugSettings,
      originalLogLevel: debugSettings.logLevel,
      originalLogLevelType: typeof debugSettings.logLevel,
      processedDebugLogLevel: debugLogLevel,
      processedLogLevelType: typeof debugLogLevel,
      undefinedCheck: debugSettings.logLevel !== undefined,
      settingsSource: 'getCurrentSettings'
    });
    
    this.updateElement('debugEnabled', debugEnabled, 'checked');
    this.updateElement('debugLogLevel', debugLogLevel, 'value');
    this.updateElement('debugShowStatus', debugSettings.showStatus || false, 'checked');
    this.updateElement('debugStatusPosition', debugSettings.statusPosition || 'top-right', 'value');
    
    // デバッグオプションの表示/非表示制御
    const debugOptionsElement = document.getElementById('debugOptions');
    if (debugOptionsElement) {
      debugOptionsElement.style.display = debugEnabled ? 'block' : 'none';
    }
    
    // プレビュー更新
    this.updatePreview();
  }

  /**
   * 依存クラスの読み込み（テスト環境対応）
   */
  private loadDependencies(): void {
    // ブラウザ環境では何もしない（グローバルスコープから直接参照）
    // テスト環境ではrequireで読み込み
    if (typeof module !== 'undefined' && typeof require !== 'undefined') {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { GesturePatternFormatter } = require('../controllers/GesturePatternFormatter');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { OptionsRenderController } = require('../controllers/OptionsRenderController');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { OptionsEventController } = require('../controllers/OptionsEventController');
        
        // グローバルに定義（既に定義されていない場合のみ）
        if (typeof global !== 'undefined') {
          (global as any).GesturePatternFormatter = (global as any).GesturePatternFormatter || GesturePatternFormatter;
          (global as any).OptionsRenderController = (global as any).OptionsRenderController || OptionsRenderController;
          (global as any).OptionsEventController = (global as any).OptionsEventController || OptionsEventController;
        }
      } catch (error) {
        console.warn('Failed to load dependencies in test environment:', error);
      }
    }
  }

  // ========== ユーティリティメソッド ==========

  /**
   * 要素更新
   * @param elementId - 要素ID
   * @param value - 設定値
   * @param property - プロパティ名
   */
  updateElement(elementId: string, value: any, property: string = 'textContent'): void {
    const element = document.getElementById(elementId) as any;
    if (element) {
      if (elementId === 'debugLogLevel') {
        console.log('🔧 [Debug] ThinOptionsController.updateElement for debugLogLevel:', {
          elementId: elementId,
          value: value,
          valueType: typeof value,
          property: property,
          elementCurrentValue: element[property],
          elementType: element.tagName,
          isSelectElement: element.tagName === 'SELECT'
        });
      }
      
      if (property === 'checked') {
        element.checked = value;
      } else if (element.tagName === 'SELECT' && property === 'value') {
        // SELECT要素の場合は明示的に文字列変換
        element[property] = String(value);
      } else {
        element[property] = value;
      }
      
      if (elementId === 'debugLogLevel') {
        console.log('🔧 [Debug] ThinOptionsController.updateElement after update:', {
          elementFinalValue: element[property],
          elementFinalValueType: typeof element[property],
          stringConversion: String(value)
        });
      }
    } else if (elementId === 'debugLogLevel') {
      console.warn('🔧 [Debug] ThinOptionsController.updateElement - element not found:', elementId);
    }
  }

  /**
   * プレビュー更新
   */
  updatePreview(): void {
    const canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    const colorElement = document.getElementById('strokeColor') as HTMLInputElement;
    const widthElement = document.getElementById('strokeWidth') as HTMLInputElement;
    
    const color = colorElement?.value || '#2196F3';
    const width = parseInt(widthElement?.value || '3');
    
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(20, 50);
        ctx.lineTo(80, 30);
        ctx.lineTo(140, 70);
        ctx.lineTo(180, 50);
        ctx.stroke();
      }
    }
  }

  /**
   * ステータス表示
   * @param message - メッセージ
   * @param type - タイプ（success, error, info）
   * @param duration - 表示時間（ms）
   */
  showStatus(message: string, type: string = 'info', duration: number = 3000): void {
    const statusElement = document.getElementById('saveStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `save-status ${type}`;
      statusElement.style.display = 'block';
      
      if (duration > 0) {
        setTimeout(() => {
          statusElement.style.display = 'none';
        }, duration);
      }
    }
  }

  /**
   * 確認ダイアログ
   * @param message - 確認メッセージ
   * @returns 確認結果
   */
  showConfirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      const dialog = document.getElementById('confirmDialog');
      const messageEl = document.getElementById('confirmMessage');
      const okBtn = document.getElementById('confirmOk');
      const cancelBtn = document.getElementById('confirmCancel');
      
      if (dialog && messageEl && okBtn && cancelBtn) {
        messageEl.textContent = message;
        dialog.style.display = 'flex';
        
        const handleOk = () => {
          dialog.style.display = 'none';
          okBtn.removeEventListener('click', handleOk);
          cancelBtn.removeEventListener('click', handleCancel);
          resolve(true);
        };
        
        const handleCancel = () => {
          dialog.style.display = 'none';
          okBtn.removeEventListener('click', handleOk);
          cancelBtn.removeEventListener('click', handleCancel);
          resolve(false);
        };
        
        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);
        (okBtn as HTMLElement).focus();
      } else {
        // フォールバック
        resolve(confirm(message));
      }
    });
  }

  /**
   * カスタムジェスチャー編集
   * @param gestureId - ジェスチャーID
   */
  async editCustomGesture(gestureId: string): Promise<void> {
    try {
      // 編集対象のジェスチャーを取得
      const customGestures = await this.customGestureUseCase.getAllCustomGestures();
      const gesture = customGestures.find(g => g.id === gestureId);
      
      if (!gesture) {
        this.showStatus('編集対象のジェスチャーが見つかりません', 'error');
        return;
      }

      // 編集フォームに値を設定
      this.updateElement('gestureName', gesture.name, 'value');
      this.updateElement('gestureAction', gesture.action, 'value');
      
      // パターンを設定（eventControllerの内部状態を更新）
      if (this.eventController) {
        this.eventController.currentPattern = this.convertPatternToDirectionArray(gesture.pattern);
        this.eventController.updatePatternDisplay();
      }
      
      // 編集モードに切り替え
      this.enterEditMode(gestureId);
      
      // カスタムジェスチャーセクションまでスクロール
      const customGestureSection = document.getElementById('customGestureSection');
      if (customGestureSection) {
        customGestureSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      
      this.showStatus('編集モードに入りました。フォームを変更して「更新」ボタンを押してください', 'info', 5000);
      
    } catch (error) {
      console.error('カスタムジェスチャー編集エラー:', error);
      this.showStatus('編集に失敗しました', 'error');
    }
  }

  /**
   * パターンを方向配列に変換
   * @param pattern - ジェスチャーパターン
   * @returns 方向配列
   */
  private convertPatternToDirectionArray(pattern: any): string[] {
    if (Array.isArray(pattern)) {
      // 既に配列の場合はそのまま返す
      return pattern;
    }
    
    if (typeof pattern === 'string') {
      // 文字列パターンの場合は方向に変換
      const directionMap: { [key: string]: string } = {
        '↑': 'UP',
        '↓': 'DOWN', 
        '←': 'LEFT',
        '→': 'RIGHT'
      };
      
      return pattern.split('').map(char => directionMap[char]).filter(Boolean);
    }
    
    // その他の形式の場合は空配列を返す
    return [];
  }

  /**
   * 編集モードに入る（EventControllerに委譲）
   * @param gestureId - 編集中のジェスチャーID
   */
  private enterEditMode(gestureId: string): void {
    this.eventController.enterEditMode(gestureId);
  }

  /**
   * 編集モードを終了（EventControllerに委譲）
   */
  private exitEditMode(): void {
    this.eventController.exitEditModeInternal();
  }

  /**
   * HTMLエスケープ（RenderControllerに委譲）
   * @param text - エスケープ対象文字列
   * @returns エスケープ済み文字列
   */
  escapeHtml(text: string): string {
    return this.renderController.escapeHtml(text);
  }

  // ========== 公開API（後方互換性のため） ==========

  /**
   * ジェスチャー一覧を再描画
   */
  renderGestureList(): Promise<void> {
    return this.renderController.renderGestureList();
  }

  /**
   * カスタムジェスチャー一覧を再描画
   */
  renderCustomGestureList(): Promise<void> {
    return this.renderController.renderCustomGestureList();
  }

  /**
   * 除外サイト一覧を再描画
   */
  renderExcludeList(): Promise<void> {
    return this.renderController.renderExcludeList();
  }

  // ========== GesturePatternFormatter委譲メソッド（テスト互換性のため） ==========

  /**
   * パターンを矢印表記に変換（委譲）
   * @param pattern - ジェスチャーパターン
   * @param maxLength - 最大表示長
   * @returns 矢印表記のパターン
   */
  formatPatternToArrows(pattern: any, maxLength: number = 8): string {
    return this.patternFormatter.formatPatternToArrows(pattern, maxLength);
  }

  /**
   * アクションの表示名を取得（委譲）
   * @param action - アクション名
   * @returns 表示用アクション名
   */
  getActionDisplayName(action: string): string {
    return this.patternFormatter.getActionDisplayName(action);
  }

  /**
   * カスタムジェスチャー一覧のHTML生成（委譲）
   * @param gestures - ジェスチャー配列
   * @returns HTML文字列
   */
  buildCustomGestureListHTML(gestures: CustomGesture[]): string {
    return this.renderController.buildCustomGestureListHTML(gestures);
  }

  /**
   * 方向文字列を矢印に変換（委譲）
   * @param direction - 方向文字列
   * @returns 矢印文字
   */
  directionToArrow(direction: string): string {
    return this.patternFormatter.directionToArrow(direction);
  }
}

// ES6 Module export
export { ThinOptionsController, type ThinOptionsControllerDependencies, type ExternalControllerOptions };