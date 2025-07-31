/**
 * SettingsManagementUseCase
 * 設定管理のビジネスロジックを統合するUseCaseクラス
 * Clean Architecture - Application層
 */

import { Settings } from "../../domain/entities/Settings";
import { ILogger, ISettingsRepository, SettingsValidationResult } from "../interfaces";

interface SettingsChangeData {
  type: string;
  newSettings: Record<string, unknown>;
  oldSettings: Record<string, unknown> | null;
  timestamp: string;
}

export class SettingsManagementUseCase {
  private logger: ILogger;

  constructor(
    private settingsRepository: ISettingsRepository,
    logger?: ILogger,
  ) {
    this.logger = logger || {
      debug: () => { },
      info: () => { },
      warn: () => { },
      error: () => { },
    };
  }

  /**
   * 現在の設定を取得
   */
  async getCurrentSettings(): Promise<Settings> {
    try {
      return await this.settingsRepository.getSettings();
    } catch (error) {
      throw new SettingsManagementError("Failed to get current settings", error as Error);
    }
  }

  /**
   * 機能の有効/無効を切り替え
   */
  async toggleExtension(enabled: boolean): Promise<Settings> {
    try {
      const result = await this.settingsRepository.updateSetting("enabled", enabled);

      // 設定変更通知
      await this.notifySettingsChange("extension_toggled", { enabled });

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to toggle extension", error as Error);
    }
  }

  /**
   * 軌跡表示設定を更新
   */
  async updateStrokeSettings(color: string, width: number): Promise<Settings> {
    try {
      const result = await this.settingsRepository.updateStrokeSettings(color, width);

      // 設定変更通知
      await this.notifySettingsChange("stroke_settings_updated", { color, width });

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to update stroke settings", error as Error);
    }
  }

  /**
   * ジェスチャー検出閾値を更新
   */
  async updateGestureThreshold(threshold: number): Promise<Settings> {
    try {
      const result = await this.settingsRepository.updateThreshold(threshold);

      // 設定変更通知
      await this.notifySettingsChange("threshold_updated", { threshold });

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to update gesture threshold", error as Error);
    }
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え（標準ジェスチャーのみ）
   */
  async toggleGesture(gestureId: string, enabled: boolean): Promise<Settings> {
    try {
      // カスタムジェスチャーIDの場合はエラー
      if (gestureId.startsWith("custom_")) {
        throw new Error(
          `This method is for default gestures only. Use CustomGestureManagementUseCase for custom gestures: ${gestureId}`,
        );
      }

      this.logger.debug("FIXED - SettingsManagementUseCase with correct gesture ID:", { gestureId, enabled });

      const result = await this.settingsRepository.updateGestureState(gestureId, enabled);

      // 設定変更通知
      await this.notifySettingsChange("gesture_toggled", { gestureId, enabled });

      return result;
    } catch (error) {
      this.logger.error("SettingsManagementUseCase.toggleGesture failed:", error);
      throw new SettingsManagementError("Failed to toggle gesture", error as Error);
    }
  }

  /**
   * 除外サイトを追加
   */
  async addExcludeSite(pattern: string): Promise<Settings> {
    try {
      const result = await this.settingsRepository.addExcludeSite(pattern);

      // 設定変更通知
      await this.notifySettingsChange("exclude_site_added", { pattern });

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to add exclude site", error as Error);
    }
  }

  /**
   * 除外サイトを削除
   */
  async removeExcludeSite(pattern: string): Promise<Settings> {
    try {
      const result = await this.settingsRepository.removeExcludeSite(pattern);

      // 設定変更通知
      await this.notifySettingsChange("exclude_site_removed", { pattern });

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to remove exclude site", error as Error);
    }
  }

  /**
   * デバッグ設定を更新
   */
  async updateDebugSettings(debugConfig: Record<string, unknown>): Promise<Settings> {
    try {
      const result = await this.settingsRepository.updateDebugSettings(debugConfig);

      // 設定変更通知
      await this.notifySettingsChange("debug_settings_updated", debugConfig);

      return result;
    } catch (error) {
      this.logger.error("SettingsManagementUseCase.updateDebugSettings error:", error);
      throw new SettingsManagementError("Failed to update debug settings", error as Error);
    }
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<Settings> {
    try {
      const result = await this.settingsRepository.resetToDefaults();

      // 設定変更通知
      await this.notifySettingsChange("settings_reset", {});

      return result;
    } catch (error) {
      throw new SettingsManagementError("Failed to reset settings to defaults", error as Error);
    }
  }

  /**
   * 設定の整合性チェック
   */
  async validateCurrentSettings(): Promise<SettingsValidationResult> {
    try {
      return await this.settingsRepository.validateSettings();
    } catch (error) {
      throw new SettingsManagementError("Failed to validate settings", error as Error);
    }
  }

  /**
   * 設定変更の監視を開始
   */
  watchSettingsChanges(callback: (data: SettingsChangeData) => void): () => void {
    try {
      return this.settingsRepository.onSettingsChanged((newSettings, oldSettings) => {
        callback({
          type: "settings_changed",
          newSettings: newSettings.toJSON() as unknown as Record<string, unknown>,
          oldSettings: oldSettings ? oldSettings.toJSON() as unknown as Record<string, unknown> : null,
          timestamp: new Date().toISOString(),
        });
      });
    } catch (error) {
      this.logger.error("Failed to watch settings changes:", error);
      return () => { }; // 空の停止関数を返す
    }
  }

  private async notifySettingsChange(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      this.logger.debug("Settings changed:", { type, data, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error("Failed to notify settings change:", error);
    }
  }
}

/**
 * 設定管理専用エラークラス
 */
class SettingsManagementError extends Error {
  readonly originalError?: Error;

  constructor(message: string, originalError?: Error) {
    super(message);
    this.name = "SettingsManagementError";
    this.originalError = originalError;
  }
}
