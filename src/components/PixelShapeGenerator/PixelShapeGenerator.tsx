import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useCanvasInteraction } from '../../hooks/useCanvasInteraction';
import { useShapeManagement } from '../../hooks/useShapeManagement';
import { DarkModeToggle } from '../ui/DarkModeToggle';
import { FloatingCard } from '../ui/FloatingCard';
import { CanvasArea } from './CanvasArea';
import { ControlsPanel } from './ControlsPanel';
import { ShapeList } from './ShapeList';

export default function PixelShapeGenerator() {
  const { isDarkMode } = useTheme();

  // Card states
  const [isControlsPanelOpen, setIsControlsPanelOpen] = useState(false);
  const [isShapeListOpen, setIsShapeListOpen] = useState(false);

  // Shape management hook
  const shapeManagement = useShapeManagement();

  // Canvas interaction hook
  const canvasInteraction = useCanvasInteraction({
    shapes: shapeManagement.shapes,
    selectedShapeId: shapeManagement.selectedShapeId,
    onShapeSelect: shapeManagement.setSelectedShapeId,
    onShapeMove: shapeManagement.moveShape,
  });

  // Function to calculate new shape position
  const getNewShapePosition = () => {
    let initialX = 50;
    let initialY = 50;

    if (canvasInteraction.viewportContainerRef.current) {
      const { width: cw, height: ch } =
        canvasInteraction.viewportContainerRef.current.getBoundingClientRect();
      initialX =
        (cw / 2 - canvasInteraction.canvasOffset.x) / canvasInteraction.zoom -
        (shapeManagement.width ?? 0) / 2;
      initialY =
        (ch / 2 - canvasInteraction.canvasOffset.y) / canvasInteraction.zoom -
        (shapeManagement.height ?? 0) / 2;
    }

    return { x: initialX, y: initialY };
  };

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
        onToggle={() => setIsControlsPanelOpen(!isControlsPanelOpen)}
        position='left'
        defaultPosition={{ x: 20, y: 100 }}
      >
        <ControlsPanel
          currentShapeType={shapeManagement.currentShapeType}
          width={shapeManagement.width}
          height={shapeManagement.height}
          currentShapeBaseColor={shapeManagement.currentShapeBaseColor}
          currentShapeOpacity={shapeManagement.currentShapeOpacity}
          isEditing={shapeManagement.isEditing}
          selectedShapeObject={shapeManagement.selectedShapeObject}
          onShapeTypeChange={shapeManagement.handleShapeTypeChange}
          onWidthChange={shapeManagement.handleWidthChange}
          onHeightChange={shapeManagement.handleHeightChange}
          onColorChange={shapeManagement.handleColorChange}
          onOpacityChange={shapeManagement.handleOpacityChange}
          onFormSubmit={() =>
            shapeManagement.handleFormSubmit(getNewShapePosition)
          }
        />
      </FloatingCard>

      {/* Right Floating Card - Shape List */}
      <FloatingCard
        title='Shape List'
        isOpen={isShapeListOpen}
        onToggle={() => setIsShapeListOpen(!isShapeListOpen)}
        position='right'
      >
        <ShapeList
          shapes={shapeManagement.shapes}
          selectedShapeId={shapeManagement.selectedShapeId}
          onShapeSelect={shapeManagement.setSelectedShapeId}
          onRemoveShape={shapeManagement.removeShape}
          onMoveShapeLayer={shapeManagement.handleMoveShapeLayer}
          onReorderShapes={shapeManagement.reorderShapes}
        />
      </FloatingCard>

      {/* Full Screen Canvas */}
      <CanvasArea
        viewportContainerRef={canvasInteraction.viewportContainerRef}
        zoom={canvasInteraction.zoom}
        canvasOffset={canvasInteraction.canvasOffset}
        shapes={shapeManagement.shapes}
        selectedShapeId={shapeManagement.selectedShapeId}
        snappingGuides={canvasInteraction.snappingGuides}
        isDraggingShape={canvasInteraction.isDraggingShape}
        isPanning={canvasInteraction.isPanning}
        visualDragPosition={canvasInteraction.visualDragPosition}
        onPointerDown={canvasInteraction.handlePointerDown}
        onResetView={() => {
          canvasInteraction.resetView();
          shapeManagement.resetFormToDefaults();
        }}
      />
    </div>
  );
}
