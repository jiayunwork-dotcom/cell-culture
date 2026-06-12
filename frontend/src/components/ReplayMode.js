import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  X,
  FlaskConical,
  DollarSign,
  ThermometerSun,
  Users,
  Dna
} from 'lucide-react';

function formatNumber(num) {
  if (!num && num !== 0) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (absNum >= 1e3) return (num / 1e3).toFixed(1) + 'K';
  return Math.floor(num).toString();
}

function formatMoney(num) {
  if (!num && num !== 0) return '¥0';
  return '¥' + Math.floor(num).toLocaleString();
}

export default function ReplayMode({ replayData, players, onExit }) {
  const { snapshots = [], timeline = [] } = replayData || {};
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timerRef = useRef(null);

  const sortedSnapshots = useMemo(() => {
    return [...snapshots].sort((a, b) => a.turnNumber - b.turnNumber);
  }, [snapshots]);

  const maxTurn = useMemo(() => {
    if (sortedSnapshots.length === 0) return 0;
    return Math.max(...sortedSnapshots.map(s => s.turnNumber));
  }, [sortedSnapshots]);

  const currentSnapshot = useMemo(() => {
    if (sortedSnapshots.length === 0) return null;
    const snap = sortedSnapshots[currentTurnIndex] || sortedSnapshots[sortedSnapshots.length - 1];
    try {
      return {
        ...snap,
        parsedStates: JSON.parse(snap.playerStates || '{}')
      };
    } catch {
      return { ...snap, parsedStates: {} };
    }
  }, [sortedSnapshots, currentTurnIndex]);

  const playerList = useMemo(() => {
    if (!currentSnapshot?.parsedStates) return [];
    const states = currentSnapshot.parsedStates;
    return players
      .map(p => ({
        ...p,
        state: states[p.id] || null
      }))
      .filter(p => p.state);
  }, [currentSnapshot, players]);

  const currentTimeline = useMemo(() => {
    if (!currentSnapshot) return [];
    return timeline.filter(t => t.turnNumber === currentSnapshot.turnNumber);
  }, [timeline, currentSnapshot]);

  useEffect(() => {
    if (isPlaying && sortedSnapshots.length > 0) {
      timerRef.current = setTimeout(() => {
        setCurrentTurnIndex(prev => {
          if (prev >= sortedSnapshots.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000);
    }
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isPlaying, currentTurnIndex, sortedSnapshots.length]);

  const handleProgressChange = (e) => {
    const value = parseInt(e.target.value);
    setCurrentTurnIndex(Math.min(value, sortedSnapshots.length - 1));
  };

  const handlePrev = () => {
    setCurrentTurnIndex(prev => Math.max(0, prev - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentTurnIndex(prev => Math.min(sortedSnapshots.length - 1, prev + 1));
    setIsPlaying(false);
  };

  const togglePlay = () => {
    if (currentTurnIndex >= sortedSnapshots.length - 1) {
      setCurrentTurnIndex(0);
    }
    setIsPlaying(p => !p);
  };

  if (sortedSnapshots.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="bg-dark border border-slate-700 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <FlaskConical className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">暂无回放数据</h2>
          <p className="text-slate-400 mb-6">游戏过程中没有记录到可回放的回合数据</p>
          <button
            onClick={onExit}
            className="bg-primary hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-darker z-50 flex flex-col">
      <header className="bg-dark border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">实验回放</span>
            </div>
            <div className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-sm font-medium">
              第 {currentSnapshot?.turnNumber || 0} 回合 / 共 {maxTurn} 回合
            </div>
          </div>
          <button
            onClick={onExit}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all"
          >
            <X className="w-4 h-4" />
            退出回放
          </button>
        </div>
      </header>

      <div className="bg-dark/50 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrev}
              disabled={currentTurnIndex === 0}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-primary hover:bg-green-600 transition-all"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white ml-1" />
              )}
            </button>
            <button
              onClick={handleNext}
              disabled={currentTurnIndex >= sortedSnapshots.length - 1}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <SkipForward className="w-5 h-5" />
            </button>

            <div className="flex-1">
              <input
                type="range"
                min="0"
                max={sortedSnapshots.length - 1}
                value={currentTurnIndex}
                onChange={handleProgressChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, #22c55e 0%, #22c55e ${(currentTurnIndex / (sortedSnapshots.length - 1)) * 100}%, #334155 ${(currentTurnIndex / (sortedSnapshots.length - 1)) * 100}%, #334155 100%)`
                }}
              />
              <div className="flex justify-between mt-1 text-xs text-slate-500">
                <span>第1回合</span>
                <span>第{Math.ceil(maxTurn / 2)}回合</span>
                <span>第{maxTurn}回合</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-400">
              {isPlaying ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>播放中</span>
                </>
              ) : (
                <span>已暂停</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <div className={`grid gap-4 ${
            playerList.length <= 2 ? 'grid-cols-2' :
            playerList.length === 3 ? 'grid-cols-3' :
            'grid-cols-2 lg:grid-cols-4'
          }`}>
            {playerList.map((player) => {
              const state = player.state || {};
              const pop = state.population || {};
              const env = state.environment || {};
              const p = state.player || {};
              const playerTimeline = currentTimeline.find(t => t.playerId === player.id);

              return (
                <div
                  key={player.id}
                  className="bg-dark rounded-xl border-2 overflow-hidden"
                  style={{ borderColor: player.color || '#64748b' }}
                >
                  <div
                    className="px-4 py-3 flex items-center gap-3"
                    style={{ backgroundColor: `${player.color}20` }}
                  >
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: player.color }}
                    />
                    <span className="font-bold text-lg">{player.name}</span>
                    {player.isYou && (
                      <span className="text-xs px-2 py-0.5 bg-primary/30 text-primary rounded">你</span>
                    )}
                  </div>

                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-darker rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                          <Users className="w-3 h-3" />
                          细胞总数
                        </div>
                        <p className="text-xl font-bold text-primary">
                          {formatNumber(pop.totalCells)}
                        </p>
                        {playerTimeline && (
                          <p className={`text-xs mt-1 ${playerTimeline.cellDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {playerTimeline.cellDelta >= 0 ? '+' : ''}{formatNumber(playerTimeline.cellDelta)} 本回合
                          </p>
                        )}
                      </div>
                      <div className="bg-darker rounded-lg p-3">
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                          <DollarSign className="w-3 h-3" />
                          资金余额
                        </div>
                        <p className="text-xl font-bold text-accent">
                          {formatMoney(p.money)}
                        </p>
                        {playerTimeline && (
                          <p className={`text-xs mt-1 ${playerTimeline.moneyDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {playerTimeline.moneyDelta >= 0 ? '+' : ''}{formatMoney(playerTimeline.moneyDelta)} 本回合
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="bg-darker rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                        <ThermometerSun className="w-3 h-3" />
                        环境参数
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">葡萄糖</span>
                          <span>{env.glucose?.toFixed?.(0) || env.glucose || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">血清</span>
                          <span>{env.serum?.toFixed?.(0) || env.serum || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">pH</span>
                          <span>{env.ph?.toFixed?.(2) || env.ph || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">温度</span>
                          <span>{env.temperature?.toFixed?.(1) || env.temperature || '-'}°</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-darker rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                        <Dna className="w-3 h-3" />
                        细胞指标
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">增殖率</span>
                          <span className="text-green-400">
                            {((pop.baseGrowthRate || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">凋亡率</span>
                          <span className="text-red-400">
                            {((pop.apoptosisRate || 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">突变数</span>
                          <span className="text-purple-400">
                            {(state.mutations || []).length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">专利数</span>
                          <span className="text-yellow-400">
                            {(state.patents || []).length}
                          </span>
                        </div>
                      </div>
                    </div>

                    {playerTimeline && playerTimeline.actionSummary && (
                      <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">本回合操作</p>
                        <p className="text-sm text-primary">{playerTimeline.actionSummary}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
