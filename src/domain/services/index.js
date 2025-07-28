/**
 * Domain Services Index
 * ドメインサービスの統一エクスポート
 */

// Dependencies are imported within each service module to avoid circular references

// Import services
const { GestureRecognizer, GestureRecognitionResult } = require('./GestureRecognizer')
const { PatternMatcher, MatchResult, BestMatchResult } = require('./PatternMatcher')

module.exports = {
  GestureRecognizer,
  GestureRecognitionResult,
  PatternMatcher,
  MatchResult,
  BestMatchResult
}