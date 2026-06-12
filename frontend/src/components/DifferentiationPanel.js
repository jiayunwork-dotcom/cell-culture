import { useState } from 'react';
import { Dna, Clock, Zap, CheckCircle, FlaskConical } from 'lucide-react';

const DIFFERENTIATION_TYPES = [
  {
    id: 'osteocyte',
  name: '骨细胞',
  turns: 3,
  value: 2.0,
  requirements: [
    '高BMP4 + 低FGF',
    '3回合完成',
    '价值: 2.0倍',
  ],
  color: 'text-amber-400',
  bgColor: 'bg-amber-500/10',
  borderColor: 'border-amber-500/30',
},
{
  id: 'neuron',
  name: '神经元',
  turns: 4,
  value: 3.0,
  requirements: [
    '维甲酸 + NGF',
    '4回合完成',
    '价值: 3.0倍',
  ],
  color: 'text-purple-400',
  bgColor: 'bg-purple-500/10',
  borderColor: 'border-purple-500/30',
},
{
  id: 'endothelial',
  name: '内皮细胞',
  turns: 3,
  value: 2.5,
  requirements: [
    'VEGF + 低氧',
    '3回合完成',
    '价值: 2.5倍',
  ],
  color: 'text-red-400',
  bgColor: 'bg-red-500/10',
  borderColor: 'border-red-500/30',
},
];

export default function DifferentiationPanel({ 
  differentiations, 
  population,
  onStartDiff,
  disabled 
}) {
  const [selectedType, setSelectedType] = useState(null);
  const [cellCount, setCellCount] = useState(100000);

  const stemCellCount = population?.totalCells * (population?.stemCellRatio || 0);

  const activeDiffs = differentiations?.filter(d => !d.complete) || [];
  const completedDiffs = differentiations?.filter(d => d.complete) || [];

  const handleStart = () => {
    if (selectedType && cellCount > 0) {
      onStartDiff(selectedType, cellCount);
      setSelectedType(null);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1e6) return (num / 1e6).toFixed(2) + ' M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + ' K';
    return Math.floor(num).toString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Dna className="w-6 h-6 text-primary" />
        干细胞分化
      </h2>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-purple-400">🧬 可用干细胞</h3>
          <span className="font-bold text-lg">
            {formatNumber(stemCellCount)} 个
          </span>
        </div>
        <div className="w-full bg-darker rounded-full h-3">
          <div 
            className="bg-purple-500 h-3 rounded-full"
            style={{ width: `${Math.min((population?.stemCellRatio || 0) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          干细胞比例: {((population?.stemCellRatio || 0) * 100).toFixed(1)}%
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {DIFFERENTIATION_TYPES.map(type => (
          <div 
            key={type.id}
            className={`${type.bgColor ${type.borderColor} border rounded-xl p-4 cursor-pointer transition-all ${
              selectedType === type.id ? 'ring-2 ring-white scale-105' : 'hover:scale-102'
            }`}
            onClick={() => !disabled && setSelectedType(type.id)}
          >
            <h3 className={`font-bold text-lg ${type.color}`}>
              {type.name}
            </h3>
            <div className="flex items-center gap-2 mt-2 text-sm text-slate-300">
              <Clock className="w-4 h-4" />
              <span>{type.turns} 回合</span>
            </div>
            <ul className="mt-3 space-y-1">
              {type.requirements.map((req, i) => (
                <li key={i} className="text-xs text-slate-400 flex items-center gap-1">
                  <span className="text-green-400">•</span>
                  {req}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {selectedType && !disabled && (
        <div className="bg-dark rounded-xl p-5 border border-primary">
          <h3 className="font-semibold mb-4">开始分化</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">
                分化细胞数量
              </label>
              <input
                type="range"
                min="1000"
                max={stemCellCount}
                value={cellCount}
                onChange={(e) => setCellCount(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>1K</span>
                <span className="text-primary font-medium">{formatNumber(cellCount)}</span>
                <span>{formatNumber(stemCellCount)}</span>
              </div>
            </div>
            <button
              onClick={handleStart}
              className="bg-primary hover:bg-green-600 text-white font-semibold px-6 py-2 rounded-lg transition-all"
            >
              开始分化
            </button>
          </div>
          <p className="text-xs text-amber-400 mt-3">
            ⚠️ 分化条件错误会导致细胞凋亡，请确保培养条件正确
          </p>
        </div>
      )}

      {activeDiffs.length > 0 && (
        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-accent" />
            进行中的分化
          </h3>
          <div className="space-y-3">
            {activeDiffs.map((diff, idx) => {
              const typeInfo = DIFFERENTIATION_TYPES.find(t => t.id === diff.cellType);
              const progress = (diff.progress / diff.totalTurns) * 100;
              return (
                <div key={idx} className={`${typeInfo?.bgColor || 'bg-darker'} rounded-lg p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${typeInfo?.color || ''}`}>
                      {typeInfo?.name || diff.cellType}
                    </span>
                    <span className="text-sm text-slate-400">
                      {formatNumber(diff.cellCount)} 个细胞
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>第 {diff.progress} / {diff.totalTurns} 回合</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedDiffs.length > 0 && (
        <div className="bg-dark rounded-xl p-5 border border-green-500/30">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-400">
            <CheckCircle className="w-5 h-5" />
            已完成的功能细胞
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {completedDiffs.map((diff, idx) => {
              const typeInfo = DIFFERENTIATION_TYPES.find(t => t.id === diff.cellType);
              return (
                <div key={idx} className="bg-darker rounded-lg p-3 text-center">
                  <p className={`font-medium ${typeInfo?.color || ''}`}>
                    {typeInfo?.name || diff.cellType}
                  </p>
                  <p className="text-2xl font-bold mt-1">
                    {formatNumber(diff.cellCount)}
                  </p>
                  <p className="text-xs text-slate-500">
                    价值: {formatNumber(diff.cellCount * (typeInfo?.value || 1))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-3">💡 分化提示</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>• 分化后的功能细胞不再增殖，但会计入最终评分</li>
          <li>• 不同类型功能细胞价值不同，神经元价值最高</li>
          <li>• 培养条件需要匹配分化方案，否则细胞会凋亡</li>
          <li>• 可以通过突变提高分化效率和成功率</li>
        </ul>
      </div>
    </div>
  );
}
