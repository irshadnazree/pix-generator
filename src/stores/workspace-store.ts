import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { ShapeData, ShapeType } from '../constants/pixel-shape';
import { MAX_ZOOM, MIN_ZOOM } from '../constants/pixel-shape';

// ============================================================================
// Types
// ============================================================================

interface NormalizedShapes {
  ids: number[];
  entities: Record<number, ShapeData>;
}

interface WorkspaceState {
  // Shape state (normalized for O(1) lookups)
  shapeState: NormalizedShapes;
  selectedShapeId: number | null;

  // Form state
  currentShapeType: ShapeType;
  formWidth: number | null;
  formHeight: number | null;
  formBaseColor: string;
  formOpacity: number;

  // View state
  zoom: number;
  canvasOffset: { x: number; y: number };

  // UI state
  isControlsPanelOpen: boolean;
  isShapeListOpen: boolean;
}

interface WorkspaceActions {
  // Shape actions
  addShape: (position: { x: number; y: number }) => boolean;
  updateSelectedShape: () => boolean;
  removeShape: (id: number) => void;
  moveShape: (id: number, position: { x: number; y: number }) => void;
  moveShapeLayer: (shapeId: number, direction: string) => void;
  reorderShapes: (fromIndex: number, toIndex: number) => void;

  // Selection
  setSelectedShapeId: (id: number | null) => void;
  resetFormToDefaults: () => void;

  // Form actions
  setCurrentShapeType: (type: ShapeType) => void;
  setFormWidth: (width: number | null) => void;
  setFormHeight: (height: number | null) => void;
  setFormBaseColor: (color: string) => void;
  setFormOpacity: (opacity: number) => void;

  // View actions
  setZoom: (zoom: number) => void;
  setCanvasOffset: (offset: { x: number; y: number }) => void;
  updateView: (zoom: number, offset: { x: number; y: number }) => void;
  resetView: (viewportWidth: number, viewportHeight: number) => void;

  // UI actions
  setControlsPanelOpen: (open: boolean) => void;
  setShapeListOpen: (open: boolean) => void;
  toggleControlsPanel: () => void;
  toggleShapeList: () => void;

  // Hydration
  hydrate: (data: Partial<PersistedWorkspace>) => void;
}

