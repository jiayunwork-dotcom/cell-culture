import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FlaskConical, TrendingUp, Skull, Layers } from 'lucide-react';

export default function CellStatusPanel({ population, environment }) {
  if (!population) {
    return <div className="text-center text-slate-400">加载中...</div>;
  }

  const cycleData = [
    { name: 'G1期', value: population.g1Phase || 0, color: '#22c55e' },
    { name: 'S期', value: population.sPhase || 0, color: '#0ea5e9' },
    { name: 'G2期', value: population.g2Phase || 0, color: '#f59e0b' },
    { name: 'M期', value: population.mPhase || 0, color: '#ef4444' },
  ];

  const totalCells = population.totalCells || 0;
  const capacity = population.capacity || 10000000;
  const usagePercent = (totalCells / capacity) * 100;

  const formatNumber = (num) => {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' K';
    return Math.floor(num).toString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <FlaskConical className="w-6 h-6 text-primary" />
        细胞培养状态
      </h2>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-400">总细胞数</p>
              <p className="text-2xl font-bold text-primary">{formatNumber(totalCells)}</p>
            </div>
          </div>
          <div className="w-full bg-darker rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                usagePercent > 90 ? 'bg-danger' : 
                usagePercent > 70 ? 'bg-accent' : 'bg-primary'
              }`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">
            容量: {formatNumber(capacity)} ({usagePercent.toFixed(1)}%)
          </p>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">增殖速率</p>
              <p className="text-2xl font-bold text-green-400">
                {((population.baseGrowthRate || 1) * 100).toFixed(0)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            环境适宜度: {population.baseGrowthRate > 0.8 ? '良好' : population.baseGrowthRate > 0.5 ? '一般' : '较差'}
          </p>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
              <Skull className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">凋亡率</p>
              <p className="text-2xl font-bold text-red-400">
                {((population.apoptosisRate || 0) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-500">
            每回合死亡: {formatNumber(totalCells * (population.apoptosisRate || 0))}
          </p>
        </div>
      </div>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-secondary" />
          细胞周期分布
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cycleData}>
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#94a3b8', fontSize: 12 }}
                tickFormatter={(v) => formatNumber(v)}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  color: '#e2e8f0'
                }}
                formatter={(value) => [formatNumber(value), '细胞数']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {cycleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-4">
          {cycleData.map((item) => (
            <div key={item.name} className="text-center">
              <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: item.color }} />
              <p className="text-xs text-slate-400">{item.name}</p>
              <p className="text-sm font-medium">
                {((item.value / totalCells) * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {population.hasStemCells && (
        <div className="bg-dark rounded-xl p-5 border border-purple-500/30">
          <h3 className="font-semibold mb-2 text-purple-400">🧬 干细胞特性</h3>
          <div className="flex items-center justify-between">
            <span className="text-slate-300">干细胞比例</span>
            <span className="font-semibold text-purple-400">
              {((population.stemCellRatio || 0) * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            干细胞可定向分化为功能细胞，提高最终评分
          </p>
        </div>
      )}
    </div>
  );
}
