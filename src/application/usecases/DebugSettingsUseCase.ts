/**
 * デバッグ設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 修正：統一されたストレージアクセスでpopup-content script同期問題を解決
 */

import { LogLevel } from '../../infrastructure/adapters/DebugLogger.js';
import { DebugSettingsEntity } from '../../domain/entities/DebugSettingsEntity.js';
import { DebugStorageAdapter } from '../../infrastructure/adapters/DebugStorageAdapter.js';
import { NoOpLogger } from '../../infrastructure/adapters/NoOpLogger.js';

// Loggerインターフェースの定義
interface Logger {
  error(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  debug(message: string, ...args: any[]): void;
}

export class DebugSettingsUseCase {
  private storageAdapter: DebugStorageAdapter;
  private isListenerStarted: boolean = false;
  private syncCallbacks: Set<(newEntity: any, oldEntity: any) => void> = new Set();
  private logger: Logger;

  constructor(storageAdapter?: DebugStorageAdapter, logger?: Logger) {
    // シンプルな依存性注入
    this.storageAdapter = storageAdapter || new DebugStorageAdapter(logger || new NoOpLogger());
    this.logger = logger || new NoOpLogger();
  }

  /**
   * DebugLoggerを設定
   */
  setLogger(logger: Logger): void {
    this.logger = logger;
    this.storageAdapter.setLogger(logger);
  }

  /**
   * デバッグ設定を取得（popup/content script共通）
   */
  async getDebugSettings(): Promise<DebugSettingsEntity> {
    try {
      this.logger.info('DebugSettingsUseCase: Loading debug settings');

      const settingsData = await this.storageAdapter.loadSettings();


      const entity = DebugSettingsEntity.fromPlainObject(settingsData);
      this.logger.info('DebugSettingsUseCase: Loaded debug settings:', entity.getSyncInfo());
      return entity;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to load debug settings:', error);
      // フォールバックとしてデフォルト設定を返す

      return DebugSettingsEntity.getDefault();
    }
  }

  /**
   * デバッグが有効かチェック
   */
  async isDebugEnabled(): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      return debugSettings.enabled;
    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to check if debug enabled:', error);
      return false;
    }
  }

  /**
   * デバッグ設定を保存（popup/content script共通）
   */
  async saveDebugSettings(debugSettings: DebugSettingsEntity | any): Promise<DebugSettingsEntity> {
    try {
      this.logger.info('DebugSettingsUseCase: Saving debug settings');



      // エンティティの妥当性検証
      if (!(debugSettings instanceof DebugSettingsEntity)) {
        debugSettings = DebugSettingsEntity.fromPlainObject(debugSettings);
      }
      debugSettings.validate();

      // ストレージに保存
      const savedSettings = await this.storageAdapter.saveSettings(debugSettings.toStorageFormat());
      this.logger.info('DebugSettingsUseCase: Debug settings saved successfully:', savedSettings);

      // 設定変更通知（コールバック実行）
      this.notifySettingsChanged(debugSettings);

      return DebugSettingsEntity.fromPlainObject(savedSettings);

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to save debug settings:', error);
      throw new Error(`Failed to save debug settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * デバッグ設定の変更監視を開始（popup/content script共通）
   */
  startSyncListener(callback: () => void): void {
    if (typeof callback !== 'function') {
      throw new Error('Callback function is required');
    }

    // コールバックを登録
    this.syncCallbacks.add(callback);

    // 初回のみストレージリスナーを開始
    if (!this.isListenerStarted) {
      this.storageAdapter.startChangeListener((changes: any) => {
        this.logger.info('DebugSettingsUseCase: Settings change detected:', {
          old: changes.oldSettings,
          new: changes.newSettings
        });

        try {
          const newEntity = DebugSettingsEntity.fromPlainObject(changes.newSettings);
          const oldEntity = changes.oldSettings ? DebugSettingsEntity.fromPlainObject(changes.oldSettings) : null;

          // 全ての登録されたコールバックを実行
          this.syncCallbacks.forEach(cb => {
            try {
              cb(newEntity, oldEntity);
            } catch (error) {
              this.logger.error('DebugSettingsUseCase: Callback failed:', error);
            }
          });

        } catch (error) {
          this.logger.error('DebugSettingsUseCase: Failed to process settings change:', error);
        }
      });

      this.isListenerStarted = true;
      this.logger.info('DebugSettingsUseCase: Sync listener started');
    }
  }

  /**
   * デバッグ設定の変更監視を停止
   */
  stopSyncListener(callback?: () => void): void {
    if (callback) {
      this.syncCallbacks.delete(callback);
    } else {
      this.syncCallbacks.clear();
    }

    // 全てのコールバックが削除された場合はストレージリスナーも停止
    if (this.syncCallbacks.size === 0) {
      this.storageAdapter.stopChangeListener();
      this.isListenerStarted = false;
      this.logger.info('DebugSettingsUseCase: Sync listener stopped');
    }
  }

  /**
   * デバッグモードの有効/無効を切り替え
   */
  async toggleDebugEnabled(): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      const newState = debugSettings.toggleEnabled();

      await this.saveDebugSettings(debugSettings);

      this.logger.info('DebugSettingsUseCase: Debug enabled toggled:', newState);
      return newState;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to toggle debug enabled:', error);
      throw error;
    }
  }

  /**
   * デバッグ画面表示の有効/無効を切り替え
   */
  async toggleShowStatus(): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      const newState = debugSettings.toggleShowStatus();

      await this.saveDebugSettings(debugSettings);

      this.logger.info('DebugSettingsUseCase: Show status toggled:', newState);
      return newState;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to toggle show status:', error);
      throw error;
    }
  }

  /**
   * ログレベルを更新
   */
  async updateLogLevel(level: LogLevel): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      debugSettings.setLogLevel(level);

      await this.saveDebugSettings(debugSettings);

      this.logger.info('DebugSettingsUseCase: Log level updated:', level);
      return true;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to update log level:', error);
      throw error;
    }
  }

  /**
   * 表示位置を更新
   */
  async updateStatusPosition(position: string): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      debugSettings.setStatusPosition(position);

      await this.saveDebugSettings(debugSettings);

      this.logger.info('DebugSettingsUseCase: Status position updated:', position);
      return true;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to update status position:', error);
      throw error;
    }
  }

  /**
   * 複数の設定を一括更新
   */
  async updateMultipleSettings(newSettings: any): Promise<DebugSettingsEntity> {
    try {
      const currentSettings = await this.getDebugSettings();
      const updatedSettings = currentSettings.updateSettings(newSettings);

      await this.saveDebugSettings(updatedSettings);

      this.logger.info('DebugSettingsUseCase: Multiple settings updated:', newSettings);
      return updatedSettings;

    } catch (error) {
      this.logger.error('DebugSettingsUseCase: Failed to update multiple settings:', error);
      throw error;
    }
  }



  /**
   * 設定変更通知（内部用）
   */
  private notifySettingsChanged(newSettings: DebugSettingsEntity): void {
    this.logger.info('DebugSettingsUseCase: Notifying settings change:', newSettings.getSyncInfo());
  }

}
