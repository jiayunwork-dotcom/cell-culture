import { Thermometer, Droplets, FlaskConical, Wind, Activity } from 'lucide-react';

export default function EnvironmentPanel({ environment, setEnvironment, disabled }) {
  const updateEnv = (key, value) => {
    setEnvironment(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const calculateCost = () => {
    let cost = 50;
    cost += (environment.glucose || 0) * 0.5;
    cost += (environment.serum || 0) * 5;
    if (environment.essentialAA) cost += 30;
    if (environment.nonEssentialAA) cost += 20;
    cost += (environment.egf || 0) * 0.8;
    cost += (environment.fgf || 0) * 1.0;
    cost += (environment.vegf || 0) * 0.9;
    cost += (environment.ngf || 0) * 1.2;
    cost += Math.abs((environment.ph || 7.4) - 7.4) / 0.1 * 2;
    cost += Math.abs((environment.temperature || 37) - 37) / 0.5 * 3;
    cost += Math.abs((environment.co2 || 5) - 5) / 0.5 * 2;
    return Math.floor(cost);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Thermometer className="w-6 h-6 text-primary" />
          培养环境调控
        </h2>
        <div className="bg-accent/20 text-accent px-4 py-2 rounded-lg">
          <span className="text-sm">每回合消耗:</span>
          <span className="font-bold text-lg ml-2">¥{calculateCost()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-blue-400">
            <Droplets className="w-5 h-5" />
            基础营养
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>葡萄糖浓度</span>
                <span className="text-primary">{environment.glucose || 0} mM</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="1"
                value={environment.glucose || 0}
                onChange={(e) => updateEnv('glucose', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0</span>
                <span>最适: 25mM</span>
                <span>50</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>血清浓度</span>
                <span className="text-primary">{environment.serum || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={environment.serum || 0}
                onChange={(e) => updateEnv('serum', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0% (停滞)</span>
                <span>最适: 10%</span>
                <span>20%</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={environment.essentialAA || false}
                  onChange={(e) => updateEnv('essentialAA', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-darker text-primary focus:ring-primary"
                />
                <span>必需氨基酸补充 (+¥30/回合)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={environment.nonEssentialAA || false}
                  onChange={(e) => updateEnv('nonEssentialAA', e.target.checked)}
                  disabled={disabled}
                  className="w-4 h-4 rounded border-slate-600 bg-darker text-primary focus:ring-primary"
                />
                <span>非必需氨基酸补充 (+¥20/回合)</span>
              </label>
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-purple-400">
            <FlaskConical className="w-5 h-5" />
            生长因子 (ng/mL)
          </h3>
          
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>EGF (表皮生长因子)</span>
                <span className="text-purple-400">{environment.egf || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={environment.egf || 0}
                onChange={(e) => updateEnv('egf', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>FGF (成纤维生长因子)</span>
                <span className="text-purple-400">{environment.fgf || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={environment.fgf || 0}
                onChange={(e) => updateEnv('fgf', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>VEGF (血管内皮生长因子)</span>
                <span className="text-purple-400">{environment.vegf || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={environment.vegf || 0}
                onChange={(e) => updateEnv('vegf', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>NGF (神经生长因子)</span>
                <span className="text-purple-400">{environment.ngf || 0}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={environment.ngf || 0}
                onChange={(e) => updateEnv('ngf', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-orange-400">
            <Activity className="w-5 h-5" />
            物理环境
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>pH值</span>
                <span className="text-orange-400">{environment.ph?.toFixed(1) || 7.4}</span>
              </div>
              <input
                type="range"
                min="6.0"
                max="8.0"
                step="0.1"
                value={environment.ph || 7.4}
                onChange={(e) => updateEnv('ph', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>6.0 酸性</span>
                <span>最适: 7.4</span>
                <span>8.0 碱性</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>温度</span>
                <span className="text-orange-400">{environment.temperature || 37}°C</span>
              </div>
              <input
                type="range"
                min="30"
                max="42"
                step="0.5"
                value={environment.temperature || 37}
                onChange={(e) => updateEnv('temperature', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>30°C</span>
                <span>最适: 37°C</span>
                <span>42°C</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-dark rounded-xl p-5 border border-slate-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-cyan-400">
            <Wind className="w-5 h-5" />
            气体环境
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>CO₂浓度</span>
                <span className="text-cyan-400">{environment.co2 || 0}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={environment.co2 || 5}
                onChange={(e) => updateEnv('co2', parseFloat(e.target.value))}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-slate-500">
                <span>0%</span>
                <span>最适: 5%</span>
                <span>10%</span>
              </div>
            </div>

            <div className="bg-darker rounded-lg p-3 mt-4">
              <h4 className="text-sm font-medium mb-2 text-slate-300">交互效应提示</h4>
              <ul className="text-xs text-slate-400 space-y-1">
                <li>• 高血清 + 充足氨基酸 = 协同增殖效果</li>
                <li>• 低pH + 高温 = 毒性放大</li>
                <li>• 血清低于5% = G1期停滞</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
