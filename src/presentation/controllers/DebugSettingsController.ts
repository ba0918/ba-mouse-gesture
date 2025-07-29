/**
 * デバッグ設定コントローラー
 * Presentation層 - UI制御とユーザーインタラクション
 */

import { DebugSettings } from '../../domain/entities/index.js';

interface DebugSettingsUseCase {
  getDebugSettings(): Promise<DebugSettings>;
  saveDebugSettings(settings: DebugSettings): Promise<void>;
  toggleDebugEnabled(): Promise<boolean>;
  toggleShowStatus(): Promise<boolean>;
}

type LogLevel = 0 | 1 | 2 | 3;
type StatusPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

export class DebugSettingsController {
  private readonly debugSettingsUseCase: DebugSettingsUseCase;
  private currentSettings: DebugSettings | null = null;

  constructor(debugSettingsUseCase: DebugSettingsUseCase) {
    this.debugSettingsUseCase = debugSettingsUseCase;
  }

  /**
   * デバッグ設定の初期化
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Initializing debug settings');
      
      // デバッグ設定を読み込み
      await this.loadDebugSettings();
      
      // UIイベントリスナーを設定
      this.setupEventListeners();
      
      // 初期UI状態を更新
      this.updateUI();
      
      console.log('🔧 DebugSettingsController: Initialization completed');
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Initialization failed:', error);
      this.showError((error as Error).message);
      throw error;
    }
  }

  /**
   * デバッグ設定を読み込み
   */
  async loadDebugSettings(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Loading debug settings');
      
      this.currentSettings = await this.debugSettingsUseCase.getDebugSettings();
      
      console.log('🔧 DebugSettingsController: Debug settings loaded:', this.currentSettings);
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to load debug settings:', error);
      throw new Error(`Failed to load debug settings: ${(error as Error).message}`);
    }
  }

  /**
   * デバッグ設定を保存
   */
  async saveDebugSettings(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Saving debug settings');
      
      if (!this.currentSettings) {
        throw new Error('Current settings not loaded');
      }

      await this.debugSettingsUseCase.saveDebugSettings(this.currentSettings);
      
      // UI更新
      this.updateUI();
      
      // 成功メッセージ
      this.showMessage('デバッグ設定を保存しました', 'success');
      
      console.log('🔧 DebugSettingsController: Debug settings saved successfully');
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to save debug settings:', error);
      this.showMessage('デバッグ設定の保存に失敗しました', 'error');
    }
  }

  /**
   * UIの更新
   */
  updateUI(): void {
    if (!this.currentSettings) return;

    try {
      console.log('🔧 DebugSettingsController: Updating UI');
      
      const settings = this.currentSettings;

      // デバッグ有効化チェックボックス
      const enabledCheckbox = document.getElementById('enableDebugMode') as HTMLInputElement;
      if (enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled;
      }

      // 画面表示チェックボックス
      const showStatusCheckbox = document.getElementById('showDebugStatus') as HTMLInputElement;
      if (showStatusCheckbox) {
        showStatusCheckbox.checked = settings.showStatus;
        showStatusCheckbox.disabled = !settings.enabled; // デバッグ無効時は無効化
      }

      // ログレベル選択
      const logLevelSelect = document.getElementById('debugLogLevel') as HTMLSelectElement;
      if (logLevelSelect) {
        logLevelSelect.value = settings.logLevel.toString();
        logLevelSelect.disabled = !settings.enabled;
      }

      // 表示位置選択
      const positionSelect = document.getElementById('debugStatusPosition') as HTMLSelectElement;
      if (positionSelect) {
        positionSelect.value = settings.statusPosition;
        positionSelect.disabled = !settings.enabled || !settings.showStatus;
      }

      // 設定状態の表示更新
      this.updateSettingsStatus();
      
      console.log('🔧 DebugSettingsController: UI updated successfully');
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update UI:', error);
    }
  }

  /**
   * 設定状態の表示更新
   */
  private updateSettingsStatus(): void {
    try {
      const statusElement = document.getElementById('debugSettingsStatus');
      if (!statusElement || !this.currentSettings) return;

      const settings = this.currentSettings;
      const now = new Date().toLocaleTimeString();

      const statusHTML = `
        <div style="font-size: 12px; color: #5f6368;">
          最終更新: ${now}
        </div>
        <div style="margin-top: 8px;">
          <div>デバッグモード: <span style="font-weight: 600; color: ${settings.enabled ? '#34a853' : '#ea4335'}">${settings.enabled ? '有効' : '無効'}</span></div>
          <div>画面表示: <span style="font-weight: 600; color: ${settings.showStatus ? '#34a853' : '#5f6368'}">${settings.showStatus ? '有効' : '無効'}</span></div>
          <div>ログレベル: <span style="font-weight: 600;">${this.getLogLevelName(settings.logLevel as LogLevel)}</span></div>
          <div>表示位置: <span style="font-weight: 600;">${this.getPositionName(settings.statusPosition)}</span></div>
        </div>
      `;

      statusElement.innerHTML = statusHTML;
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update settings status:', error);
    }
  }

  /**
   * ログレベル名を取得
   */
  private getLogLevelName(level: LogLevel): string {
    const levels: Record<LogLevel, string> = {
      0: 'ERROR',
      1: 'WARN',
      2: 'INFO',
      3: 'DEBUG'
    };
    return levels[level] || 'Unknown';
  }

  /**
   * 表示位置名を取得
   */
  private getPositionName(position: StatusPosition): string {
    const positions: Record<StatusPosition, string> = {
      'top-right': '右上',
      'top-left': '左上',
      'bottom-right': '右下',
      'bottom-left': '左下'
    };
    return positions[position] || 'Unknown';
  }

  /**
   * イベントリスナーの設定
   */
  private setupEventListeners(): void {
    // デバッグ有効化切り替え
    const enabledCheckbox = document.getElementById('enableDebugMode') as HTMLInputElement;
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (this.currentSettings) {
          if (target.checked) {
            this.currentSettings.enabled = true;
          } else {
            // デバッグ無効時は画面表示も無効化
            this.currentSettings.enabled = false;
            this.currentSettings.showStatus = false;
          }
          await this.saveDebugSettings();
        }
      });
    }

    // 画面表示切り替え
    const showStatusCheckbox = document.getElementById('showDebugStatus') as HTMLInputElement;
    if (showStatusCheckbox) {
      showStatusCheckbox.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (this.currentSettings && this.currentSettings.enabled) {
          this.currentSettings.showStatus = target.checked;
          await this.saveDebugSettings();
        }
      });
    }

    // ログレベル変更
    const logLevelSelect = document.getElementById('debugLogLevel') as HTMLSelectElement;
    if (logLevelSelect) {
      logLevelSelect.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLSelectElement;
        if (this.currentSettings && this.currentSettings.enabled) {
          this.currentSettings.logLevel = parseInt(target.value) as LogLevel;
          await this.saveDebugSettings();
        }
      });
    }

    // 表示位置変更
    const positionSelect = document.getElementById('debugStatusPosition') as HTMLSelectElement;
    if (positionSelect) {
      positionSelect.addEventListener('change', async (e: Event) => {
        const target = e.target as HTMLSelectElement;
        if (this.currentSettings && this.currentSettings.enabled && this.currentSettings.showStatus) {
          this.currentSettings.statusPosition = target.value as StatusPosition;
          await this.saveDebugSettings();
        }
      });
    }

    console.log('🔧 DebugSettingsController: Event listeners setup completed');
  }

  /**
   * デバッグモードの切り替え
   */
  async toggleDebugEnabled(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Toggling debug enabled');
      
      const newState = await this.debugSettingsUseCase.toggleDebugEnabled();
      
      // 設定を再読み込み
      await this.loadDebugSettings();
      
      // UI更新
      this.updateUI();
      
      this.showMessage(`デバッグモードを${newState ? '有効' : '無効'}にしました`, 'success');
      
      console.log('🔧 DebugSettingsController: Debug enabled toggled:', newState);
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to toggle debug enabled:', error);
      this.showMessage('デバッグモードの切り替えに失敗しました', 'error');
    }
  }

  /**
   * 画面表示の切り替え
   */
  async toggleShowStatus(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Toggling show status');
      
      const newState = await this.debugSettingsUseCase.toggleShowStatus();
      
      // 設定を再読み込み
      await this.loadDebugSettings();
      
      // UI更新
      this.updateUI();
      
      this.showMessage(`デバッグ画面表示を${newState ? '有効' : '無効'}にしました`, 'success');
      
      console.log('🔧 DebugSettingsController: Show status toggled:', newState);
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to toggle show status:', error);
      this.showMessage('画面表示の切り替えに失敗しました', 'error');
    }
  }

  /**
   * デバッグ設定のリセット
   */
  async resetDebugSettings(): Promise<void> {
    try {
      console.log('🔧 DebugSettingsController: Resetting debug settings');
      
      // eslint-disable-next-line no-alert
      if (!confirm('デバッグ設定をデフォルトに戻しますか？')) {
        return;
      }

      // デフォルト設定を作成
      this.currentSettings = {
        enabled: false,
        logLevel: 1,
        showStatus: false,
        statusPosition: 'top-right'
      };
      
      // 保存
      await this.saveDebugSettings();
      
      this.showMessage('デバッグ設定をリセットしました', 'success');
      
      console.log('🔧 DebugSettingsController: Debug settings reset successfully');
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to reset debug settings:', error);
      this.showMessage('デバッグ設定のリセットに失敗しました', 'error');
    }
  }

  /**
   * 現在の設定を取得
   */
  getCurrentSettings(): DebugSettings | null {
    return this.currentSettings;
  }

  /**
   * 設定の手動更新（外部から）
   */
  async updateSettings(newSettings: DebugSettings): Promise<void> {
    try {
      this.currentSettings = newSettings;
      await this.saveDebugSettings();
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update settings:', error);
      throw error;
    }
  }

  /**
   * エラー表示
   */
  private showError(message: string): void {
    console.error('🚨 DebugSettingsController Error:', message);
    this.showMessage(`エラー: ${message}`, 'error');
  }

  /**
   * メッセージ表示
   */
  private showMessage(message: string, type: 'info' | 'success' | 'error' | 'warn' = 'info'): void {
    // 既存のshowSaveStatus機能と統合する必要がある
    console.log(`🔧 DebugSettingsController: ${type.toUpperCase()}: ${message}`);
    
    // 一時的な実装（後で適切なUI通知システムに統合）
    const statusElement = document.getElementById('debugSettingsSaveStatus');
    if (statusElement) {
      const colors: Record<string, string> = {
        success: '#34a853',
        error: '#ea4335',
        info: '#1a73e8',
        warn: '#fbbc04'
      };
      
      statusElement.style.color = colors[type] || colors.info;
      statusElement.textContent = message;
      
      // 3秒後にクリア
      setTimeout(() => {
        if (statusElement.textContent === message) {
          statusElement.textContent = '';
        }
      }, 3000);
    }
  }

  /**
   * デバッグ設定をリフレッシュ
   */
  async refresh(): Promise<void> {
    try {
      await this.loadDebugSettings();
      this.updateUI();
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to refresh:', error);
      this.showError((error as Error).message);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugSettingsController };
}