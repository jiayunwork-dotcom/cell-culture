import { Users, Trophy, DollarSign } from 'lucide-react';

export default function PlayerList({ players }) {
  const playerArray = Array.isArray(players) ? players : Object.values(players || {});

  const sortedPlayers = [...playerArray].sort((a, b) => b.score - a.score);

  return (
    <div className="p-3 border-b border-slate-700">
      <h3 className="font-semibold flex items-center gap-2 text-sm mb-3">
        <Users className="w-4 h-4" />
        玩家 ({sortedPlayers.length})
      </h3>
      
      <div className="space-y-2">
        {sortedPlayers.map((player, index) => (
          <div 
            key={player.id}
            className={`flex items-center gap-3 p-2 rounded-lg ${
              player.isYou ? 'bg-primary/10 border border-primary/30' : 'bg-darker'
            }`}
          >
            <div className="flex items-center justify-center w-6 h-6">
              {index === 0 ? (
                <Trophy className="w-4 h-4 text-yellow-400" />
              ) : (
                <span className="text-xs text-slate-500 font-medium">{index + 1}</span>
              )}
            </div>

            <div 
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: player.color }}
            />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {player.name}
                {player.isYou && (
                  <span className="text-xs text-primary ml-1">(你)</span>
                )}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold">
                {Math.floor(player.score || 0).toLocaleString()}
              </p>
              <p className="text-xs text-accent flex items-center justify-end gap-1">
                <DollarSign className="w-3 h-3" />
                {Math.floor(player.money || 0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
