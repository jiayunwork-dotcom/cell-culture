import { useState } from 'react';
import { Shield, AlertTriangle, ThermometerSun, Droplets, Wind, Pill } from 'lucide-react';

const ANTIBIOTICS = [
  { id: '', name: '无' },
  { id: 'puromycin', name: '嘌呤霉素' },
  { id: 'g418', name: 'G418' },
  { id: 'hygromycin', name: '潮霉素' },
];

export default function SelectionPanel({ selection, setSelection, disabled }) {
  const updateSelection = (key, value) => {
    setSelection(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const hasPressure = selection?.antibiotic || selection?.nutrientLimit || selection?.heatShock || selection?.hypoxia;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Shield className="w-6 h-6 text-primary" />
        选择压力
      </h2>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 font-medium">警告：选择压力会大量杀死细胞</p>
            <p className="text-amber-300/70 text-sm mt-1">
              但存活下来的细胞将具有特定的抗性表型。施加压力期间无需额外花费。
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-red-400">
            <Pill className="w-5 h-5" />
            抗生素筛选
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">选择抗生素</label>
              <select
                value={selection?.antibiotic || ''}
                onChange={(e) => updateSelection('antibiotic', e.target.value)}
                disabled={disabled}
                className="w-full bg-darker border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
              >
                {ANTIBIOTICS.map(ab => (
                  <option key={ab.id} value={ab.id}>{ab.name}</option>
                ))}
              </select>
            </div>

            {selection?.antibiotic && (
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>浓度</span>
                  <span className="text-red-400">{selection?.antibioticConc || 50} μg/mL</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={selection?.antibioticConc || 50}
                  onChange={(e) => updateSelection('antibioticConc', parseFloat(e.target.value))}
                  disabled={disabled}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>低</span>
                  <span>高</span>
                </div>
              </div>
            )}

            <div className="bg-darker rounded-lg p-3 text-xs text-slate-400">
              <p>• 无抗性细胞死亡率: 5-50% (取决于浓度)</p>
              <p>• 抗性突变细胞将获得生存优势</p>
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-yellow-400">
            <Droplets className="w-5 h-5" />
            营养限制
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">限制营养</label>
              <select
                value={selection?.nutrientLimit || ''}
                onChange={(e) => updateSelection('nutrientLimit', e.target.value)}
                disabled={disabled}
                className="w-full bg-darker border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
              >
                <option value="">无限制</option>
                <option value="essential_aa">必需氨基酸缺乏</option>
                <option value="glucose">葡萄糖限制</option>
                <option value="serum">血清剥夺</option>
              </select>
            </div>

            <div className="bg-darker rounded-lg p-3 text-xs text-slate-400">
              <p>• 只有能自主合成该营养的突变体存活</p>
              <p>• 死亡率: 约40-50%</p>
              <p>• 筛选代谢相关突变</p>
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-orange-400">
            <ThermometerSun className="w-5 h-5" />
            温度应激
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selection?.heatShock || false}
                onChange={(e) => updateSelection('heatShock', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-darker text-orange-500 focus:ring-orange-500"
              />
              <span>42°C 热休克</span>
            </label>

            <div className="bg-darker rounded-lg p-3 text-xs text-slate-400">
              <p>• 非耐热细胞死亡: 约80%</p>
              <p>• 筛选热耐受表型</p>
              <p>• 热休克蛋白表达相关突变</p>
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-cyan-400">
            <Wind className="w-5 h-5" />
            低氧培养
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selection?.hypoxia || false}
                onChange={(e) => updateSelection('hypoxia', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 rounded border-slate-600 bg-darker text-cyan-500 focus:ring-cyan-500"
              />
              <span>1% O₂ 低氧环境</span>
            </label>

            <div className="bg-darker rounded-lg p-3 text-xs text-slate-400">
              <p>• 非适应细胞死亡: 约30%</p>
              <p>• 筛选缺氧适应性细胞</p>
              <p>• HIF通路相关突变</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-3">选择策略提示</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-darker rounded-lg p-3">
            <p className="text-primary font-medium mb-1">渐进式筛选</p>
            <p className="text-slate-400 text-xs">先低浓度筛选，逐步提高压力，避免细胞全部死亡</p>
          </div>
          <div className="bg-darker rounded-lg p-3">
            <p className="text-primary font-medium mb-1">诱变+筛选</p>
            <p className="text-slate-400 text-xs">诱变后立即施加选择压力，可快速富集有利突变</p>
          </div>
          <div className="bg-darker rounded-lg p-3">
            <p className="text-primary font-medium mb-1">恢复培养</p>
            <p className="text-slate-400 text-xs">筛选后解除压力，让幸存者快速增殖恢复数量</p>
          </div>
        </div>
      </div>
    </div>
  );
}
