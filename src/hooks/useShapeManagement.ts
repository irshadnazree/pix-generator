import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ShapeData, ShapeType } from '../constants/pixel-shape';

// Normalized shape state for O(1) lookups and updates
interface NormalizedShapes {
  ids: number[];
  entities: Record<number, ShapeData>;
}

export const useShapeManagement = () => {
  // Normalized shape data - O(1) lookups and efficient updates
  const [shapeState, setShapeState] = useState<NormalizedShapes>({
    ids: [],
    entities: {},
  });
  const [selectedShapeId, setSelectedShapeId] = useState<number | null>(null);

  // Form state
  const [currentShapeType, setCurrentShapeType] =
    useState<ShapeType>('ellipse');
  const [width, setWidth] = useState<number | null>(10);
  const [height, setHeight] = useState<number | null>(10);
  const [currentShapeBaseColor, setCurrentShapeBaseColor] = useState('#007BFF');
  const [currentShapeOpacity, setCurrentShapeOpacity] = useState(1);

  // Denormalized shapes array for consumers (memoized)
  const shapes = useMemo(
    () => shapeState.ids.map((id) => shapeState.entities[id]),
    [shapeState.ids, shapeState.entities]
  );

  // Selected shape object (O(1) lookup)
  const selectedShapeObject = useMemo(
    () => (selectedShapeId ? shapeState.entities[selectedShapeId] : undefined),
    [shapeState.entities, selectedShapeId]
  );

  const isEditing = selectedShapeId !== null;

  // Reset form to default values
  const resetFormToDefaults = useCallback(() => {
    setSelectedShapeId(null);
    setCurrentShapeType('ellipse');
    setWidth(10);
    setHeight(10);
    setCurrentShapeBaseColor('#007BFF');
    setCurrentShapeOpacity(1);
  }, []);

  // Sync form with selected shape
  useEffect(() => {
    if (selectedShapeObject) {
      setWidth(selectedShapeObject.width);
      setHeight(selectedShapeObject.height);
      setCurrentShapeBaseColor(selectedShapeObject.baseColor);
      setCurrentShapeOpacity(selectedShapeObject.opacity);
      setCurrentShapeType(selectedShapeObject.type);
    }
  }, [selectedShapeObject]);

  // Form change handlers
  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value === '') {
        setWidth(null);
      } else {
        const numValue = parseInt(value);
        setWidth(isNaN(numValue) ? null : numValue);
      }
    },
    []
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value === '') {
        setHeight(null);
      } else {
        const numValue = parseInt(value);
        setHeight(isNaN(numValue) ? null : numValue);
      }
    },
    []
  );

  const handleOpacityChange = useCallback(
    (value: number[]) => setCurrentShapeOpacity(value[0]),
    []
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setCurrentShapeBaseColor(e.target.value),
    []
  );

  const handleShapeTypeChange = useCallback(
    (type: ShapeType) => setCurrentShapeType(type),
    []
  );

  // Validation helper
  const validateDimensions = useCallback(() => {
    const errors: string[] = [];

    if (width === null || width <= 0) {
      errors.push('Width must be a positive number');
    }

    if (height === null || height <= 0) {
      errors.push('Height must be a positive number');
    }

    return errors;
  }, [width, height]);

  // Shape operations
  const addShape = useCallback(
    (position: { x: number; y: number }) => {
      const validationErrors = validateDimensions();

      if (validationErrors.length > 0) {
        alert(`Cannot add shape:\n${validationErrors.join('\n')}`);
        return;
      }

      const newShapeId = Date.now();
      const newShape: ShapeData = {
        id: newShapeId,
        type: currentShapeType,
        width: width!,
        height: height!,
        baseColor: currentShapeBaseColor,
        opacity: currentShapeOpacity,
        position: { x: Math.round(position.x), y: Math.round(position.y) },
      };

      setShapeState((prev) => ({
        ids: [...prev.ids, newShapeId],
        entities: { ...prev.entities, [newShapeId]: newShape },
      }));
      resetFormToDefaults();
    },
    [
      width,
      height,
      currentShapeBaseColor,
      currentShapeOpacity,
      currentShapeType,
      resetFormToDefaults,
      validateDimensions,
    ]
  );

  const updateSelectedShape = useCallback(() => {
    if (!selectedShapeId) return;

    const validationErrors = validateDimensions();

    if (validationErrors.length > 0) {
      alert(`Cannot update shape:\n${validationErrors.join('\n')}`);
      return;
    }

    setShapeState((prev) => {
      const existingShape = prev.entities[selectedShapeId];
      if (!existingShape) return prev;

      return {
        ...prev,
        entities: {
          ...prev.entities,
          [selectedShapeId]: {
            ...existingShape,
            width: width!,
            height: height!,
            baseColor: currentShapeBaseColor,
            opacity: currentShapeOpacity,
          },
        },
      };
    });
    resetFormToDefaults();
  }, [
    selectedShapeId,
    width,
    height,
    currentShapeBaseColor,
    currentShapeOpacity,
    resetFormToDefaults,
    validateDimensions,
  ]);

  const handleFormSubmit = useCallback(
    (getNewShapePosition: () => { x: number; y: number }) => {
      if (isEditing) {
        updateSelectedShape();
      } else {
        const position = getNewShapePosition();
        addShape(position);
      }
    },
    [isEditing, addShape, updateSelectedShape]
  );

  const removeShape = useCallback(
    (id: number) => {
      setShapeState((prev) => {
        const { [id]: removed, ...remainingEntities } = prev.entities;
        return {
          ids: prev.ids.filter((shapeId) => shapeId !== id),
          entities: remainingEntities,
        };
      });
      if (selectedShapeId === id) {
        resetFormToDefaults();
      }
    },
    [selectedShapeId, resetFormToDefaults]
  );

  // O(1) position update - only modifies the specific entity
  const moveShape = useCallback(
    (id: number, position: { x: number; y: number }) => {
      setShapeState((prev) => {
        const existingShape = prev.entities[id];
        if (!existingShape) return prev;

        return {
          ...prev,
          entities: {
            ...prev.entities,
            [id]: { ...existingShape, position },
          },
        };
      });
    },
    []
  );

  // Layer operations - only modify ids array, entities stay untouched
  const handleMoveShapeLayer = useCallback(
    (shapeId: number, direction: string) => {
      setShapeState((prev) => {
        const currentIndex = prev.ids.indexOf(shapeId);
        if (currentIndex === -1) return prev;

        const newIds = [...prev.ids];
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
              Math.min(prev.ids.length - 1, currentIndex + 1),
              0,
              shapeId
            );
            break;
          case 'backward':
            newIds.splice(Math.max(0, currentIndex - 1), 0, shapeId);
            break;
          default:
            newIds.splice(currentIndex, 0, shapeId); // No change
        }

        return { ...prev, ids: newIds };
      });
    },
    []
  );

  // Reorder - only modify ids array
  const reorderShapes = useCallback((fromIndex: number, toIndex: number) => {
    setShapeState((prev) => {
      const newIds = [...prev.ids];
      const [movedId] = newIds.splice(fromIndex, 1);
      newIds.splice(toIndex, 0, movedId);
      return { ...prev, ids: newIds };
    });
  }, []);

  return {
    // Shape data (denormalized for consumers)
    shapes,
    selectedShapeId,
    selectedShapeObject,
    isEditing,

    // Form state
    currentShapeType,
    width,
    height,
    currentShapeBaseColor,
    currentShapeOpacity,

    // Form handlers
    handleWidthChange,
    handleHeightChange,
    handleOpacityChange,
    handleColorChange,
    handleShapeTypeChange,

    // Shape operations
    addShape,
    updateSelectedShape,
    handleFormSubmit,
    removeShape,
    moveShape,
    handleMoveShapeLayer,
    reorderShapes,

    // Selection
    setSelectedShapeId,
    resetFormToDefaults,
  };
};
