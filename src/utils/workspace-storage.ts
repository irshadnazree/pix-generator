import type { ShapeData } from '../constants/pixel-shape';
import { MAX_ZOOM, MIN_ZOOM } from '../constants/pixel-shape';

const STORAGE_KEY = 'pixel-shape-workspace';
const VERSION = 1;

export interface WorkspaceState {
  version: number;
  shapes: ShapeData[];
  selectedShapeId: number | null;
  zoom: number;
  canvasOffset: { x: number; y: number };
  isControlsPanelOpen: boolean;
  isShapeListOpen: boolean;
}

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
export function loadWorkspace(): WorkspaceState | null {
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

    // Validate selectedShapeId - must exist in shapes or fall back to first shape
    let selectedShapeId: number | null = null;
    if (typeof parsed.selectedShapeId === 'number') {
      const exists = validShapes.some(
        (s: ShapeData) => s.id === parsed.selectedShapeId
      );
      if (exists) {
        selectedShapeId = parsed.selectedShapeId;
      } else if (validShapes.length > 0) {
        // Fall back to first shape if stored selection is invalid
        selectedShapeId = validShapes[0].id;
      }
    } else if (validShapes.length > 0) {
      // If no selection stored but shapes exist, select first
      selectedShapeId = validShapes[0].id;
    }

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
      selectedShapeId,
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
export function saveWorkspace(state: WorkspaceState): void {
  if (typeof window === 'undefined') return;

  try {
    const payload: WorkspaceState = {
      version: VERSION,
      shapes: state.shapes,
      selectedShapeId: state.selectedShapeId,
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
