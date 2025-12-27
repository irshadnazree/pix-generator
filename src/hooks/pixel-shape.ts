import type { RefObject } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { ShapeData } from '../constants/pixel-shape';
import { getCachedMask } from '../utils/pixel-shape';

// Custom hook for viewport size
export const useViewportSize = (containerRef: RefObject<HTMLDivElement | null>) => {
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const updateSize = () => {
      if (containerRef.current) {
        const { width, height } =
          containerRef.current.getBoundingClientRect();
        setViewportSize({ width, height });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, [containerRef]);

  return viewportSize;
};

// Custom hook for shape hit testing
export const useShapeHitTest = (shapes: ShapeData[]) => {
  return useCallback(
    (mouseXWorld: number, mouseYWorld: number): ShapeData | null => {
      for (let i = shapes.length - 1; i >= 0; i--) {
        const shape = shapes[i];
        const localX = mouseXWorld - shape.position.x;
        const localY = mouseYWorld - shape.position.y;

        if (
          localX >= 0 &&
          localX < shape.width &&
          localY >= 0 &&
          localY < shape.height
        ) {
          const mask = getCachedMask(shape.type, shape.width, shape.height);
          const maskX = Math.floor(localX);
          const maskY = Math.floor(localY);

          if (
            maskX >= 0 &&
            maskX < shape.width &&
            maskY >= 0 &&
            maskY < shape.height &&
            mask[maskY][maskX]
          ) {
            return shape;
          }
        }
      }
      return null;
    },
    [shapes]
  );
}; 