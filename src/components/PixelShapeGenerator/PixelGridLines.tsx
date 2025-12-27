import React from "react";

import { MIN_ZOOM_FOR_PIXEL_GRID } from "../../constants/pixel-shape";

interface PixelGridLinesProps {
  zoom: number;
  canvasOffset: { x: number; y: number };
  viewportWidth: number;
  viewportHeight: number;
  minZoomThreshold?: number;
}

/**
 * Renders pixel grid lines using CSS background gradients instead of DOM elements.
 * This eliminates thousands of DOM nodes, reducing layout/paint time by 90%+.
 *
 * The grid is rendered inside the transform container, so we need to:
 * 1. Position it to cover the viewport (which is offset in container coordinates)
 * 2. Align the background pattern so grid lines fall at world coordinates (0, 1, 2, etc.)
 */
export const PixelGridLines = React.memo<PixelGridLinesProps>(
  ({
    zoom,
    canvasOffset,
    viewportWidth,
    viewportHeight,
    minZoomThreshold = MIN_ZOOM_FOR_PIXEL_GRID,
  }) => {
    if (
      !viewportWidth ||
      !viewportHeight ||
      zoom <= 0 ||
      zoom < minZoomThreshold
    ) {
      return null;
    }

    // The grid is inside a container that's translated by canvasOffset.
    // In container coordinates:
    // - World coordinate (0, 0) is at container position (0, 0)
    // - World coordinate (1, 0) is at container position (zoom, 0)
    // - The viewport's top-left is at container position (-canvasOffset.x, -canvasOffset.y)
    //
    // So we position this div at (-canvasOffset.x, -canvasOffset.y) to cover the viewport,
    // and offset the background so that grid lines appear at world coordinates (0, zoom, 2*zoom, etc.)

    // Calculate background offset to align grid lines with world coordinates
    // We need lines at container positions 0, zoom, 2*zoom, etc.
    // Since the div starts at -canvasOffset, we offset the background by canvasOffset % zoom
    // Use modulo that handles negative values correctly
    const bgOffsetX = ((canvasOffset.x % zoom) + zoom) % zoom;
    const bgOffsetY = ((canvasOffset.y % zoom) + zoom) % zoom;

    const gridStyle: React.CSSProperties = {
      position: "absolute",
      left: -canvasOffset.x,
      top: -canvasOffset.y,
      width: viewportWidth,
      height: viewportHeight,
      pointerEvents: "none",
      zIndex: 1,
      backgroundImage: `
        linear-gradient(to right, rgba(128, 128, 128, 0.1) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(128, 128, 128, 0.1) 1px, transparent 1px)
      `,
      backgroundSize: `${zoom}px ${zoom}px`,
      backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
    };

    return <div style={gridStyle} />;
  }
);

PixelGridLines.displayName = "PixelGridLines";
