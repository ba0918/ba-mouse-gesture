/**
 * OptionsEventController
 * 設定画面のUIイベント処理専用クラス
 * Clean Architecture - Presentation層
 */

import { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase.js';
import { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase.js';
import { GestureExecutionResultDTO } from '../../application/interfaces/IGestureService.js';
import { Direction as GestureDirection } from '../../domain/valueObjects/GesturePattern.js';
import { GestureAction } from '../../domain/entities/Gesture.js';

interface OptionsEventControllerDependencies {
  settingsUseCase: SettingsManagementUseCase;
  customGestureUseCase: CustomGestureManagementUseCase;
  showStatus: (message: string, type: 'success' | 'error' | 'info', timeout?: number) => void;
  updateElement: (elementId: string, value: string | boolean, property?: string) => void;
  updatePreview: () => void;
  renderExcludeList: () => Promise<void>;
}

interface FormStateBackup {
  name: string;
  action: string;
  pattern: string[];
}

interface Point {
  x: number;
  y: number;
  timestamp: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export class OptionsEventController {
  private readonly settingsUseCase: SettingsManagementUseCase;
  private readonly customGestureUseCase: CustomGestureManagementUseCase;
  private readonly showStatus: (message: string, type: 'success' | 'error' | 'info', timeout?: number) => void;
  private readonly updateElement: (elementId: string, value: string | boolean, property?: string) => void;
  private readonly updatePreview: () => void;
  private readonly renderExcludeList: () => Promise<void>;
  
  // カスタムジェスチャー作成用の状態
  private currentPattern: GestureDirection[] = [];
  
  // フォーム状態の一時保存用
  private formStateBackup: FormStateBackup = {
    name: '',
    action: '',
    pattern: []
  };

  // 外部コールバック
  private onGestureAdded?: () => Promise<void>;
  private onGestureDeleted?: () => Promise<void>;
  private editCustomGesture?: (gestureId: string) => Promise<void>;
  private showConfirm?: (message: string) => Promise<boolean>;
  private getEditingGestureId?: () => string | null;
  private exitEditMode?: () => void;
  
  // 編集モード状態管理
  private editingGestureId: string | null = null;

  /**
   * @param dependencies - 依存関係
   */
  constructor(dependencies: OptionsEventControllerDependencies) {
    this.settingsUseCase = dependencies.settingsUseCase;
    this.customGestureUseCase = dependencies.customGestureUseCase;
    this.showStatus = dependencies.showStatus;
    this.updateElement = dependencies.updateElement;
    this.updatePreview = dependencies.updatePreview;
    this.renderExcludeList = dependencies.renderExcludeList;
  }

  /**
   * 基本設定のイベントを設定
   */
  setupBasicSettingsEvents(): void {
    // 機能有効/無効
    this.bindEvent('enabled', 'change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      await this.settingsUseCase.toggleExtension(target.checked);
      this.showStatus('設定を保存しました', 'success');
    });

    // 軌跡色
    this.bindEvent('strokeColor', 'change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const width = (document.getElementById('strokeWidth') as HTMLInputElement)?.value || '3';
      await this.settingsUseCase.updateStrokeSettings(target.value, parseInt(width));
      this.updatePreview();
      this.showStatus('軌跡色を変更しました', 'success');
    });

    // 軌跡幅
    this.bindEvent('strokeWidth', 'input', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const width = parseInt(target.value);
      const color = (document.getElementById('strokeColor') as HTMLInputElement)?.value || '#2196F3';
      
      await this.settingsUseCase.updateStrokeSettings(color, width);
      this.updateElement('strokeWidthValue', `${width}px`);
      this.updatePreview();
      this.showStatus('軌跡幅を変更しました', 'success', 1500);
    });

    // ジェスチャー閾値
    this.bindEvent('gestureThreshold', 'input', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const threshold = parseInt(target.value);
      await this.settingsUseCase.updateGestureThreshold(threshold);
      this.updateElement('gestureThresholdValue', `${threshold}px`);
      this.showStatus('ジェスチャー感度を変更しました', 'success', 1500);
    });
  }

  /**
   * ジェスチャー一覧のイベントを設定
   */
  setupGestureListEvents(): void {
    // 検索
    this.bindEvent('gestureSearch', 'input', (e: Event) => {
      const target = e.target as HTMLInputElement;
      this.filterGestures(target.value);
    });

    // フィルター
    this.bindEvent('gestureFilter', 'change', (e: Event) => {
      const target = e.target as HTMLSelectElement;
      this.filterGesturesByType(target.value);
    });

    // ジェスチャー一覧のトグルイベント（イベントデリゲーション使用）
    this.setupGestureListToggleEvents();
  }

  /**
   * ジェスチャー一覧のトグルイベントを設定（イベントデリゲーション）
   */
  private setupGestureListToggleEvents(): void {
    document.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      
      // ジェスチャー一覧内のチェックボックスかチェック
      if (target.type === 'checkbox' && 
          target.dataset.gestureId && 
          target.closest('#allGesturesList')) {
        
        const gestureId = target.dataset.gestureId;
        const isCustom = gestureId.startsWith('custom_');
        
        try {
          if (isCustom) {
            // カスタムジェスチャーのトグル
            await this.customGestureUseCase.toggleCustomGesture(gestureId, target.checked);
            // カスタムジェスチャーリストを更新
            if (this.onGestureAdded) {
              await this.onGestureAdded();
            }
          } else {
            // デフォルトジェスチャーのトグル
            await this.settingsUseCase.toggleGesture(gestureId, target.checked);
          }
          
          this.showStatus(`ジェスチャー「${gestureId}」を${target.checked ? '有効' : '無効'}にしました`, 'success');
        } catch (error) {
          console.error('ジェスチャートグルエラー:', error);
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error');
          // エラー時はチェックボックスを元に戻す
          target.checked = !target.checked;
        }
      }
    });
  }

  /**
   * カスタムジェスチャーのイベントを設定
   */
  setupCustomGestureEvents(): void {
    this.currentPattern = [];

    // 方向ボタン
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLButtonElement;
        const direction = target.dataset.direction as Direction;
        if (direction) {
          this.addDirectionToPattern(direction);
          // パターン変更時にバックアップ
          this.autoBackupFormState();
        }
      });
    });

    // クリア・追加ボタン
    this.bindEvent('clearPatternBtn', 'click', () => this.clearPattern());
    this.bindEvent('addGestureBtn', 'click', () => this.handleAddGesture());

    // フォーム入力時の自動バックアップ
    this.bindEvent('gestureName', 'input', () => this.autoBackupFormState());
    this.bindEvent('gestureAction', 'change', () => this.autoBackupFormState());

    // カスタムジェスチャーリストのトグルイベント（イベントデリゲーション使用）
    this.setupCustomGestureListEvents();
  }

  /**
   * カスタムジェスチャーリストのイベントを設定（イベントデリゲーション）
   */
  private setupCustomGestureListEvents(): void {
    // クリックイベント（編集・削除ボタン）
    document.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;

      // カスタムジェスチャーリスト内のボタンかチェック
      if (target.closest('#customGestureList')) {
        const gestureId = target.dataset.gestureId;
        
        try {
          if (target.classList.contains('edit-btn') && gestureId) {
            // 編集ボタン
            console.log('🔧 [Debug] Edit button clicked for gesture:', gestureId);
            
            // 内部状態として編集モードを開始
            this.enterEditMode(gestureId);
            
            // 外部コールバックも呼び出し（データロードなど）
            if (this.editCustomGesture) {
              await this.editCustomGesture(gestureId);
            }
          } else if (target.classList.contains('delete-btn') && gestureId) {
            // 削除ボタン
            console.log('🔧 [Debug] Delete button clicked for gesture:', gestureId);
            
            const confirmed = await this.showConfirm?.('このカスタムジェスチャーを削除しますか？') ?? false;
            console.log('🔧 [Debug] Delete confirmation result:', confirmed);
            
            if (confirmed) {
              // 削除対象が編集中のジェスチャーかチェック（内部状態を優先）
              const editingGestureId = this.editingGestureId || this.getEditingGestureId?.();
              console.log('🔧 [Debug] Checking edit mode before delete:', {
                internalEditingGestureId: this.editingGestureId,
                externalEditingGestureId: this.getEditingGestureId?.(),
                finalEditingGestureId: editingGestureId,
                deleteTargetId: gestureId,
                isEditingTarget: editingGestureId === gestureId
              });
              
              if (editingGestureId === gestureId) {
                // 編集モードを終了（内部実装を優先）
                console.log('🔧 [Debug] Exiting edit mode before delete');
                this.exitEditModeInternal();
              }
              
              console.log('🔧 [Debug] Calling deleteCustomGesture for:', gestureId);
              await this.customGestureUseCase.deleteCustomGesture(gestureId);
              
              console.log('🔧 [Debug] Delete successful, updating UI');
              
              // UI更新（フォーム状態保持はコールバック内で処理）
              if (this.onGestureDeleted) {
                await this.onGestureDeleted();
              } else if (this.onGestureAdded) {
                await this.onGestureAdded();
              }
              
              this.showStatus('カスタムジェスチャーを削除しました', 'success');
            } else {
              console.log('🔧 [Debug] Delete cancelled');
            }
          }
        } catch (error) {
          console.error('カスタムジェスチャー操作エラー:', error);
          this.showStatus('操作に失敗しました', 'error');
        }
      }
    });

    // トグルイベント（チェックボックス）
    document.addEventListener('change', async (e: Event) => {
      const target = e.target as HTMLInputElement;

      // カスタムジェスチャーリスト内のチェックボックスかチェック
      if (target.type === 'checkbox' && 
          target.dataset.gestureId && 
          target.closest('#customGestureList')) {
        
        const gestureId = target.dataset.gestureId;
        try {
          await this.customGestureUseCase.toggleCustomGesture(gestureId, target.checked);
          // ジェスチャー一覧も更新
          if (this.onGestureAdded) {
            await this.onGestureAdded();
          }
          this.showStatus('ジェスチャー状態を変更しました', 'success');
        } catch (error) {
          console.error('カスタムジェスチャートグルエラー:', error);
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error');
          // エラー時はチェックボックスを元に戻す
          target.checked = !target.checked;
        }
      }
    });
  }

  /**
   * 除外サイトのイベントを設定
   */
  setupExcludeSiteEvents(): void {
    const addSite = async (): Promise<void> => {
      const input = document.getElementById('newExcludeUrl') as HTMLInputElement;
      const pattern = input?.value.trim();
      if (pattern) {
        await this.settingsUseCase.addExcludeSite(pattern);
        input.value = '';
        await this.renderExcludeList();
        this.showStatus('除外サイトを追加しました', 'success');
      }
    };

    this.bindEvent('addExcludeBtn', 'click', addSite);
    this.bindEvent('newExcludeUrl', 'keypress', (e: Event) => {
      const keyEvent = e as KeyboardEvent;
      if (keyEvent.key === 'Enter') addSite();
    });

    // 除外サイトリストの削除イベント（イベントデリゲーション使用）
    this.setupExcludeListEvents();
  }

  /**
   * 除外サイトリストのイベントを設定（イベントデリゲーション）
   */
  private setupExcludeListEvents(): void {
    document.addEventListener('click', async (e: Event) => {
      const target = e.target as HTMLElement;

      // 除外サイトリスト内の削除ボタンかチェック
      if (target.classList.contains('remove-exclude-btn') && 
          target.closest('#excludeList')) {
        
        const pattern = target.dataset.pattern;
        if (pattern) {
          try {
            await this.settingsUseCase.removeExcludeSite(pattern);
            await this.renderExcludeList();
            this.showStatus('除外サイトを削除しました', 'success');
          } catch (error) {
            console.error('除外サイト削除エラー:', error);
            this.showStatus('除外サイトの削除に失敗しました', 'error');
          }
        }
      }
    });
  }

  /**
   * デバッグ設定のイベントを設定
   */
  setupDebugEvents(): void {
    // デバッグ設定を取得する共通関数
    const getCurrentDebugConfig = () => {
      const logLevelElement = document.getElementById('debugLogLevel') as HTMLSelectElement;
      const rawLogLevel = logLevelElement?.value || '2';
      const parsedLogLevel = parseInt(rawLogLevel);
      
      const config = {
        enabled: (document.getElementById('debugEnabled') as HTMLInputElement)?.checked || false,
        logLevel: parsedLogLevel,
        showStatus: (document.getElementById('debugShowStatus') as HTMLInputElement)?.checked || false,
        statusPosition: ((document.getElementById('debugStatusPosition') as HTMLSelectElement)?.value || 'top-right') as 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
      };
      
      console.log('🔧 [LogLevel Fix] getCurrentDebugConfig result:', config);
      
      return config;
    };

    // デバッグ有効/無効の切り替え
    this.bindEvent('debugEnabled', 'change', async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const enabled = target.checked;
      const debugConfig = getCurrentDebugConfig();
      
      // デバッグオプションの表示/非表示制御
      const debugOptionsElement = document.getElementById('debugOptions');
      if (debugOptionsElement) {
        debugOptionsElement.style.display = enabled ? 'block' : 'none';
      }
      
      // デバッグ無効時は画面表示も自動的に無効化
      if (!enabled) {
        debugConfig.showStatus = false;
        this.updateElement('debugShowStatus', false, 'checked');
      }
      
      await this.settingsUseCase.updateDebugSettings(debugConfig);
      this.showStatus(`デバッグモードを${enabled ? '有効' : '無効'}にしました`, 'success');
    });

    // ステータス表示設定
    this.bindEvent('debugShowStatus', 'change', async () => {
      const debugConfig = getCurrentDebugConfig();
      await this.settingsUseCase.updateDebugSettings(debugConfig);
      this.showStatus('デバッグ設定を更新しました', 'success');
    });

    // ログレベル設定
    this.bindEvent('debugLogLevel', 'change', async (e: Event) => {
      const target = e.target as HTMLSelectElement;
      console.log('🔧 [LogLevel Fix] Event triggered - value:', target.value, 'as number:', parseInt(target.value));
      
      const debugConfig = getCurrentDebugConfig();
      console.log('🔧 [LogLevel Fix] Config to save:', debugConfig);
      
      await this.settingsUseCase.updateDebugSettings(debugConfig);
      
      // 保存後の確認のため、設定を再読み込み
      const savedSettings = await this.settingsUseCase.getCurrentSettings();
      console.log('🔧 [LogLevel Fix] After save - stored logLevel:', savedSettings.debugSettings?.logLevel);
      
      this.showStatus('ログレベルを変更しました', 'success');
    });

    // ステータス位置設定
    this.bindEvent('debugStatusPosition', 'change', async () => {
      const debugConfig = getCurrentDebugConfig();
      await this.settingsUseCase.updateDebugSettings(debugConfig);
      this.showStatus('ステータス表示位置を変更しました', 'success');
    });
  }

  /**
   * イベントバインディングのヘルパーメソッド
   */
  private bindEvent(elementId: string, eventType: string, handler: (e: Event) => void | Promise<void>): void {
    const element = document.getElementById(elementId);
    if (element) {
      element.addEventListener(eventType, async (e: Event) => {
        try {
          await handler(e);
        } catch (error) {
          console.error(`Event handler error for ${elementId}:`, error);
          this.showStatus('操作に失敗しました', 'error');
        }
      });
    } else {
      console.warn(`Element not found: ${elementId}`);
    }
  }

  /**
   * ジェスチャーの検索フィルター
   */
  private filterGestures(query: string): void {
    const items = document.querySelectorAll('.all-gesture-item');
    const lowerQuery = query.toLowerCase();

    items.forEach(item => {
      const gestureItem = item as HTMLElement;
      const name = gestureItem.querySelector('.gesture-name')?.textContent?.toLowerCase() || '';
      const description = gestureItem.querySelector('.gesture-description')?.textContent?.toLowerCase() || '';
      
      if (name.includes(lowerQuery) || description.includes(lowerQuery)) {
        gestureItem.style.display = '';
      } else {
        gestureItem.style.display = 'none';
      }
    });

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const categoryElement = category as HTMLElement;
      const visibleItems = categoryElement.querySelectorAll('.all-gesture-item:not([style*="display: none"])');
      categoryElement.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  }

  /**
   * ジェスチャーのタイプフィルター
   */
  private filterGesturesByType(type: string): void {
    const items = document.querySelectorAll('.all-gesture-item');

    items.forEach(item => {
      const gestureItem = item as HTMLElement;
      const gestureInput = gestureItem.querySelector('input[data-gesture-id]') as HTMLInputElement;
      const gestureId = gestureInput?.dataset.gestureId || '';
      
      if (type === 'all') {
        gestureItem.style.display = '';
      } else if (type === 'enabled') {
        const isEnabled = !gestureItem.classList.contains('disabled');
        gestureItem.style.display = isEnabled ? '' : 'none';
      } else if (type === 'disabled') {
        const isDisabled = gestureItem.classList.contains('disabled');
        gestureItem.style.display = isDisabled ? '' : 'none';
      } else if (type === 'custom') {
        const isCustom = gestureId.startsWith('custom_');
        gestureItem.style.display = isCustom ? '' : 'none';
      } else if (type === 'default') {
        const isDefault = !gestureId.startsWith('custom_');
        gestureItem.style.display = isDefault ? '' : 'none';
      }
    });

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const categoryElement = category as HTMLElement;
      const visibleItems = categoryElement.querySelectorAll('.all-gesture-item:not([style*="display: none"])');
      categoryElement.style.display = visibleItems.length > 0 ? '' : 'none';
    });
  }

  /**
   * カスタムジェスチャーパターンに方向を追加
   */
  private addDirectionToPattern(direction: Direction): void {
    if (this.currentPattern.length < 10) { // 最大10方向まで
      this.currentPattern.push(direction);
      this.updatePatternDisplay();
    } else {
      this.showStatus('パターンが長すぎます（最大10方向）', 'error');
    }
  }

  /**
   * カスタムジェスチャーパターンをクリア
   */
  private clearPattern(): void {
    console.log('🔧 [Debug] clearPattern called, current pattern length:', this.currentPattern.length);
    this.currentPattern = [];
    this.updatePatternDisplay();
    console.log('🔧 [Debug] Pattern cleared and display updated');
  }

  /**
   * パターン表示を更新
   */
  private updatePatternDisplay(): void {
    const display = document.getElementById('gesturePatternDisplay') as HTMLInputElement;
    if (display) {
      const arrows: Record<Direction, string> = { 'up': '↑', 'down': '↓', 'left': '←', 'right': '→' };
      display.value = this.currentPattern.map(dir => arrows[dir] || dir).join('');
    }
  }

  /**
   * フォーム状態をバックアップ
   */
  backupFormState(): void {
    const nameField = document.getElementById('gestureName') as HTMLInputElement;
    const actionField = document.getElementById('gestureAction') as HTMLSelectElement;
    
    this.formStateBackup = {
      name: nameField?.value || '',
      action: actionField?.value || '',
      pattern: [...this.currentPattern]
    };
    
    console.log('🔧 [Debug] Form state backed up:', this.formStateBackup);
  }

  /**
   * フォーム状態を復元
   */
  restoreFormState(): void {
    const nameField = document.getElementById('gestureName') as HTMLInputElement;
    const actionField = document.getElementById('gestureAction') as HTMLSelectElement;
    
    if (nameField) nameField.value = this.formStateBackup.name;
    if (actionField) actionField.value = this.formStateBackup.action;
    this.currentPattern = [...this.formStateBackup.pattern] as GestureDirection[];
    
    this.updatePatternDisplay();
    
    console.log('🔧 [Debug] Form state restored:', {
      name: this.formStateBackup.name,
      action: this.formStateBackup.action,
      pattern: this.formStateBackup.pattern,
      actualNameFieldValue: nameField?.value,
      actualActionFieldValue: actionField?.value,
      actualPatternLength: this.currentPattern.length
    });
  }

  /**
   * フォーム状態を自動バックアップ
   */
  private autoBackupFormState(): void {
    const nameField = document.getElementById('gestureName') as HTMLInputElement;
    const actionField = document.getElementById('gestureAction') as HTMLSelectElement;
    
    // 値が入力されている場合のみバックアップ
    if ((nameField?.value || actionField?.value || this.currentPattern.length > 0)) {
      this.formStateBackup = {
        name: nameField?.value || '',
        action: actionField?.value || '',
        pattern: [...this.currentPattern]
      };
      
      console.log('🔧 [Debug] Form state auto-backed up:', {
        name: this.formStateBackup.name,
        action: this.formStateBackup.action,
        pattern: this.formStateBackup.pattern,
        nameFieldValue: nameField?.value,
        actionFieldValue: actionField?.value,
        currentPatternLength: this.currentPattern.length
      });
    }
  }

  /**
   * カスタムジェスチャー追加・更新処理
   */
  private async handleAddGesture(): Promise<void> {
    try {
      console.log('🔧 [Debug] handleAddGesture called');
      
      const nameField = document.getElementById('gestureName') as HTMLInputElement;
      const actionField = document.getElementById('gestureAction') as HTMLSelectElement;
      
      const name = nameField?.value.trim();
      const action = actionField?.value;
      
      console.log('🔧 [Debug] Form values:', {
        name: name,
        action: action,
        currentPatternLength: this.currentPattern.length,
        currentPattern: this.currentPattern
      });
      
      if (!name) {
        console.log('🔧 [Debug] Validation failed: name is empty');
        this.showStatus('ジェスチャー名を入力してください', 'error');
        return;
      }
      
      if (this.currentPattern.length === 0) {
        console.log('🔧 [Debug] Validation failed: pattern is empty');
        this.showStatus('ジェスチャーパターンを設定してください', 'error');
        return;
      }
      
      if (!action) {
        console.log('🔧 [Debug] Validation failed: action is empty');
        this.showStatus('アクションを選択してください', 'error');
        return;
      }

      // パターンをPoint配列形式に変換（改良版）
      const rawPoints: Point[] = [];
      let currentX = 100; // 開始座標
      let currentY = 100;
      
      // 開始点を追加
      rawPoints.push({
        x: currentX,
        y: currentY,
        timestamp: Date.now()
      });
      
      // 各方向について終点を計算
      this.currentPattern.forEach((direction, index) => {
        const distance = 50; // 移動距離
        
        switch (direction) {
        case 'up':
          currentY -= distance;
          break;
        case 'down':
          currentY += distance;
          break;
        case 'left':
          currentX -= distance;
          break;
        case 'right':
          currentX += distance;
          break;
        }
        
        rawPoints.push({
          x: currentX,
          y: currentY,
          timestamp: Date.now() + (index + 1) * 100
        });
      });

      // 編集モードかどうかチェック（内部状態を優先、外部からのコールバックは補助）
      const isEditMode = this.editingGestureId || this.getEditingGestureId?.();
      
      console.log('🔧 [Debug] Edit mode check:', {
        internalEditingGestureId: this.editingGestureId,
        hasGetEditingGestureId: Boolean(this.getEditingGestureId),
        externalEditingGestureId: this.getEditingGestureId?.(),
        finalIsEditMode: isEditMode
      });
      
      if (isEditMode) {
        // 更新処理
        console.log('🔧 [Debug] Entering update mode for gesture:', isEditMode);
        const updates = {
          name: name,
          pattern: rawPoints,
          action: action
        };
        await this.customGestureUseCase.updateCustomGesture(isEditMode, updates);
        
        // 編集モード終了（内部実装を優先）
        this.exitEditModeInternal();
        
        this.showStatus('カスタムジェスチャーを更新しました', 'success');
      } else {
        // 新規追加処理
        console.log('🔧 [Debug] Entering create mode');
        console.log('🔧 [Debug] Creating gesture with:', {
          name: name,
          rawPointsLength: rawPoints.length,
          action: action
        });
        
        await this.customGestureUseCase.createCustomGesture(name, rawPoints, action as GestureAction);
        
        console.log('🔧 [Debug] Gesture created successfully, resetting form');
        
        // フォームをリセット（名前とパターンのみ、アクションは保持）
        if (nameField) nameField.value = '';
        this.clearPattern();
        
        console.log('🔧 [Debug] Form reset completed, action field preserved');
        
        this.showStatus('カスタムジェスチャーを追加しました', 'success');
      }
      
      // 描画更新（外部コントローラーに委譲）
      console.log('🔧 [Debug] Calling onGestureAdded callback');
      if (this.onGestureAdded) {
        await this.onGestureAdded();
      }
      
      console.log('🔧 [Debug] handleAddGesture completed successfully');
      
    } catch (error) {
      console.error('カスタムジェスチャー操作エラー:', error);
      const errorObj = error as Error;
      
      // エラーメッセージをより具体的に表示
      let errorMessage = 'カスタムジェスチャーの操作に失敗しました';
      if (errorObj.message) {
        if (errorObj.message.includes('Gesture name')) {
          errorMessage = 'ジェスチャー名に問題があります: ' + errorObj.message;
        } else if (errorObj.message.includes('Invalid action')) {
          errorMessage = 'アクションの設定に問題があります: ' + errorObj.message;
        } else if (errorObj.message.includes('already exists')) {
          errorMessage = 'そのジェスチャー名は既に使用されています';
        } else if (errorObj.message.includes('Invalid gesture pattern')) {
          errorMessage = 'ジェスチャーパターンが正しくありません';
        } else {
          errorMessage = errorObj.message;
        }
      }
      
      this.showStatus(errorMessage, 'error');
    }
  }

  /**
   * 外部コールバックの設定
   */
  setCallbacks(
    gestureAddedCallback: () => Promise<void>,
    editCustomGestureCallback?: (gestureId: string) => Promise<void>,
    showConfirmCallback?: (message: string) => Promise<boolean>,
    getEditingGestureIdCallback?: () => string | null,
    exitEditModeCallback?: () => void,
    gestureDeletedCallback?: () => Promise<void>
  ): void {
    this.onGestureAdded = gestureAddedCallback;
    this.onGestureDeleted = gestureDeletedCallback;
    this.editCustomGesture = editCustomGestureCallback;
    this.showConfirm = showConfirmCallback || ((message: string) => {
      // フォールバック: 標準confirm
       
      return Promise.resolve(confirm(message));
    });
    this.getEditingGestureId = getEditingGestureIdCallback;
    this.exitEditMode = exitEditModeCallback;
  }

  /**
   * 編集モードに入る
   */
  private enterEditMode(gestureId: string): void {
    // 編集状態を保存
    this.editingGestureId = gestureId;
    
    // ボタンテキスト変更
    const addButton = document.getElementById('addGestureBtn') as HTMLButtonElement;
    if (addButton) {
      addButton.textContent = '更新';
      addButton.classList.add('edit-mode');
    }
    
    // キャンセルボタンを表示
    let cancelButton = document.getElementById('cancelEditBtn') as HTMLButtonElement;
    if (!cancelButton) {
      cancelButton = document.createElement('button');
      cancelButton.id = 'cancelEditBtn';
      cancelButton.type = 'button';
      cancelButton.textContent = '編集をキャンセル';
      cancelButton.className = 'cancel-btn';
      
      if (addButton && addButton.parentNode) {
        addButton.parentNode.insertBefore(cancelButton, addButton.nextSibling);
      }
    }
    cancelButton.style.display = 'inline-block';
    
    // キャンセルボタンのイベント設定
    cancelButton.onclick = () => this.exitEditModeInternal();
  }

  /**
   * 編集モードを終了（内部実装）
   */
  private exitEditModeInternal(): void {
    // 編集状態をクリア
    this.editingGestureId = null;
    
    // ボタンテキストを元に戻す
    const addButton = document.getElementById('addGestureBtn') as HTMLButtonElement;
    if (addButton) {
      addButton.textContent = 'カスタムジェスチャーを追加';
      addButton.classList.remove('edit-mode');
    }
    
    // キャンセルボタンを非表示
    const cancelButton = document.getElementById('cancelEditBtn');
    if (cancelButton) {
      cancelButton.style.display = 'none';
    }
    
    // フォームをクリア
    const nameField = document.getElementById('gestureName') as HTMLInputElement;
    const actionField = document.getElementById('gestureAction') as HTMLSelectElement;
    if (nameField) nameField.value = '';
    if (actionField) actionField.value = '';
    this.clearPattern();
    
    this.showStatus('編集をキャンセルしました', 'info');
  }

  /**
   * 編集中のジェスチャーIDを取得
   */
  getEditingGestureIdInternal(): string | null {
    return this.editingGestureId;
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsEventController };
  // グローバル定義もテスト環境で必要（globalが存在する場合のみ）
  if (typeof global !== 'undefined') {
    (global as any).OptionsEventController = OptionsEventController;
  }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  (window as any).OptionsEventController = OptionsEventController;
}