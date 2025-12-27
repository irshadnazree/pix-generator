import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useTheme } from '../../contexts/ThemeContext';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import {
  selectIsEditing,
  selectSelectedShape,
  useWorkspaceStore,
} from '../../stores/workspace-store';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { FloatingCard } from '../ui/FloatingCard';
import { CanvasArea } from './CanvasArea';
import { ControlsPanel } from './ControlsPanel';
import { ShapeList } from './ShapeList';

export default function PixelShapeGenerator() {
  const { isDarkMode } = useTheme();

  // Read initial view values once (not subscribed)
  // Note: Persistence is initialized in main.tsx before React renders
  const initialView = useMemo(
    () => ({
      zoom: useWorkspaceStore.getState().zoom,
      canvasOffset: useWorkspaceStore.getState().canvasOffset,
    }),
    []
  );

  // Read shapes with shallow comparison to avoid new array references
  const shapes = useWorkspaceStore(
    useShallow((s) => s.shapeState.ids.map((id) => s.shapeState.entities[id]))
  );

  const selectedShapeId = useWorkspaceStore((s) => s.selectedShapeId);
  const selectedShapeObject = useWorkspaceStore(selectSelectedShape);
  const isEditing = useWorkspaceStore(selectIsEditing);

  const currentShapeType = useWorkspaceStore((s) => s.currentShapeType);
  const formWidth = useWorkspaceStore((s) => s.formWidth);
  const formHeight = useWorkspaceStore((s) => s.formHeight);
  const formBaseColor = useWorkspaceStore((s) => s.formBaseColor);
  const formOpacity = useWorkspaceStore((s) => s.formOpacity);

  const isControlsPanelOpen = useWorkspaceStore((s) => s.isControlsPanelOpen);
  const isShapeListOpen = useWorkspaceStore((s) => s.isShapeListOpen);

  // Actions from store
  const setSelectedShapeId = useWorkspaceStore((s) => s.setSelectedShapeId);
  const moveShape = useWorkspaceStore((s) => s.moveShape);
  const addShape = useWorkspaceStore((s) => s.addShape);
  const updateSelectedShape = useWorkspaceStore((s) => s.updateSelectedShape);
  const removeShape = useWorkspaceStore((s) => s.removeShape);
  const moveShapeLayer = useWorkspaceStore((s) => s.moveShapeLayer);
  const reorderShapes = useWorkspaceStore((s) => s.reorderShapes);

  const setCurrentShapeType = useWorkspaceStore((s) => s.setCurrentShapeType);
  const setFormWidth = useWorkspaceStore((s) => s.setFormWidth);
  const setFormHeight = useWorkspaceStore((s) => s.setFormHeight);
  const setFormBaseColor = useWorkspaceStore((s) => s.setFormBaseColor);
  const setFormOpacity = useWorkspaceStore((s) => s.setFormOpacity);

  const updateView = useWorkspaceStore((s) => s.updateView);
  const storeResetView = useWorkspaceStore((s) => s.resetView);

  const toggleControlsPanel = useWorkspaceStore((s) => s.toggleControlsPanel);
  const toggleShapeList = useWorkspaceStore((s) => s.toggleShapeList);

  // Canvas interaction hook - uses initial values, notifies store on changes
  const canvasInteraction = useCanvasInteraction({
    shapes,
    selectedShapeId,
    onShapeSelect: setSelectedShapeId,
    onShapeMove: moveShape,
    initialZoom: initialView.zoom,
    initialCanvasOffset: initialView.canvasOffset,
    onViewChange: updateView,
  });

  // Reset view handler - uses store's resetView
  const handleResetView = useCallback(() => {
    const container = canvasInteraction.viewportContainerRef.current;
    if (container) {
      const { width, height } = container.getBoundingClientRect();
      storeResetView(width, height);
    }
    canvasInteraction.resetView();
  }, [canvasInteraction, storeResetView]);

  // Form handlers
  const handleWidthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value === '') {
        setFormWidth(null);
      } else {
        const numValue = parseInt(value, 10);
        setFormWidth(Number.isNaN(numValue) ? null : numValue);
      }
    },
    [setFormWidth]
  );

  const handleHeightChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.trim();
      if (value === '') {
        setFormHeight(null);
      } else {
        const numValue = parseInt(value, 10);
        setFormHeight(Number.isNaN(numValue) ? null : numValue);
      }
    },
    [setFormHeight]
  );

  const handleColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormBaseColor(e.target.value);
    },
    [setFormBaseColor]
  );

  const handleOpacityChange = useCallback(
    (value: number[]) => {
      setFormOpacity(value[0]);
    },
    [setFormOpacity]
  );

  // Function to calculate new shape position
  const getNewShapePosition = useCallback(() => {
    let initialX = 50;
    let initialY = 50;

    if (canvasInteraction.viewportContainerRef.current) {
      const { width: cw, height: ch } =
        canvasInteraction.viewportContainerRef.current.getBoundingClientRect();
      initialX =
        (cw / 2 - canvasInteraction.canvasOffset.x) / canvasInteraction.zoom -
        (formWidth ?? 0) / 2;
      initialY =
        (ch / 2 - canvasInteraction.canvasOffset.y) / canvasInteraction.zoom -
        (formHeight ?? 0) / 2;
    }

    return { x: initialX, y: initialY };
  }, [canvasInteraction, formWidth, formHeight]);

  // Form submit handler
  const handleFormSubmit = useCallback(() => {
    if (isEditing) {
      const success = updateSelectedShape();
      if (!success) {
        alert('Cannot update shape: Width and height must be positive numbers');
      }
    } else {
      const position = getNewShapePosition();
      const success = addShape(position);
      if (!success) {
        alert('Cannot add shape: Width and height must be positive numbers');
      }
    }
  }, [isEditing, updateSelectedShape, addShape, getNewShapePosition]);

  return (
    <div
      className={`
      min-h-screen transition-colors duration-200
      ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}
    `}
    >
      {/* Dark Mode Toggle */}
      <DarkModeToggle />

      {/* Left Floating Card - Controls Panel */}
      <FloatingCard
        title='Shape Controls'
        isOpen={isControlsPanelOpen}
        onToggle={toggleControlsPanel}
        position='left'
        defaultPosition={{ x: 20, y: 100 }}
      >
        <ControlsPanel
          currentShapeType={currentShapeType}
          width={formWidth}
          height={formHeight}
          currentShapeBaseColor={formBaseColor}
          currentShapeOpacity={formOpacity}
          isEditing={isEditing}
          selectedShapeObject={selectedShapeObject}
          onShapeTypeChange={setCurrentShapeType}
          onWidthChange={handleWidthChange}
          onHeightChange={handleHeightChange}
          onColorChange={handleColorChange}
          onOpacityChange={handleOpacityChange}
          onFormSubmit={handleFormSubmit}
        />
      </FloatingCard>

      {/* Right Floating Card - Shape List */}
      <FloatingCard
        title='Shape List'
        isOpen={isShapeListOpen}
        onToggle={toggleShapeList}
        position='right'
      >
        <ShapeList
          shapes={shapes}
          selectedShapeId={selectedShapeId}
          onShapeSelect={setSelectedShapeId}
          onRemoveShape={removeShape}
          onMoveShapeLayer={moveShapeLayer}
          onReorderShapes={reorderShapes}
        />
      </FloatingCard>

      {/* Full Screen Canvas */}
      <CanvasArea
        viewportContainerRef={canvasInteraction.viewportContainerRef}
        zoom={canvasInteraction.zoom}
        canvasOffset={canvasInteraction.canvasOffset}
        shapes={shapes}
        selectedShapeId={selectedShapeId}
        snappingGuides={canvasInteraction.snappingGuides}
        isDraggingShape={canvasInteraction.isDraggingShape}
        isPanning={canvasInteraction.isPanning}
        visualDragPosition={canvasInteraction.visualDragPosition}
        onPointerDown={canvasInteraction.handlePointerDown}
        onResetView={handleResetView}
      />
    </div>
  );
}
