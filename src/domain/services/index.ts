/**
 * Domain layer services
 * TypeScript service exports for clean architecture
 */

export { PatternMatcher, MatchResult, BestMatchResult, type MatchingStrategy } from './PatternMatcher'
export { GestureRecognizer, MatchResult as GestureMatchResult } from './GestureRecognizer'
export { SimpleGestureRecognizer } from './SimpleGestureRecognizer'