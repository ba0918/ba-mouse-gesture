/**
 * デバッグ設定管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 修正：統一されたストレージアクセスでpopup-content script同期問題を解決
 */

import { DebugSettingsEntity } from '../../domain/entities/DebugSettingsEntity.js';
import { DebugStorageAdapter } from '../../infrastructure/adapters/DebugStorageAdapter.js';

// 型定義
interface SyncConsistencyResult {
  isConsistent: boolean;
  error?: string;
  storageType?: string;
  settings?: any;
  timestamp?: string;
  listenerCount?: number;
}

interface LegacyMigrationResult {
  hadLegacyData: boolean;
  wasInconsistent?: boolean;
  cleanedUp?: boolean;
  error?: string;
}

interface DebugInfo {
  useCase: string;
  settings?: any;
  storage?: any;
  listeners?: {
    syncCallbacks: number;
    isListenerStarted: boolean;
  };
  timestamp: string;
  error?: string;
}

export class DebugSettingsUseCase {
  private settingsRepository: any = null;
  private storageAdapter: DebugStorageAdapter | null = null;
  private isListenerStarted: boolean = false;
  private syncCallbacks: Set<(newEntity: any, oldEntity: any) => void> = new Set();
  private logger: any = null; // DebugLoggerインスタンス

  constructor(settingsRepository: any = null, logger: any = null) {
    // 引数が与えられた場合は互換性モード、そうでなければ独自実装
    if (settingsRepository) {
      this.settingsRepository = settingsRepository;
      this.storageAdapter = null;
    } else {
      // 統一されたストレージアダプターを使用
      const DebugStorageAdapterClass = (typeof window !== 'undefined' && (window as any).DebugStorageAdapter) || 
        DebugStorageAdapter;
      
      if (!DebugStorageAdapterClass) {
        throw new Error('DebugStorageAdapter is not available');
      }
      this.storageAdapter = new DebugStorageAdapterClass(logger);
    }
    
    this.logger = logger;
  }
  
  /**
   * DebugLoggerを設定
   */
  setLogger(logger: any): void {
    this.logger = logger;
    if (this.storageAdapter) {
      this.storageAdapter.setLogger(logger);
    }
  }
  
  /**
   * 静的ログ制御を使用してログを出力
   * DebugLogger未初期化時でもlogLevel=0設定を尊重
   */
  private logWithLevel(level: number, message: string, ...args: any[]): void {
    if (this.logger) {
      // DebugLoggerが利用可能な場合はそれを使用
      switch(level) {
      case 0: this.logger.error(message, ...args); break;
      case 1: this.logger.warn(message, ...args); break;
      case 2: this.logger.info(message, ...args); break;
      case 3: this.logger.debug(message, ...args); break;
      }
    } else {
      const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
        DebugSettingsEntity;
      
      if (DebugSettingsEntityClass && DebugSettingsEntityClass.shouldLogStatic(level)) {
        // DebugLogger未初期化時は静的ログ制御を使用
        switch(level) {
        case 0: console.error(`❌ ${message}`, ...args); break;
        case 1: console.warn(`⚠️ ${message}`, ...args); break;
        case 2: console.log(`🔧 ${message}`, ...args); break;
        case 3: console.log(`🐛 ${message}`, ...args); break;
        }
      }
    }
    // レベルが許可されていない場合は何も出力しない
  }

