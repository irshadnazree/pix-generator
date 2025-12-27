import React from "react";
import type { ShapeData, SnappingGuide } from "../../constants/pixel-shape";
import { useTheme } from "../../contexts/ThemeContext";
import { useViewportSize } from "../../hooks/pixel-shape";
import { PixelGridLines } from "./PixelGridLines";
import { PixelShapeDisplay } from "./PixelShapeDisplay";

interface CanvasAreaProps {
	viewportContainerRef: React.RefObject<HTMLDivElement | null>;
	zoom: number;
	canvasOffset: { x: number; y: number };
	shapes: ShapeData[];
	selectedShapeId: number | null;
	snappingGuides: SnappingGuide[];
	isDraggingShape: boolean;
	isPanning: boolean;
	visualDragPosition: { x: number; y: number } | null;
	onPointerDown: (e: React.MouseEvent | React.TouchEvent) => void;
	onResetView: () => void;
}

export const CanvasArea = React.memo<CanvasAreaProps>(
	({
		viewportContainerRef,
		zoom,
		canvasOffset,
		shapes,
		selectedShapeId,
		snappingGuides,
		isDraggingShape,
		isPanning,
		visualDragPosition,
		onPointerDown,
		onResetView,
	}) => {
		const viewportSize = useViewportSize(viewportContainerRef);
		const { isDarkMode } = useTheme();

		const getCursor = () => {
			if (isPanning) return "grabbing";
			if (isDraggingShape) return "move";
			return "grab";
		};

		return (
			<div className="fixed inset-0 flex flex-col">
				{/* Canvas Controls Header */}
				<div
					className={`
          fixed top-4 left-1/2 transform -translate-x-1/2 z-30
          flex items-center space-x-4 px-4 py-2 rounded-lg shadow-lg border
          ${
						isDarkMode
							? "bg-gray-800 border-gray-700 text-white"
							: "bg-white border-gray-200 text-gray-900"
					}
        `}
				>
					<div className="text-sm">Zoom: {zoom.toFixed(2)}x</div>
					<button
						type="button"
						onClick={onResetView}
						className={`
              px-3 py-1 rounded-md text-sm transition-colors
              ${
								isDarkMode
									? "bg-gray-700 hover:bg-gray-600 text-gray-200"
									: "bg-gray-200 hover:bg-gray-300 text-gray-700"
							}
            `}
					>
						Reset View
					</button>
				</div>

				{/* Full Screen Canvas */}
				<div
					role="graphics-document"
					aria-label="Drawing canvas"
					ref={viewportContainerRef}
					className={`
            flex-1 relative overflow-hidden touch-none select-none
            ${isDarkMode ? "bg-gray-900" : "bg-gray-50"}
          `}
					style={{
						cursor: getCursor(),
						touchAction: "none",
						WebkitUserSelect: "none",
						MozUserSelect: "none",
						msUserSelect: "none",
						userSelect: "none",
					}}
					onMouseDown={onPointerDown}
					onTouchStart={onPointerDown}
					onContextMenu={(e) => e.preventDefault()}
				>
					<div
						className="absolute w-full h-full"
						style={{
							transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
							userSelect: "none",
							willChange: "transform", // GPU acceleration hint for panning
						}}
					>
						<PixelGridLines
							zoom={zoom}
							canvasOffset={canvasOffset}
							viewportWidth={viewportSize.width}
							viewportHeight={viewportSize.height}
						/>

						{shapes.map((shape) => {
							// Apply visual drag position during drag for smooth rendering
							const isDragging =
								isDraggingShape &&
								selectedShapeId === shape.id &&
								visualDragPosition;
							const displayShape = isDragging
								? { ...shape, position: visualDragPosition }
								: shape;

							return (
								<PixelShapeDisplay
									key={shape.id}
									shapeData={displayShape}
									zoom={zoom}
									isSelected={selectedShapeId === shape.id}
								/>
							);
						})}

						{snappingGuides.map((guide) => (
							<div
								key={guide.id}
								className="absolute bg-red-500 opacity-75"
								style={{
									...(guide.type === "V"
										? {
												left: `${guide.x! * zoom}px`,
												top: `${guide.startY! * zoom}px`,
												width: "1px",
												height: `${(guide.endY! - guide.startY!) * zoom}px`,
											}
										: {
												left: `${guide.startX! * zoom}px`,
												top: `${guide.y! * zoom}px`,
												width: `${(guide.endX! - guide.startX!) * zoom}px`,
												height: "1px",
											}),
									zIndex: 20,
								}}
							/>
						))}
					</div>

					{/* Empty state message - centered to viewport */}
					{shapes.length === 0 && (
						<div
							className={`
              absolute inset-0 flex items-center justify-center italic pointer-events-none z-10
              ${isDarkMode ? "text-gray-400" : "text-gray-500"}
            `}
						>
							<div
								className={`
                px-4 py-2 rounded-lg 
                ${isDarkMode ? "bg-gray-800/50" : "bg-white/50"}
              `}
							>
								Click "Add Shape" in the controls panel to create your first
								shape!
							</div>
						</div>
					)}

					{/* Canvas Instructions */}
					<div
						className={`
            absolute bottom-4 left-4 text-xs p-2 rounded pointer-events-none
            ${
							isDarkMode
								? "text-gray-400 bg-gray-800 bg-opacity-75"
								: "text-gray-500 bg-white bg-opacity-75"
						}
          `}
					>
						Click: Select | Drag: Move | Space+Drag: Pan | Double-click: Zoom |
						Wheel: Zoom | Pinch: Zoom | Two-finger scroll: Pan
					</div>
				</div>
			</div>
		);
	},
);
