import { useState } from 'react';
import { Dna, Zap, Target, AlertTriangle } from 'lucide-react';

const MUTAGENS = [
  { id: 'none', name: '无诱变', description: '自然突变率', mult: '1×', death: '0%' },
  { id: 'uv', name: 'UV照射', description: '紫外线诱变', mult: '100×', death: '+25%' },
  { id: 'ems', name: 'EMS化学诱变', description: '乙基甲磺酸诱变', mult: '50×', death: '+15%' },
  { id: 'crispr', name: 'CRISPR编辑', description: '定向基因编辑', mult: '5×', death: '+5%' },
];

const MUTATION_TYPES = [
  { id: 'growth_rate', name: '增殖速率', color: 'text-green-400' },
  { id: 'drug_resistance', name: '抗药性', color: 'text-blue-400' },
  { id: 'metabolic', name: '代谢模式', color: 'text-yellow-400' },
  { id: 'stemness', name: '干性', color: 'text-purple-400' },
  { id: 'stress_resistance', name: '胁迫抗性', color: 'text-orange-400' },
  { id: 'differentiation', name: '分化潜能', color: 'text-pink-400' },
];

export default function MutationPanel({ 
  mutations, 
  mutagen, 
  setMutagen, 
  mutagenTarget, 
  setMutagenTarget,
  disabled 
}) {
  const getMutationTypeColor = (type) => {
    const found = MUTATION_TYPES.find(t => t.id === type);
    return found ? found.color : 'text-slate-400';
  };

  const getMutationTypeName = (type) => {
    const found = MUTATION_TYPES.find(t => t.id === type);
    return found ? found.name : type;
  };

  const beneficialMutations = mutations?.filter(m => m.isBeneficial) || [];
  const harmfulMutations = mutations?.filter(m => !m.isBeneficial) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Dna className="w-6 h-6 text-primary" />
        突变与诱变
      </h2>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-4 flex items-center gap-2 text-amber-400">
          <Zap className="w-5 h-5" />
          诱变手段
        </h3>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          {MUTAGENS.map(m => (
            <button
              key={m.id}
              onClick={() => setMutagen(m.id)}
              disabled={disabled}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                mutagen === m.id
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-600 bg-darker hover:border-slate-500'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <p className="font-medium text-sm">{m.name}</p>
              <p className="text-xs text-slate-400 mt-1">{m.description}</p>
              <div className="flex gap-2 mt-2">
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded">
                  {m.mult} 突变率
                </span>
                {m.death !== '0%' && (
                  <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded">
                    {m.death} 死亡
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {mutagen === 'crispr' && (
          <div className="bg-darker rounded-lg p-3">
            <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
              <Target className="w-4 h-4" />
              CRISPR 靶向方向
            </label>
            <select
              value={mutagenTarget}
              onChange={(e) => setMutagenTarget(e.target.value)}
              disabled={disabled}
              className="w-full bg-dark border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
            >
              {MUTATION_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 text-xs text-amber-400/80">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>诱变会增加突变率，但也会导致额外的细胞死亡。基础突变率为 10⁻⁶ /细胞/回合</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-green-400">
            <Dna className="w-5 h-5" />
            有利突变 ({beneficialMutations.length})
          </h3>
          
          {beneficialMutations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">暂无有利突变</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {beneficialMutations.map(mut => (
                <div 
                  key={mut.id} 
                  className="bg-darker rounded-lg p-3 border border-green-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{mut.name}</span>
                    <span className={`text-xs ${getMutationTypeColor(mut.type)}`}>
                      {getMutationTypeName(mut.type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-3">
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                          className="bg-green-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((mut.frequency || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {((mut.frequency || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-green-400">
                      +{((mut.effect || 0) * 100).toFixed(0)}% 效果
                    </span>
                    <span className="text-xs text-slate-500">
                      第{mut.turnCreated}回合
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-400">
            <Dna className="w-5 h-5" />
            有害突变 ({harmfulMutations.length})
          </h3>
          
          {harmfulMutations.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">暂无有害突变</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {harmfulMutations.map(mut => (
                <div 
                  key={mut.id} 
                  className="bg-darker rounded-lg p-3 border border-red-500/20"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{mut.name}</span>
                    <span className={`text-xs ${getMutationTypeColor(mut.type)}`}>
                      {getMutationTypeName(mut.type)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-3">
                      <div className="w-full bg-slate-700 rounded-full h-1.5">
                        <div 
                          className="bg-red-500 h-1.5 rounded-full"
                          style={{ width: `${Math.min((mut.frequency || 0) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">
                      {((mut.frequency || 0) * 100).toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-red-400">
                      {((mut.effect || 0) * 100).toFixed(0)}% 效果
                    </span>
                    <span className="text-xs text-slate-500">
                      第{mut.turnCreated}回合
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-3">突变类型说明</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {MUTATION_TYPES.map(type => (
            <div key={type.id} className="bg-darker rounded-lg p-3">
              <span className={`font-medium ${type.color}`}>{type.name}</span>
              <p className="text-xs text-slate-400 mt-1">
                {type.id === 'growth_rate' && '影响细胞增殖速度'}
                {type.id === 'drug_resistance' && '对抗生素等药物的抗性'}
                {type.id === 'metabolic' && '代谢模式切换，影响营养利用'}
                {type.id === 'stemness' && '干细胞特性，影响分化能力'}
                {type.id === 'stress_resistance' && '对环境胁迫的耐受能力'}
                {type.id === 'differentiation' && '向特定谱系分化的潜能'}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
