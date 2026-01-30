'use client';

import type { RefObject } from 'react';

interface FaceCameraProps {
  videoRef: RefObject<HTMLVideoElement>;
  quality: number;
}

export function FaceCamera({ videoRef, quality }: FaceCameraProps) {
  const statusClass = quality > 0.5 ? 'tracking' : quality > 0 ? '' : 'lost';

  return (
    <div className={`face-camera ${statusClass}`}>
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover"
      />

      {/* Status indicator */}
      <div className="absolute top-1 right-1">
        <div
          className={`w-2 h-2 rounded-full ${
            quality > 0.5
              ? 'bg-green-500'
              : quality > 0
              ? 'bg-yellow-500'
              : 'bg-red-500 animate-pulse'
          }`}
        />
      </div>

      {/* No face warning */}
      {quality === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <span className="text-xs text-red-400">No face detected</span>
        </div>
      )}
    </div>
  );
}
