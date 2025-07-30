/**
 * Content Scripts 型定義
 * Clean Architecture - 型定義の分離
 */

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface GestureState {
  isRecording: boolean;
  trail: Point[];
  startPosition: Point | null;
  preventContextMenu: boolean;
}

export interface AppSettings {
  enabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  gestureThreshold: number;
  excludeList: string[];
  defaultGestureStates?: Record<string, boolean>;
  debugSettings?: {
    enabled: boolean;
    logLevel: number;
    showStatus: boolean;
    statusPosition: string;
  };
}

export interface GestureRecognitionResult {
  type: 'simple' | 'complex' | 'custom';
  action?: string;
  name?: string;
  confidence?: number;
}

export interface MessageResponse {
  success: boolean;
  action?: string;
  error?: string;
}

export interface ScrollMessage {
  type: 'scroll';
  direction: 'top' | 'bottom';
}

export interface DebugSettings {
  enabled: boolean;
  logLevel: number;
  showStatus: boolean;
  statusPosition: string;
  shouldShowStatus(): boolean;
}

export interface SimpleDebugUseCase {
  isDebugEnabled(): Promise<boolean>;
  getDebugSettings(): Promise<DebugSettings>;
}