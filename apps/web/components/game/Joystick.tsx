'use client';

import { useRef, useState, useCallback } from 'react';

interface JoystickProps {
  onMove: (direction: { x: number; y: number }) => void;
  onRelease: () => void;
  size?: number;
}

export function Joystick({ onMove, onRelease, size = 120 }: JoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  const handleStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      e.preventDefault();
      setIsActive(true);
      handleMove(e);
    },
    []
  );

  const handleMove = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const distance = Math.sqrt(dx * dx + dy * dy);
      const maxDistance = size / 2 - 24; // Handle radius offset

      if (distance > maxDistance) {
        dx = (dx / distance) * maxDistance;
        dy = (dy / distance) * maxDistance;
      }

      setPosition({ x: dx, y: dy });
      onMove({
        x: dx / maxDistance,
        y: dy / maxDistance,
      });
    },
    [size, onMove]
  );

  const handleEnd = useCallback(() => {
    setIsActive(false);
    setPosition({ x: 0, y: 0 });
    onRelease();
  }, [onRelease]);

  return (
    <div
      ref={containerRef}
      className="joystick-container pointer-events-auto"
      style={{ width: size, height: size }}
      onTouchStart={handleStart}
      onTouchMove={isActive ? handleMove : undefined}
      onTouchEnd={handleEnd}
      onMouseDown={handleStart}
      onMouseMove={isActive ? handleMove : undefined}
      onMouseUp={handleEnd}
      onMouseLeave={isActive ? handleEnd : undefined}
    >
      <div
        className="joystick-handle"
        style={{
          transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
        }}
      />
    </div>
  );
}