  /**
   * デバッグ設定を取得（popup/content script共通）
   */
  async getDebugSettings(): Promise<DebugSettingsEntity> {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Loading debug settings from unified storage');
      
      if (!this.storageAdapter) {
        throw new Error('StorageAdapter is not available');
      }
      
      // 統一されたストレージから設定を読み込み
      const settingsData = await this.storageAdapter.loadSettings();
      const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
        DebugSettingsEntity;
      
      const entity = DebugSettingsEntityClass.fromPlainObject(settingsData);
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Loaded debug settings:', entity.getSyncInfo());
      return entity;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to load debug settings:', error);
      // フォールバックとしてデフォルト設定を返す
      const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
        DebugSettingsEntity;
      return DebugSettingsEntityClass.getDefault();
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
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to check if debug enabled:', error);
      return false;
    }
  }

  /**
   * デバッグ設定を保存（popup/content script共通）
   */
  async saveDebugSettings(debugSettings: DebugSettingsEntity | any): Promise<DebugSettingsEntity> {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Saving debug settings to unified storage');
      
      if (!this.storageAdapter) {
        throw new Error('StorageAdapter is not available');
      }
      
      const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
        DebugSettingsEntity;
      
      // エンティティの妥当性検証
      if (!(debugSettings instanceof DebugSettingsEntityClass)) {
        debugSettings = DebugSettingsEntityClass.fromPlainObject(debugSettings);
      }
      debugSettings.validate();
      
      // 統一されたストレージに保存（popup/content script両方で同期）
      const savedSettings = await this.storageAdapter.saveSettings(debugSettings.toStorageFormat());
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug settings saved successfully:', savedSettings);
      
      // 設定変更通知（コールバック実行）
      this.notifySettingsChanged(debugSettings);
      
      return DebugSettingsEntityClass.fromPlainObject(savedSettings);
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to save debug settings:', error);
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
    
    if (!this.storageAdapter) {
      throw new Error('StorageAdapter is not available');
    }
    
    // コールバックを登録
    this.syncCallbacks.add(callback);
    
    // 初回のみストレージリスナーを開始
    if (!this.isListenerStarted) {
      this.storageAdapter.startChangeListener((changes: any) => {
        this.logWithLevel(2, 'DebugSettingsUseCase: Settings change detected:', {
          old: changes.oldSettings,
          new: changes.newSettings
        });
        
        try {
          const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
            DebugSettingsEntity;
          
          const newEntity = DebugSettingsEntityClass.fromPlainObject(changes.newSettings);
          const oldEntity = changes.oldSettings ? DebugSettingsEntityClass.fromPlainObject(changes.oldSettings) : null;
          
          // 全ての登録されたコールバックを実行
          this.syncCallbacks.forEach(cb => {
            try {
              cb(newEntity, oldEntity);
            } catch (error) {
              this.logWithLevel(0, 'DebugSettingsUseCase: Callback failed:', error);
            }
          });
          
        } catch (error) {
          this.logWithLevel(0, 'DebugSettingsUseCase: Failed to process settings change:', error);
        }
      });
      
      this.isListenerStarted = true;
      this.logWithLevel(2, 'DebugSettingsUseCase: Sync listener started');
    }
  }

  /**
   * デバッグ設定の変更監視を停止
   */
  stopSyncListener(callback?: (newEntity: any, oldEntity: any) => void): void {
    if (callback) {
      this.syncCallbacks.delete(callback);
    } else {
      this.syncCallbacks.clear();
    }
    
    // 全てのコールバックが削除された場合はストレージリスナーも停止
    if (this.syncCallbacks.size === 0 && this.storageAdapter) {
      this.storageAdapter.stopChangeListener();
      this.isListenerStarted = false;
      this.logWithLevel(2, 'DebugSettingsUseCase: Sync listener stopped');
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug enabled toggled:', newState);
      return newState;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to toggle debug enabled:', error);
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Show status toggled:', newState);
      return newState;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to toggle show status:', error);
      throw error;
    }
  }

  /**
   * ログレベルを更新
   */
  async updateLogLevel(level: number): Promise<boolean> {
    try {
      const debugSettings = await this.getDebugSettings();
      debugSettings.setLogLevel(level);
      
      await this.saveDebugSettings(debugSettings);
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Log level updated:', level);
      return true;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update log level:', error);
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Status position updated:', position);
      return true;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update status position:', error);
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
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Multiple settings updated:', newSettings);
      return updatedSettings;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to update multiple settings:', error);
      throw error;
    }
  }

  /**
   * 🎯 新機能：popup-content script間の同期状態を確認
   */
  async validateSyncConsistency(): Promise<SyncConsistencyResult> {
    try {
      if (!this.storageAdapter) {
        return {
          isConsistent: false,
          error: 'StorageAdapter is not available'
        };
      }
      
      const currentState = await this.storageAdapter.getCurrentState();
      
      if (!currentState) {
        return {
          isConsistent: false,
          error: 'Failed to get current state'
        };
      }
      
      return {
        isConsistent: true,
        storageType: currentState.storageType,
        settings: currentState.settings,
        timestamp: currentState.timestamp,
        listenerCount: currentState.listenerCount
      };
      
    } catch (error) {
      console.error('❌ DebugSettingsUseCase: Failed to validate sync consistency:', error);
      return {
        isConsistent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 🎯 新機能：旧形式データの確認と移行
   */
  async checkAndMigrateLegacyData(): Promise<LegacyMigrationResult> {
    try {
      if (!this.storageAdapter) {
        return { hadLegacyData: false, error: 'StorageAdapter is not available' };
      }
      
      const legacyCheck = await this.storageAdapter.checkLegacyData();
      
      if (legacyCheck.hasLegacyData) {
        this.logWithLevel(1, 'DebugSettingsUseCase: Legacy local storage data detected');
        
        const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
          DebugSettingsEntity;
        
        // 現在の設定と旧データを比較
        const currentSettings = await this.getDebugSettings();
        const legacyEntity = DebugSettingsEntityClass.fromPlainObject(legacyCheck.legacyData);
        
        const consistencyCheck = currentSettings.validateSyncConsistency(legacyEntity);
        
        if (!consistencyCheck.isConsistent) {
          this.logWithLevel(1, 'DebugSettingsUseCase: Inconsistency detected, cleaning up legacy data');
          await this.storageAdapter.cleanupLegacyData();
        }
        
        return {
          hadLegacyData: true,
          wasInconsistent: !consistencyCheck.isConsistent,
          cleanedUp: !consistencyCheck.isConsistent
        };
      }
      
      return { hadLegacyData: false };
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to check/migrate legacy data:', error);
      return { 
        hadLegacyData: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * デバッグ設定を初期化（初回起動時）
   */
  async initializeDebugSettings(): Promise<DebugSettingsEntity> {
    try {
      this.logWithLevel(2, 'DebugSettingsUseCase: Initializing debug settings');
      
      // 旧データの確認と移行
      await this.checkAndMigrateLegacyData();
      
      const existingSettings = await this.getDebugSettings();
      
      // 既に設定が存在する場合はそのまま使用
      if (existingSettings && existingSettings.enabled !== undefined) {
        this.logWithLevel(2, 'DebugSettingsUseCase: Using existing debug settings');
        return existingSettings;
      }
      
      const DebugSettingsEntityClass = (typeof window !== 'undefined' && (window as any).DebugSettingsEntity) || 
        DebugSettingsEntity;
      
      // デフォルト設定を保存
      const defaultSettings = DebugSettingsEntityClass.getDefault();
      const savedSettings = await this.saveDebugSettings(defaultSettings);
      
      this.logWithLevel(2, 'DebugSettingsUseCase: Debug settings initialized with defaults');
      return savedSettings;
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to initialize debug settings:', error);
      throw error;
    }
  }

  /**
   * 設定変更通知（内部用）
   */
  private notifySettingsChanged(newSettings: DebugSettingsEntity): void {
    this.logWithLevel(2, 'DebugSettingsUseCase: Notifying settings change:', newSettings.getSyncInfo());
  }

  /**
   * デバッグ情報の取得（診断用）
   */
  async getDebugInfo(): Promise<DebugInfo> {
    try {
      const settings = await this.getDebugSettings();
      const storageState = this.storageAdapter ? await this.storageAdapter.getCurrentState() : null;
      
      return {
        useCase: 'DebugSettingsUseCase',
        settings: settings.getSyncInfo(),
        storage: storageState,
        listeners: {
          syncCallbacks: this.syncCallbacks.size,
          isListenerStarted: this.isListenerStarted
        },
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.logWithLevel(0, 'DebugSettingsUseCase: Failed to get debug info:', error);
      return {
        useCase: 'DebugSettingsUseCase',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }
}

// ブラウザ環境での互換性
if (typeof window !== 'undefined') {
  (window as any).DebugSettingsUseCase = DebugSettingsUseCase;
}