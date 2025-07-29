/**
 * Infrastructure Layer Index
 * インフラストラクチャ層の統一エクスポート
 */

// Storage
import { ChromeStorage } from './storage/ChromeStorage.js';
import { SettingsRepository, SettingsRepositoryError } from './storage/repositories/SettingsRepository.js';
import { GestureRepository, GestureRepositoryError } from './storage/repositories/GestureRepository.js';

// Messaging
import { ChromeMessaging, ChromeMessagingError } from './messaging/ChromeMessaging.js';

// Browser
import { ChromeBrowser, ChromeBrowserError } from './browser/ChromeBrowser.js';

export {
  // Storage
  ChromeStorage,
  SettingsRepository,
  SettingsRepositoryError,
  GestureRepository,
  GestureRepositoryError,
  
  // Messaging
  ChromeMessaging,
  ChromeMessagingError,
  
  // Browser
  ChromeBrowser,
  ChromeBrowserError
};