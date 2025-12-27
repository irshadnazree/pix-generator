import type { ShapeData } from '../constants/pixel-shape';
import { MAX_ZOOM, MIN_ZOOM } from '../constants/pixel-shape';
import {
  getPersistedWorkspace,
  type PersistedWorkspace,
  useWorkspaceStore,
} from '../stores/workspace-store';

const STORAGE_KEY = 'pixel-shape-workspace';
const VERSION = 1;
const DEBOUNCE_MS = 400;

// Re-export type for external use
export type { PersistedWorkspace as WorkspaceState };

/**
 * Validates that a shape has all required fields with correct types.
 */
function isValidShape(shape: unknown): shape is ShapeData {
  if (typeof shape !== 'object' || shape === null) return false;

  const s = shape as Record<string, unknown>;

  return (
    typeof s.id === 'number' &&
    typeof s.type === 'string' &&
    ['ellipse', 'crescent', 'box'].includes(s.type) &&
    typeof s.width === 'number' &&
    s.width > 0 &&
    typeof s.height === 'number' &&
    s.height > 0 &&
    typeof s.baseColor === 'string' &&
    typeof s.opacity === 'number' &&
    s.opacity >= 0 &&
    s.opacity <= 1 &&
    typeof s.position === 'object' &&
    s.position !== null &&
    typeof (s.position as { x: unknown; y: unknown }).x === 'number' &&
    typeof (s.position as { x: unknown; y: unknown }).y === 'number'
  );
}

/**
 * Clamps a number between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Loads workspace state from localStorage.
 * Returns null if storage is empty, corrupt, or unavailable.
 */
export function loadWorkspace(): PersistedWorkspace | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);

    // Basic structure validation
    if (typeof parsed !== 'object' || parsed === null) return null;
    if (parsed.version !== VERSION) return null;

    // Validate shapes array
    if (!Array.isArray(parsed.shapes)) return null;
    const validShapes = parsed.shapes.filter(isValidShape);

    // Validate and clamp zoom
    const zoom =
      typeof parsed.zoom === 'number'
        ? clamp(parsed.zoom, MIN_ZOOM, MAX_ZOOM)
        : 10;

    // Validate canvas offset
    const canvasOffset =
      typeof parsed.canvasOffset === 'object' &&
      parsed.canvasOffset !== null &&
      typeof parsed.canvasOffset.x === 'number' &&
      typeof parsed.canvasOffset.y === 'number'
        ? { x: parsed.canvasOffset.x, y: parsed.canvasOffset.y }
        : { x: 0, y: 0 };

    // Validate booleans with defaults
    const isControlsPanelOpen =
      typeof parsed.isControlsPanelOpen === 'boolean'
        ? parsed.isControlsPanelOpen
        : false;
    const isShapeListOpen =
      typeof parsed.isShapeListOpen === 'boolean'
        ? parsed.isShapeListOpen
        : false;

    return {
      version: VERSION,
      shapes: validShapes,
      zoom,
      canvasOffset,
      isControlsPanelOpen,
      isShapeListOpen,
    };
  } catch (error) {
    console.warn('Failed to load workspace from localStorage', error);
    return null;
  }
}

/**
 * Saves workspace state to localStorage.
 */
export function saveWorkspace(state: PersistedWorkspace): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: PersistedWorkspace = {
      version: VERSION,
      shapes: state.shapes,
      zoom: clamp(state.zoom, MIN_ZOOM, MAX_ZOOM),
      canvasOffset: state.canvasOffset,
      isControlsPanelOpen: state.isControlsPanelOpen,
      isShapeListOpen: state.isShapeListOpen,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('Failed to save workspace to localStorage', error);
  }
}

/**
 * Initializes the workspace store from localStorage and sets up
 * debounced persistence on state changes.
 * Call this once at app startup.
 */
export function initWorkspacePersistence(): () => void {
  // Hydrate store from localStorage
  const persisted = loadWorkspace();
  if (persisted) {
    useWorkspaceStore.getState().hydrate(persisted);
  }

  // Set up debounced persistence
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Subscribe to all state changes (debounced save handles frequency)
  const unsubscribe = useWorkspaceStore.subscribe((state, prevState) => {
    // Only save if relevant state changed
    const shapesChanged = state.shapeState !== prevState.shapeState;
    const viewChanged =
      state.zoom !== prevState.zoom ||
      state.canvasOffset !== prevState.canvasOffset;
    const uiChanged =
      state.isControlsPanelOpen !== prevState.isControlsPanelOpen ||
      state.isShapeListOpen !== prevState.isShapeListOpen;

    if (!shapesChanged && !viewChanged && !uiChanged) {
      return;
    }

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      saveWorkspace(getPersistedWorkspace());
    }, DEBOUNCE_MS);
  });

  // Return cleanup function
  return () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    unsubscribe();
  };
}
