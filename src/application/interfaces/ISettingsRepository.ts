/**
 * ISettingsRepository - Settings Repository Interface
 * Clean Architecture - Application層のインターフェース定義
 * 依存性逆転原則（DIP）に従い、UseCaseが依存するRepositoryの契約を定義
 */

import { Settings } from "../../domain/entities/Settings";

export interface SettingsValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ISettingsRepository {
  getSettings(): Promise<Settings>;
  updateSetting(key: string, value: unknown): Promise<Settings>;
  updateStrokeSettings(color: string, width: number): Promise<Settings>;
  updateThreshold(threshold: number): Promise<Settings>;
  updateGestureState(gestureId: string, enabled: boolean): Promise<Settings>;
  addExcludeSite(pattern: string): Promise<Settings>;
  removeExcludeSite(pattern: string): Promise<Settings>;
  updateDebugSettings(debugConfig: Record<string, unknown>): Promise<Settings>;
  resetToDefaults(): Promise<Settings>;
  validateSettings(): Promise<SettingsValidationResult>;
  onSettingsChanged(callback: (newSettings: Settings, oldSettings?: Settings) => void): () => void;
}
