/**
 * Domain Services Index
 * ドメインサービスの統一エクスポート
 */

// Dependencies are imported within each service module to avoid circular references

// Import services
const { GestureRecognizer, GestureRecognitionResult } = require('./GestureRecognizer')
const { PatternMatcher, MatchResult, BestMatchResult } = require('./PatternMatcher')
const { LearningEngine, LearningData, GestureUsage, PatternVariation, UserProfile } = require('./LearningEngine')

module.exports = {
  GestureRecognizer,
  GestureRecognitionResult,
  PatternMatcher,
  MatchResult,
  BestMatchResult,
  LearningEngine,
  LearningData,
  GestureUsage,
  PatternVariation,
  UserProfile
}