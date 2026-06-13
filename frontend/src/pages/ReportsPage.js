import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Star, Clock, ArrowLeft, ChevronRight, Trophy, Filter, X, Search, SlidersHorizontal } from 'lucide-react';
import { listReports } from '../api/reports';

function StarRating({ value, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={i <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return d.toLocaleDateString('zh-CN');
}

function formatNumberCompact(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

function SparklineChart({ data, finalValue, color = '#0ea5e9' }) {
  const [hovered, setHovered] = useState(false);
  const width = 120;
  const height = 60;
  const padding = 4;

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-slate-800/50 rounded-md"
        style={{ width, height }}
      >
        <span className="text-xs text-slate-600">无数据</span>
      </div>
    );
  }

  const values = data.length === 1 ? [data[0], data[0]] : data;
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const stepX = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values.map((v, i) => {
    const x = padding + i * stepX;
    const y = padding + (height - padding * 2) * (1 - (v - minVal) / range);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');

  const areaPoints = [
    `${padding},${height - padding}`,
    points,
    `${padding + (values.length - 1) * stepX},${height - padding}`,
  ].join(' ');

  return (
    <div
      className="relative flex-shrink-0"
      style={{ width, height }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={hovered ? 0.4 : 0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#spark-grad-${color.replace('#', '')})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={hovered ? 2.5 : 1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {values.length > 0 && (
          <circle
            cx={padding + (values.length - 1) * stepX}
            cy={padding + (height - padding * 2) * (1 - (values[values.length - 1] - minVal) / range)}
            r={hovered ? 4 : 2.5}
            fill={color}
            stroke="#0f172a"
            strokeWidth={1.5}
          />
        )}
      </svg>
      {hovered && (
        <div className="absolute left-1/2 -translate-x-1/2 -top-9 bg-slate-800 border border-slate-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
          <span className="text-slate-400">最终细胞数：</span>
          <span className="font-semibold" style={{ color }}>{formatNumberCompact(finalValue)}</span>
        </div>
      )}
    </div>
  );
}

const SCORE_MIN = 0;
const SCORE_MAX = 100000000;

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [sortBy, setSortBy] = useState('time');
  const [cursor, setCursor] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [filterOpen, setFilterOpen] = useState(false);
  const [minScore, setMinScore] = useState(SCORE_MIN);
  const [maxScore, setMaxScore] = useState(SCORE_MAX);
  const [roomName, setRoomName] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    minScore: null,
    maxScore: null,
    roomName: '',
  });

  const hasActiveFilters =
    appliedFilters.minScore !== null ||
    appliedFilters.maxScore !== null ||
    !!appliedFilters.roomName;

  const loadReports = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    const filterParams = {};
    if (appliedFilters.minScore !== null) filterParams.minScore = appliedFilters.minScore;
    if (appliedFilters.maxScore !== null) filterParams.maxScore = appliedFilters.maxScore;
    if (appliedFilters.roomName) filterParams.roomName = appliedFilters.roomName;

    try {
      const result = await listReports(sortBy, reset ? '' : cursor, filterParams);
      if (reset) {
        setReports(result.reports || []);
      } else {
        setReports((prev) => [...prev, ...(result.reports || [])]);
      }
      setCursor(result.nextCursor || '');
      setHasMore(result.hasMore || false);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [sortBy, cursor, loading, appliedFilters]);

  useEffect(() => {
    setReports([]);
    setCursor('');
    setHasMore(true);
    setInitialLoading(true);
    loadReports(true);
  }, [sortBy, appliedFilters]);

  const handleSortChange = (newSort) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadReports(false);
    }
  };

  const handleApplyFilters = () => {
    const mMin = minScore > SCORE_MIN ? minScore : null;
    const mMax = maxScore < SCORE_MAX ? maxScore : null;
    setAppliedFilters({
      minScore: mMin,
      maxScore: mMax,
      roomName: roomName.trim() || '',
    });
    setFilterOpen(false);
  };

  const handleResetFilters = () => {
    setMinScore(SCORE_MIN);
    setMaxScore(SCORE_MAX);
    setRoomName('');
    setAppliedFilters({
      minScore: null,
      maxScore: null,
      roomName: '',
    });
  };

  const formatFilterScore = (v) => {
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return (v / 1000).toFixed(0) + 'K';
    return v.toString();
  };

  return (
    <div className="min-h-screen bg-darker">
      <header className="bg-dark border-b border-slate-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              <h1 className="text-xl font-bold">实验报告广场</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all border ${
                  hasActiveFilters
                    ? 'bg-primary/20 border-primary text-primary'
                    : 'bg-darker border-slate-600 text-slate-300 hover:border-slate-500'
                } ${filterOpen ? 'ring-1 ring-primary/50' : ''}`}
              >
                {hasActiveFilters ? (
                  <SlidersHorizontal className="w-4 h-4" />
                ) : (
                  <Filter className="w-4 h-4" />
                )}
                筛选
                {hasActiveFilters && (
                  <span className="ml-1 bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {(appliedFilters.minScore !== null ? 1 : 0) +
                      (appliedFilters.maxScore !== null ? 1 : 0) +
                      (!!appliedFilters.roomName ? 1 : 0)}
                  </span>
                )}
              </button>

              {filterOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-dark border border-slate-600 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-darker">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Filter className="w-4 h-4 text-primary" />
                      筛选条件
                    </div>
                    <button
                      onClick={() => setFilterOpen(false)}
                      className="text-slate-400 hover:text-white transition-colors p-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-5">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                          最终评分范围
                        </label>
                        <span className="text-xs text-slate-300 font-mono">
                          {formatFilterScore(minScore)} - {formatFilterScore(maxScore)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-10 flex-shrink-0">最低</span>
                          <div className="flex-1 relative">
                            <input
                              type="range"
                              min={SCORE_MIN}
                              max={SCORE_MAX}
                              step={100000}
                              value={minScore}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMinScore(v > maxScore ? maxScore : v);
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-500 w-10 flex-shrink-0">最高</span>
                          <div className="flex-1 relative">
                            <input
                              type="range"
                              min={SCORE_MIN}
                              max={SCORE_MAX}
                              step={100000}
                              value={maxScore}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setMaxScore(v < minScore ? minScore : v);
                              }}
                              className="w-full"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {[
                          { label: '全部', min: SCORE_MIN, max: SCORE_MAX },
                          { label: '1M+', min: 1000000, max: SCORE_MAX },
                          { label: '5M+', min: 5000000, max: SCORE_MAX },
                          { label: '10M+', min: 10000000, max: SCORE_MAX },
                        ].map((p) => (
                          <button
                            key={p.label}
                            onClick={() => { setMinScore(p.min); setMaxScore(p.max); }}
                            className={`px-2 py-1 rounded text-[11px] transition-all ${
                              minScore === p.min && maxScore === p.max
                                ? 'bg-primary/20 text-primary border border-primary/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block mb-2">
                        房间名搜索
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          value={roomName}
                          onChange={(e) => setRoomName(e.target.value)}
                          placeholder="输入房间名关键词..."
                          className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-3 border-t border-slate-700 bg-darker flex items-center gap-2">
                    <button
                      onClick={handleResetFilters}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
                    >
                      重置
                    </button>
                    <button
                      onClick={handleApplyFilters}
                      className="flex-1 px-3 py-2 rounded-lg text-sm font-semibold bg-primary hover:bg-green-600 text-white transition-all shadow-lg shadow-primary/20"
                    >
                      应用筛选
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 bg-darker rounded-lg p-1">
              <button
                onClick={() => handleSortChange('time')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sortBy === 'time'
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                最新
              </button>
              <button
                onClick={() => handleSortChange('rating')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  sortBy === 'rating'
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Star className="w-4 h-4" />
                评分
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {hasActiveFilters && (
          <div className="mb-4 flex items-center gap-2 flex-wrap bg-dark border border-slate-700 rounded-lg px-3 py-2">
            <span className="text-xs text-slate-500">当前筛选：</span>
            {appliedFilters.minScore !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs border border-accent/30">
                评分≥{formatFilterScore(appliedFilters.minScore)}
                <button
                  onClick={() => {
                    const newMin = SCORE_MIN;
                    setMinScore(newMin);
                    setAppliedFilters((f) => ({ ...f, minScore: null }));
                  }}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {appliedFilters.maxScore !== null && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/15 text-accent text-xs border border-accent/30">
                评分≤{formatFilterScore(appliedFilters.maxScore)}
                <button
                  onClick={() => {
                    setMaxScore(SCORE_MAX);
                    setAppliedFilters((f) => ({ ...f, maxScore: null }));
                  }}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {appliedFilters.roomName && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-xs border border-secondary/30">
                房间: "{appliedFilters.roomName}"
                <button
                  onClick={() => {
                    setRoomName('');
                    setAppliedFilters((f) => ({ ...f, roomName: '' }));
                  }}
                  className="hover:text-white ml-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="ml-auto text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              清除全部
            </button>
          </div>
        )}

        {initialLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无实验报告</p>
            <p className="text-slate-500 text-sm mt-1">
              {hasActiveFilters ? '尝试调整筛选条件' : '完成游戏后可以发布你的第一份实验报告'}
            </p>
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm font-medium hover:bg-primary/30 transition-all"
              >
                清除筛选条件
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => navigate(`/report/${report.id}`)}
                  className="w-full bg-dark border border-slate-700 rounded-xl p-4 hover:border-slate-500 hover:bg-slate-800/50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: report.playerColor || '#22c55e' }}
                        />
                        <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                          [{report.roomName}] - {report.playerName}的实验报告
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Trophy className="w-4 h-4 text-accent" />
                          评分 {Math.floor(report.finalScore || 0).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FlaskConical className="w-4 h-4 text-secondary" />
                          {Math.floor(report.finalCellCount || 0).toLocaleString()} 细胞
                        </span>
                        <span>第{report.rank}名</span>
                        <span>{report.totalTurns}回合</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <SparklineChart
                        data={report.cellCountSeries || []}
                        finalValue={report.finalCellCount || 0}
                        color={report.playerColor || '#0ea5e9'}
                      />
                      <div className="flex flex-col items-end gap-2">
                        {report.reviewCount > 0 ? (
                          <div className="flex items-center gap-2">
                            <StarRating value={report.avgRating || 0} />
                            <span className="text-sm text-slate-400">
                              ({report.reviewCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">暂无评审</span>
                        )}
                        <span className="text-xs text-slate-500">
                          {formatDate(report.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center justify-between">
                    <span className="text-xs text-slate-500">查看详情</span>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </button>
              ))}
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="bg-dark border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                      加载中...
                    </span>
                  ) : (
                    '加载更多'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