export interface PersistedWorkspace {
  version: number;
  shapes: ShapeData[];
  zoom: number;
  canvasOffset: { x: number; y: number };
  isControlsPanelOpen: boolean;
  isShapeListOpen: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeShapes(shapes: ShapeData[]): NormalizedShapes {
  const ids: number[] = [];
  const entities: Record<number, ShapeData> = {};

  for (const shape of shapes) {
    ids.push(shape.id);
    entities[shape.id] = shape;
  }

  return { ids, entities };
}

function denormalizeShapes(state: NormalizedShapes): ShapeData[] {
  return state.ids.map((id) => state.entities[id]);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================================================
// Store
// ============================================================================

const DEFAULT_STATE: WorkspaceState = {
  shapeState: { ids: [], entities: {} },
  selectedShapeId: null,
  currentShapeType: 'ellipse',
  formWidth: 10,
  formHeight: 10,
  formBaseColor: '#007BFF',
  formOpacity: 1,
  zoom: 10,
  canvasOffset: { x: 0, y: 0 },
  isControlsPanelOpen: false,
  isShapeListOpen: false,
};

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()(
  subscribeWithSelector((set, get) => ({
    ...DEFAULT_STATE,

    // ========================================================================
    // Shape actions
    // ========================================================================

    addShape: (position) => {
      const { formWidth, formHeight, formBaseColor, formOpacity, currentShapeType } = get();

      if (formWidth === null || formWidth <= 0 || formHeight === null || formHeight <= 0) {
        return false;
      }

      const newShapeId = Date.now();
      const newShape: ShapeData = {
        id: newShapeId,
        type: currentShapeType,
        width: formWidth,
        height: formHeight,
        baseColor: formBaseColor,
        opacity: formOpacity,
        position: { x: Math.round(position.x), y: Math.round(position.y) },
      };

      set((state) => ({
        shapeState: {
          ids: [...state.shapeState.ids, newShapeId],
          entities: { ...state.shapeState.entities, [newShapeId]: newShape },
        },
        // Reset form after adding
        selectedShapeId: null,
        currentShapeType: 'ellipse',
        formWidth: 10,
        formHeight: 10,
        formBaseColor: '#007BFF',
        formOpacity: 1,
      }));

      return true;
    },

    updateSelectedShape: () => {
      const { selectedShapeId, formWidth, formHeight, formBaseColor, formOpacity } = get();

      if (!selectedShapeId) return false;
      if (formWidth === null || formWidth <= 0 || formHeight === null || formHeight <= 0) {
        return false;
      }

      set((state) => {
        const existingShape = state.shapeState.entities[selectedShapeId];
        if (!existingShape) return state;

        return {
          shapeState: {
            ...state.shapeState,
            entities: {
              ...state.shapeState.entities,
              [selectedShapeId]: {
                ...existingShape,
                width: formWidth,
                height: formHeight,
                baseColor: formBaseColor,
                opacity: formOpacity,
              },
            },
          },
          // Reset form after updating
          selectedShapeId: null,
          currentShapeType: 'ellipse',
          formWidth: 10,
          formHeight: 10,
          formBaseColor: '#007BFF',
          formOpacity: 1,
        };
      });

      return true;
    },

    removeShape: (id) => {
      set((state) => {
        const { [id]: _, ...remainingEntities } = state.shapeState.entities;
        const newIds = state.shapeState.ids.filter((shapeId) => shapeId !== id);

        // If deleted shape was selected, select first remaining or null
        let newSelectedId = state.selectedShapeId;
        if (state.selectedShapeId === id) {
          newSelectedId = newIds.length > 0 ? newIds[0] : null;
        }

        return {
          shapeState: {
            ids: newIds,
            entities: remainingEntities,
          },
          selectedShapeId: newSelectedId,
        };
      });
    },

    moveShape: (id, position) => {
      set((state) => {
        const existingShape = state.shapeState.entities[id];
        if (!existingShape) return state;

        return {
          shapeState: {
            ...state.shapeState,
            entities: {
              ...state.shapeState.entities,
              [id]: { ...existingShape, position },
            },
          },
        };
      });
    },

    moveShapeLayer: (shapeId, direction) => {
      set((state) => {
        const currentIndex = state.shapeState.ids.indexOf(shapeId);
        if (currentIndex === -1) return state;

        const newIds = [...state.shapeState.ids];
        newIds.splice(currentIndex, 1);

        switch (direction) {
          case 'toFront':
            newIds.push(shapeId);
            break;
          case 'toBack':
            newIds.unshift(shapeId);
            break;
          case 'forward':
            newIds.splice(
              Math.min(state.shapeState.ids.length - 1, currentIndex + 1),
              0,
              shapeId
            );
            break;
          case 'backward':
            newIds.splice(Math.max(0, currentIndex - 1), 0, shapeId);
            break;
          default:
            newIds.splice(currentIndex, 0, shapeId);
        }

        return {
          shapeState: { ...state.shapeState, ids: newIds },
        };
      });
    },

    reorderShapes: (fromIndex, toIndex) => {
      set((state) => {
        const newIds = [...state.shapeState.ids];
        const [movedId] = newIds.splice(fromIndex, 1);
        newIds.splice(toIndex, 0, movedId);
        return {
          shapeState: { ...state.shapeState, ids: newIds },
        };
      });
    },

    // ========================================================================
    // Selection
    // ========================================================================

    setSelectedShapeId: (id) => {
      const state = get();
      const shape = id ? state.shapeState.entities[id] : null;

      if (shape) {
        // Sync form with selected shape
        set({
          selectedShapeId: id,
          formWidth: shape.width,
          formHeight: shape.height,
          formBaseColor: shape.baseColor,
          formOpacity: shape.opacity,
          currentShapeType: shape.type,
        });
      } else {
        set({ selectedShapeId: null });
      }
    },

    resetFormToDefaults: () => {
      set({
        selectedShapeId: null,
        currentShapeType: 'ellipse',
        formWidth: 10,
        formHeight: 10,
        formBaseColor: '#007BFF',
        formOpacity: 1,
      });
    },

    // ========================================================================
    // Form actions
    // ========================================================================

    setCurrentShapeType: (type) => set({ currentShapeType: type }),
    setFormWidth: (width) => set({ formWidth: width }),
    setFormHeight: (height) => set({ formHeight: height }),
    setFormBaseColor: (color) => set({ formBaseColor: color }),
    setFormOpacity: (opacity) => set({ formOpacity: opacity }),

    // ========================================================================
    // View actions
    // ========================================================================

    setZoom: (zoom) => set({ zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM) }),
    setCanvasOffset: (offset) => set({ canvasOffset: offset }),

    updateView: (zoom, offset) =>
      set({
        zoom: clamp(zoom, MIN_ZOOM, MAX_ZOOM),
        canvasOffset: offset,
      }),

    resetView: (viewportWidth, viewportHeight) => {
      const { shapeState } = get();
      const shapes = denormalizeShapes(shapeState);
      const PADDING = 50;

      let newZoom = 10;
      let newOffset = { x: 0, y: 0 };

      if (shapes.length > 0) {
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;

        for (const shape of shapes) {
          minX = Math.min(minX, shape.position.x);
          minY = Math.min(minY, shape.position.y);
          maxX = Math.max(maxX, shape.position.x + shape.width);
          maxY = Math.max(maxY, shape.position.y + shape.height);
        }

        const worldW = maxX - minX;
        const worldH = maxY - minY;

        if (worldW > 0 && worldH > 0) {
          const availableW = Math.max(1, viewportWidth - 2 * PADDING);
          const availableH = Math.max(1, viewportHeight - 2 * PADDING);

          const zoomToFitW = availableW / worldW;
          const zoomToFitH = availableH / worldH;
          newZoom = clamp(Math.min(zoomToFitW, zoomToFitH), MIN_ZOOM, MAX_ZOOM);

          const worldCenterX = (minX + maxX) / 2;
          const worldCenterY = (minY + maxY) / 2;
          const viewportCenterX = viewportWidth / 2;
          const viewportCenterY = viewportHeight / 2;

          newOffset = {
            x: viewportCenterX - worldCenterX * newZoom,
            y: viewportCenterY - worldCenterY * newZoom,
          };
        }
      }

      set({ zoom: newZoom, canvasOffset: newOffset });
    },

    // ========================================================================
    // UI actions
    // ========================================================================

    setControlsPanelOpen: (open) => set({ isControlsPanelOpen: open }),
    setShapeListOpen: (open) => set({ isShapeListOpen: open }),
    toggleControlsPanel: () =>
      set((state) => ({ isControlsPanelOpen: !state.isControlsPanelOpen })),
    toggleShapeList: () =>
      set((state) => ({ isShapeListOpen: !state.isShapeListOpen })),

    // ========================================================================
    // Hydration
    // ========================================================================

    hydrate: (data) => {
      const shapes = data.shapes ?? [];
      const shapeState = normalizeShapes(shapes);

      // Don't restore selection - always start with no selection on refresh
      set({
        shapeState,
        selectedShapeId: null,
        zoom: clamp(data.zoom ?? 10, MIN_ZOOM, MAX_ZOOM),
        canvasOffset: data.canvasOffset ?? { x: 0, y: 0 },
        isControlsPanelOpen: data.isControlsPanelOpen ?? false,
        isShapeListOpen: data.isShapeListOpen ?? false,
      });
    },
  }))
);

// ============================================================================
// Selectors (for performance - avoid re-renders)
// ============================================================================

export const selectShapes = (state: WorkspaceState): ShapeData[] =>
  state.shapeState.ids.map((id) => state.shapeState.entities[id]);

export const selectSelectedShape = (
  state: WorkspaceState
): ShapeData | undefined =>
  state.selectedShapeId
    ? state.shapeState.entities[state.selectedShapeId]
    : undefined;

export const selectIsEditing = (state: WorkspaceState): boolean =>
  state.selectedShapeId !== null;

// ============================================================================
// Persistence helpers
// ============================================================================

export function getPersistedWorkspace(): PersistedWorkspace {
  const state = useWorkspaceStore.getState();
  return {
    version: 1,
    shapes: denormalizeShapes(state.shapeState),
    zoom: state.zoom,
    canvasOffset: state.canvasOffset,
    isControlsPanelOpen: state.isControlsPanelOpen,
    isShapeListOpen: state.isShapeListOpen,
  };
}
