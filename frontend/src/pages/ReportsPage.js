import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Star, Clock, ArrowLeft, ChevronRight, Trophy } from 'lucide-react';
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

export default function ReportsPage() {
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [sortBy, setSortBy] = useState('time');
  const [cursor, setCursor] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const loadReports = useCallback(async (reset = false) => {
    if (loading) return;
    setLoading(true);

    try {
      const result = await listReports(sortBy, reset ? '' : cursor);
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
  }, [sortBy, cursor, loading]);

  useEffect(() => {
    setReports([]);
    setCursor('');
    setHasMore(true);
    setInitialLoading(true);
    loadReports(true);
  }, [sortBy]);

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

  return (
    <div className="min-h-screen bg-darker">
      <header className="bg-dark border-b border-slate-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
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
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {initialLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <FlaskConical className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">暂无实验报告</p>
            <p className="text-slate-500 text-sm mt-1">完成游戏后可以发布你的第一份实验报告</p>
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
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
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
