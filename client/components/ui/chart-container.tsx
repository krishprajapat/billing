import { ReactElement, useEffect, useRef, useState } from "react";
import { ResponsiveContainer } from "recharts";

interface ChartContainerProps {
  children: ReactElement;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export function ChartContainer({ 
  children, 
  width = "100%", 
  height = 300,
  className = ""
}: ChartContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      // Debounce the resize to prevent loops
      const timeoutId = setTimeout(() => {
        for (const entry of entries) {
          const { width: containerWidth, height: containerHeight } = entry.contentRect;
          setDimensions({ width: containerWidth, height: containerHeight });
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width, 
        height: typeof height === 'number' ? `${height}px` : height 
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
