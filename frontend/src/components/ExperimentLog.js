import { useState } from 'react';
import {
  ClipboardList,
  ArrowUp,
  ArrowDown,
  ThermometerSun,
  Zap,
  Dna,
  FlaskConical,
  GitBranch,
  DollarSign,
  Plus,
  Minus,
  ChevronDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

const OPERATION_ICONS = {
  env: { icon: ThermometerSun, label: '环境调整', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  mutagen: { icon: Dna, label: '诱变剂', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  selection: { icon: Zap, label: '选择压力', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  passage: { icon: FlaskConical, label: '传代培养', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  diff: { icon: GitBranch, label: '细胞分化', color: 'text-pink-400', bg: 'bg-pink-500/20' },
  idle: { icon: AlertCircle, label: '未操作', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

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

export default function ExperimentLog({ timeline = [] }) {
  const [expandedId, setExpandedId] = useState(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-16 text-slate-500">
          <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">暂无实验日志</p>
          <p className="text-sm mt-2">完成第一个回合后，日志将显示在这里</p>
        </div>
      </div>
    );
  }

  const sortedLogs = [...timeline].sort((a, b) => b.turnNumber - a.turnNumber);

  const parseJSON = (str) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          实验日志
        </h2>
        <span className="text-sm text-slate-400">
          共 {timeline.length} 条记录
        </span>
      </div>

      {sortedLogs.map((log) => {
        const isExpanded = expandedId === log.id;
        const primaryOp = (log.operationTypes && log.operationTypes[0]) || 'idle';
        const opInfo = OPERATION_ICONS[primaryOp] || OPERATION_ICONS.idle;
        const OpIcon = opInfo.icon;

        const envParams = parseJSON(log.envParams);
        const pressureParams = parseJSON(log.pressureParams);

        return (
          <div
            key={log.id}
            className={`bg-dark border rounded-xl overflow-hidden transition-all ${
              isExpanded ? 'border-primary/50' : 'border-slate-700 hover:border-slate-600'
            }`}
          >
            <div
              className="p-4 cursor-pointer select-none"
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${opInfo.bg} flex items-center justify-center flex-shrink-0`}>
                  <OpIcon className={`w-6 h-6 ${opInfo.color}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-bold text-lg">第 {log.turnNumber} 回合</span>
                    <div className="flex gap-1 flex-wrap">
                      {(log.operationTypes || []).map((op, idx) => {
                        const info = OPERATION_ICONS[op] || OPERATION_ICONS.idle;
                        const Icon = info.icon;
                        return (
                          <span
                            key={idx}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${info.bg} ${info.color}`}
                            title={info.label}
                          >
                            <Icon className="w-3 h-3" />
                            {info.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 truncate">
                    {log.actionSummary || '无操作摘要'}
                  </p>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {log.cellDelta >= 0 ? (
                        <ArrowUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <ArrowDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${log.cellDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatNumber(log.cellDelta)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">细胞变化</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Dna className="w-4 h-4 text-purple-400" />
                      <span className="font-bold text-purple-400">
                        +{log.newMutations || 0}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">新突变</p>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {log.moneyDelta >= 0 ? (
                        <Plus className="w-4 h-4 text-green-400" />
                      ) : (
                        <Minus className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${log.moneyDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatMoney(Math.abs(log.moneyDelta))}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">资金变化</p>
                  </div>

                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-700 p-4 bg-darker/50">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-accent" />
                      资金收支明细
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">收入</span>
                        <span className="text-green-400 font-medium">
                          +{formatMoney(log.moneyIncome)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">支出</span>
                        <span className="text-red-400 font-medium">
                          -{formatMoney(log.moneyExpense)}
                        </span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-slate-700">
                        <span className="text-slate-300 font-medium">净变化</span>
                        <span className={`font-bold ${log.moneyDelta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {log.moneyDelta >= 0 ? '+' : ''}{formatMoney(log.moneyDelta)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      本回合操作
                    </h4>
                    <div className="space-y-2 text-sm">
                      {log.mutagenUsed && log.mutagenUsed !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">诱变剂</span>
                          <span className="text-purple-400">{log.mutagenUsed}</span>
                        </div>
                      )}
                      {log.mutagenTarget && log.mutagenUsed && log.mutagenUsed !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">诱变目标</span>
                          <span className="text-purple-400">{log.mutagenTarget}</span>
                        </div>
                      )}
                      {log.passageUsed && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">传代比例</span>
                          <span className="text-blue-400">1/{log.passageRatio}</span>
                        </div>
                      )}
                      {log.diffStarted && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">分化方向</span>
                          <span className="text-pink-400">{log.diffStarted}</span>
                        </div>
                      )}
                      {(!log.mutagenUsed || log.mutagenUsed === 'none') && !log.passageUsed && !log.diffStarted && (
                        <p className="text-slate-500">无特殊操作</p>
                      )}
                    </div>
                  </div>

                  {envParams && (
                    <div className="col-span-2">
                      <h4 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
                        <ThermometerSun className="w-4 h-4 text-cyan-400" />
                        环境参数
                      </h4>
                      <div className="grid grid-cols-4 gap-3 text-sm bg-dark rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-slate-400">葡萄糖</span>
                          <span className="text-slate-200">{envParams.glucose?.toFixed?.(1) || envParams.glucose}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">血清</span>
                          <span className="text-slate-200">{envParams.serum?.toFixed?.(1) || envParams.serum}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">pH</span>
                          <span className="text-slate-200">{envParams.ph?.toFixed?.(2) || envParams.ph}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">温度</span>
                          <span className="text-slate-200">{envParams.temperature?.toFixed?.(1) || envParams.temperature}°C</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">CO₂</span>
                          <span className="text-slate-200">{envParams.co2?.toFixed?.(1) || envParams.co2}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">EGF</span>
                          <span className="text-slate-200">{envParams.egf?.toFixed?.(1) || envParams.egf}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">FGF</span>
                          <span className="text-slate-200">{envParams.fgf?.toFixed?.(1) || envParams.fgf}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">必需AA</span>
                          <span className={envParams.essentialAA ? 'text-green-400' : 'text-red-400'}>
                            {envParams.essentialAA ? '启用' : '关闭'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {pressureParams && (pressureParams.antibiotic || pressureParams.nutrientLimit || pressureParams.heatShock || pressureParams.hypoxia) && (
                    <div className="col-span-2">
                      <h4 className="font-semibold text-sm text-slate-300 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        选择压力参数
                      </h4>
                      <div className="grid grid-cols-4 gap-3 text-sm bg-dark rounded-lg p-3">
                        {pressureParams.antibiotic && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">抗生素</span>
                            <span className="text-amber-400">
                              {pressureParams.antibiotic} ({pressureParams.antibioticConc?.toFixed?.(0) || pressureParams.antibioticConc}%)
                            </span>
                          </div>
                        )}
                        {pressureParams.nutrientLimit && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">营养限制</span>
                            <span className="text-amber-400">{pressureParams.nutrientLimit}</span>
                          </div>
                        )}
                        {pressureParams.heatShock && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">热休克</span>
                            <span className="text-amber-400">启用</span>
                          </div>
                        )}
                        {pressureParams.hypoxia && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">低氧</span>
                            <span className="text-amber-400">启用</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
