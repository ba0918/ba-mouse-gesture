/**
 * Infrastructure Layer Index
 * インフラストラクチャ層の統一エクスポート
 */

// Storage
const { ChromeStorage } = require('./storage/ChromeStorage')
const { SettingsRepository, SettingsRepositoryError } = require('./storage/repositories/SettingsRepository')
const { GestureRepository, GestureRepositoryError } = require('./storage/repositories/GestureRepository')

// Messaging
const { ChromeMessaging, ChromeMessagingError } = require('./messaging/ChromeMessaging')

// Browser
const { ChromeBrowser, ChromeBrowserError } = require('./browser/ChromeBrowser')

module.exports = {
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
}