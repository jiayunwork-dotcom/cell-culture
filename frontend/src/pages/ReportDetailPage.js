import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, AreaChart, Area
} from 'recharts';
import {
  FlaskConical, Star, ArrowLeft, Trophy, Send, AlertCircle,
  Dna, TrendingUp, Target, MessageSquare, User
} from 'lucide-react';
import { getReport, submitReview, parseJSONField } from '../api/reports';

function StarRating({ value, onChange, readonly, size = 20 }) {
  const [hover, setHover] = useState(0);
  const displayValue = readonly ? value : (hover || value || 0);

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && onChange && setHover(i)}
          onMouseLeave={() => !readonly && onChange && setHover(0)}
          onClick={() => !readonly && onChange && onChange(i)}
          className={`${!readonly && onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            className={i <= displayValue ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}
            style={{ width: size, height: size }}
          />
        </button>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}

export default function ReportDetailPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState('');

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [hasReviewed, setHasReviewed] = useState(false);

  const [reviewerName, setReviewerName] = useState(() => {
    return localStorage.getItem('reviewerName') || '';
  });

  useEffect(() => {
    async function loadReport() {
      try {
        const data = await getReport(reportId);
        setReport(data.report);
        setReviews(data.reviews || []);
      } catch (err) {
        setError(err.message || '加载报告失败');
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [reportId]);

  const envData = useMemo(() => parseJSONField(report?.envEvolutionData, []), [report]);
  const cellGrowthData = useMemo(() => parseJSONField(report?.cellGrowthData, []), [report]);
  const mutationLineage = useMemo(() => parseJSONField(report?.mutationLineage, []), [report]);
  const mutationCumulative = useMemo(() => parseJSONField(report?.mutationCumulative, []), [report]);
  const keyTurningPoints = useMemo(() => parseJSONField(report?.keyTurningPoints, []), [report]);
  const strategyAnalysis = useMemo(() => parseJSONField(report?.strategyAnalysis, { paragraphs: [] }), [report]);

  const handleSubmitReview = async () => {
    if (rating === 0) {
      setReviewError('请选择评分');
      return;
    }
    if (!reviewerName.trim()) {
      setReviewError('请输入你的名字');
      return;
    }

    setSubmitting(true);
    setReviewError('');

    const tempId = Date.now().toString();
    const optimisticReview = {
      id: tempId,
      reportId: reportId,
      reviewerId: localStorage.getItem('reviewerId') || 'local_' + tempId,
      reviewerName: reviewerName.trim(),
      rating: rating,
      comment: comment,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };

    const previousReviews = [...reviews];
    const previousCount = report?.reviewCount || 0;
    const previousAvg = report?.avgRating || 0;

    setReviews((prev) => [optimisticReview, ...prev]);
    setReport((prev) => prev ? {
      ...prev,
      reviewCount: prev.reviewCount + 1,
      avgRating: ((prev.avgRating * prev.reviewCount) + rating) / (prev.reviewCount + 1),
    } : prev);

    localStorage.setItem('reviewerName', reviewerName.trim());
    if (!localStorage.getItem('reviewerId')) {
      localStorage.setItem('reviewerId', 'local_' + tempId);
    }

    try {
      const reviewerId = localStorage.getItem('reviewerId') || 'local_' + tempId;
      await submitReview(reportId, reviewerId, reviewerName.trim(), rating, comment);
      setHasReviewed(true);
      setRating(0);
      setComment('');

      const data = await getReport(reportId);
      setReport(data.report);
      setReviews(data.reviews || []);
    } catch (err) {
      setReviews(previousReviews);
      setReport((prev) => prev ? {
        ...prev,
        reviewCount: previousCount,
        avgRating: previousAvg,
      } : prev);

      if (err.message.includes('already reviewed')) {
        setHasReviewed(true);
        setReviewError('你已经评审过这份报告了');
      } else {
        setReviewError(err.message || '提交失败，请重试');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-darker flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-darker flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-danger mb-4" />
        <p className="text-slate-300 mb-2">{error || '报告不存在'}</p>
        <button
          onClick={() => navigate('/reports')}
          className="text-primary hover:underline"
        >
          返回报告广场
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-darker">
      <header className="bg-dark border-b border-slate-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: report.playerColor || '#22c55e' }}
              />
              <h1 className="text-lg font-bold">
                [{report.roomName}] - {report.playerName}的实验报告
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {report.reviewCount > 0 && (
              <div className="flex items-center gap-2">
                <StarRating value={report.avgRating || 0} readonly size={18} />
                <span className="text-sm text-slate-400">
                  {report.avgRating?.toFixed(1)} ({report.reviewCount}条评审)
                </span>
              </div>
            )}
            <Link
              to="/reports"
              className="text-sm text-secondary hover:underline"
            >
              报告广场
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-dark border border-slate-700 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-darker rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <TrendingUp className="w-4 h-4" />
                总回合
              </div>
              <div className="text-2xl font-bold">{report.totalTurns}</div>
            </div>
            <div className="bg-darker rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <FlaskConical className="w-4 h-4 text-secondary" />
                最终细胞数
              </div>
              <div className="text-2xl font-bold text-secondary">
                {formatNumber(report.finalCellCount)}
              </div>
            </div>
            <div className="bg-darker rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Trophy className="w-4 h-4 text-accent" />
                最终评分
              </div>
              <div className="text-2xl font-bold text-accent">
                {formatNumber(report.finalScore)}
              </div>
            </div>
            <div className="bg-darker rounded-lg p-4">
              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                <Target className="w-4 h-4" />
                排名
              </div>
              <div className="text-2xl font-bold">
                第{report.rank}名
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-dark border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                环境参数变化趋势
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={envData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="turn" stroke="#94a3b8" label={{ value: '回合', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="glucose" name="葡萄糖" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="serum" name="血清" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ph" name="pH值" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="temperature" name="温度" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-dark border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-secondary" />
                细胞数量增长曲线
              </h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={cellGrowthData}>
                    <defs>
                      <linearGradient id="colorCells" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="turn" stroke="#94a3b8" label={{ value: '回合', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#94a3b8" tickFormatter={(v) => formatNumber(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                      formatter={(value, name) => [
                        name === 'totalCells' ? formatNumber(value) + ' 细胞' : value.toFixed(4),
                        name === 'totalCells' ? '细胞总数' : name === 'cellDelta' ? '细胞变化' : name,
                      ]}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="totalCells" name="细胞总数" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorCells)" strokeWidth={2} />
                    <Line type="monotone" dataKey="apoptosisRate" name="凋亡率" stroke="#ef4444" strokeWidth={2} dot={false} yAxisId={0} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-dark border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Dna className="w-5 h-5 text-accent" />
                突变累积统计
              </h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mutationCumulative}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="turn" stroke="#94a3b8" label={{ value: '回合', position: 'insideBottom', offset: -5 }} />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Bar dataKey="newMutations" name="新增突变" fill="#f59e0b" />
                    <Bar dataKey="beneficialCount" name="有益突变累积" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {mutationLineage.length > 0 && (
              <div className="bg-dark border border-slate-700 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Dna className="w-5 h-5 text-purple-400" />
                  突变谱系图（共{mutationLineage.length}个突变）
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {mutationLineage.map((mut, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-darker rounded-lg px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16">第{mut.turnCreated}回合</span>
                        <div>
                          <div className="font-medium text-sm">{mut.name || '未命名突变'}</div>
                          <div className="text-xs text-slate-400">
                            {mut.type} · {mut.isBeneficial ? '有益' : '中性/有害'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-medium">{(mut.frequency * 100).toFixed(1)}%</div>
                          <div className="text-xs text-slate-500">频率</div>
                        </div>
                        <div className={`px-2 py-0.5 rounded text-xs ${mut.Survived ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/50 text-slate-400'}`}>
                          {mut.Survived ? '存活' : '消亡'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {keyTurningPoints.length > 0 && (
              <div className="bg-dark border border-slate-700 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5 text-danger" />
                  关键转折点
                </h2>
                <div className="space-y-2">
                  {keyTurningPoints.map((kp, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-darker rounded-lg px-4 py-3">
                      <div className="bg-primary/20 text-primary px-2 py-1 rounded text-xs font-bold flex-shrink-0 mt-0.5">
                        第{kp.turn}回合
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{kp.description}</div>
                        <div className="text-sm text-slate-400 mt-0.5">
                          {kp.cellDelta >= 0 ? '细胞增加' : '细胞减少'} {formatNumber(Math.abs(kp.cellDelta))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-dark border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                策略分析
              </h2>
              <div className="space-y-3">
                {(strategyAnalysis.paragraphs || []).map((p, idx) => (
                  <p key={idx} className="text-slate-300 leading-relaxed text-sm">
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {!hasReviewed ? (
              <div className="bg-dark border border-slate-700 rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  发表评审
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">你的名字</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      placeholder="输入你的名字"
                      className="w-full px-3 py-2 bg-darker border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">评分</label>
                    <StarRating value={rating} onChange={setRating} size={28} />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">评论（可选）</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="说说你的看法..."
                      rows={3}
                      className="w-full px-3 py-2 bg-darker border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary text-sm resize-none"
                    />
                  </div>

                  {reviewError && (
                    <div className="flex items-center gap-2 text-danger text-sm bg-danger/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4" />
                      {reviewError}
                    </div>
                  )}

                  <button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        提交中...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        提交评审
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-dark border border-slate-700 rounded-xl p-5 text-center">
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="w-6 h-6 text-green-400 fill-green-400" />
                </div>
                <p className="text-slate-300 font-medium">你已评审过这份报告</p>
                <p className="text-sm text-slate-500 mt-1">感谢你的反馈！</p>
              </div>
            )}

            <div className="bg-dark border border-slate-700 rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-slate-400" />
                评审列表
                {reviews.length > 0 && (
                  <span className="text-sm text-slate-500 font-normal">({reviews.length})</span>
                )}
              </h2>

              {reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-slate-500 text-sm">暂无评审</p>
                  <p className="text-slate-600 text-xs mt-1">成为第一个发表评审的人吧！</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className={`bg-darker rounded-lg p-3 ${review._optimistic ? 'opacity-60' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-slate-400" />
                          </div>
                          <div>
                            <div className="text-sm font-medium">{review.reviewerName}</div>
                            <div className="text-xs text-slate-500">{formatDate(review.createdAt)}</div>
                          </div>
                        </div>
                        <StarRating value={review.rating} readonly size={14} />
                      </div>
                      {review.comment && (
                        <p className="text-sm text-slate-300 ml-10">{review.comment}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
