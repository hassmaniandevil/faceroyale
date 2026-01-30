'use client';

import { useGameStore, selectLocalPlayer } from '@/stores/gameStore';

export function HUD() {
  const playersAlive = useGameStore((s) => s.playersAlive);
  const killFeed = useGameStore((s) => s.killFeed);
  const zone = useGameStore((s) => s.zone);
  const localPlayer = useGameStore(selectLocalPlayer);

  return (
    <div className="absolute inset-0 pointer-events-none p-4">
      {/* Top center - Players alive */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <div className="bg-black/50 backdrop-blur px-6 py-2 rounded-full">
          <span className="text-2xl font-bold">{playersAlive}</span>
          <span className="text-gray-400 ml-2">Alive</span>
        </div>
      </div>

      {/* Top left - Health & Shield */}
      <div className="absolute top-4 left-4">
        <div className="bg-black/50 backdrop-blur rounded-xl p-3 space-y-2">
          {/* Health */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">HP</span>
              <span>{localPlayer?.health ?? 100}</span>
            </div>
            <div className="health-bar w-32">
              <div
                className={`health-bar-fill ${
                  (localPlayer?.health ?? 100) < 30
                    ? 'critical'
                    : (localPlayer?.health ?? 100) < 50
                    ? 'low'
                    : ''
                }`}
                style={{ width: `${localPlayer?.health ?? 100}%` }}
              />
            </div>
          </div>

          {/* Shield */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-400">Shield</span>
              <span>{localPlayer?.shield ?? 0}</span>
            </div>
            <div className="health-bar w-32">
              <div
                className="shield-bar-fill"
                style={{ width: `${((localPlayer?.shield ?? 0) / 50) * 100}%` }}
              />
            </div>
          </div>

          {/* Kills */}
          <div className="flex items-center gap-2 pt-1 border-t border-gray-700">
            <span className="text-red-500">💀</span>
            <span className="font-bold">{localPlayer?.kills ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Top right - Kill feed */}
      <div className="absolute top-4 right-4 space-y-1 max-w-xs">
        {killFeed.slice(-5).map((entry, i) => (
          <div key={`${entry.timestamp}-${i}`} className="kill-feed-entry">
            <span className="text-red-400 font-semibold">
              {entry.killerName}
            </span>
            <span className="text-gray-500 mx-1">eliminated</span>
            <span className="text-white">{entry.victimName}</span>
          </div>
        ))}
      </div>

      {/* Minimap / Zone indicator could go here */}
      <div className="absolute top-20 right-4">
        <div className="bg-black/50 backdrop-blur rounded-lg p-2 text-xs text-gray-400">
          Zone: {Math.round(zone.currentRadius)}m
        </div>
      </div>
    </div>
  );
}
