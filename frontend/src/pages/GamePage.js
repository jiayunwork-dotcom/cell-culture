import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Users, DollarSign, Trophy, MessageCircle, Gavel, Dna, ThermometerSun, Zap, Send, ClipboardList, Play, FileText } from 'lucide-react';
import EnvironmentPanel from '../components/EnvironmentPanel';
import CellStatusPanel from '../components/CellStatusPanel';
import MutationPanel from '../components/MutationPanel';
import SelectionPanel from '../components/SelectionPanel';
import DifferentiationPanel from '../components/DifferentiationPanel';
import ChatPanel from '../components/ChatPanel';
import AuctionPanel from '../components/AuctionPanel';
import PlayerList from '../components/PlayerList';
import ExperimentLog from '../components/ExperimentLog';

export default function GamePage({ 
  gameState, 
  player, 
  submitAction, 
  startGame,
  sendChat,
  placeBid,
  wsConnected,
  onStartReplay,
  onGenerateReport
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('environment');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [environment, setEnvironment] = useState(gameState?.environment || {});
  const [selection, setSelection] = useState(gameState?.selection || {});
  const [mutagen, setMutagen] = useState('none');
  const [mutagenTarget, setMutagenTarget] = useState('growth_rate');
  const [passage, setPassage] = useState(false);
  const [passageRatio, setPassageRatio] = useState(10);
  const [startDiff, setStartDiff] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (gameState?.environment) {
      setEnvironment(gameState.environment);
    }
    if (gameState?.selection) {
      setSelection(gameState.selection);
    }
  }, [gameState]);

  const handleSubmit = () => {
    const action = {
      environment,
      mutagen,
      mutagenTarget,
      selection,
      passage,
      passageRatio,
      submitReady: true,
    };

    if (startDiff) {
      action.startDiff = startDiff;
    }

    submitAction(action);
    setSubmitted(true);
    setStartDiff(null);
  };

  const isWaiting = gameState?.room?.status === 'waiting';
  const isPlaying = gameState?.room?.status === 'playing';
  const isFinished = gameState?.room?.status === 'finished';

  const canSubmit = isPlaying && !submitted;

  useEffect(() => {
    if (gameState?.room?.currentTurn !== undefined) {
      setSubmitted(false);
    }
  }, [gameState?.room?.currentTurn]);

  const handleStartDiff = (cellType, count) => {
    setStartDiff({ cellType, count });
  };

  const tabs = [
    { id: 'environment', label: '培养环境', icon: ThermometerSun },
    { id: 'cells', label: '细胞状态', icon: FlaskConical },
    { id: 'mutations', label: '突变库', icon: Dna },
    { id: 'selection', label: '选择压力', icon: Zap },
    { id: 'differentiation', label: '干细胞分化', icon: FlaskConical },
    { id: 'auction', label: '拍卖市场', icon: Gavel },
    { id: 'log', label: '实验日志', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-darker flex flex-col">
      <header className="bg-dark border-b border-slate-700 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FlaskConical className="w-6 h-6 text-primary" />
              <span className="font-bold text-lg">{gameState?.room?.name}</span>
            </div>
            <div className="text-sm text-slate-400">
              回合 {gameState?.room?.currentTurn || 0} / {gameState?.room?.maxTurns || 20}
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              isWaiting ? 'bg-amber-500/20 text-amber-400' :
              isPlaying ? 'bg-green-500/20 text-green-400' :
              'bg-purple-500/20 text-purple-400'
            }`}>
              {isWaiting ? '等待开始' : isPlaying ? '进行中' : '已结束'}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-accent" />
              <span className="font-semibold text-accent">
                ¥{Math.floor(player?.money || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold">
                {Math.floor(gameState?.population?.totalCells || 0).toLocaleString()} 细胞
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-secondary" />
              <span>{(gameState?.players || []).length} / {gameState?.room?.maxPlayers}</span>
            </div>
          </div>
        </div>
      </header>

      {isWaiting && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 py-4 text-center">
          <div className="max-w-7xl mx-auto px-4">
            <p className="text-amber-400 mb-3">
              等待玩家加入... ({(gameState?.players || []).length}/{gameState?.room?.maxPlayers})
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={startGame}
                disabled={(gameState?.players || []).length < 4}
                className="bg-primary hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-all"
              >
                开始游戏
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              房间ID: {gameState?.room?.id}
            </p>
          </div>
        </div>
      )}

      {submitted && isPlaying && (
        <div className="bg-green-500/10 border-b border-green-500/30 py-2 text-center">
          <p className="text-green-400 text-sm">
            ✓ 你已提交本回合操作，等待其他玩家... ({gameState?.submittedCount || 0}/{(gameState?.players || []).length})
          </p>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-slate-700 bg-dark/50">
            <div className="flex gap-1 px-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'environment' && (
              <EnvironmentPanel 
                environment={environment} 
                setEnvironment={setEnvironment}
                disabled={!canSubmit}
              />
            )}
            {activeTab === 'cells' && (
              <CellStatusPanel 
                population={gameState?.population}
                environment={gameState?.environment}
              />
            )}
            {activeTab === 'mutations' && (
              <MutationPanel 
                mutations={gameState?.mutations || []}
                mutagen={mutagen}
                setMutagen={setMutagen}
                mutagenTarget={mutagenTarget}
                setMutagenTarget={setMutagenTarget}
                disabled={!canSubmit}
              />
            )}
            {activeTab === 'selection' && (
              <SelectionPanel 
                selection={selection}
                setSelection={setSelection}
                disabled={!canSubmit}
              />
            )}
            {activeTab === 'differentiation' && (
              <DifferentiationPanel 
                differentiations={gameState?.differentiations || []}
                population={gameState?.population}
                onStartDiff={handleStartDiff}
                disabled={!canSubmit}
              />
            )}
            {activeTab === 'auction' && (
              <AuctionPanel 
                auctions={gameState?.auctions || []}
                playerMoney={player?.money || 0}
                onPlaceBid={placeBid}
              />
            )}
            {activeTab === 'log' && (
              <ExperimentLog timeline={gameState?.timeline || []} />
            )}
          </div>

          {isPlaying && (
            <div className="border-t border-slate-700 bg-dark p-4">
              <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="text-sm text-slate-400">
                  {submitted ? (
                    <span className="text-green-400">✓ 已提交</span>
                  ) : (
                    <span>调整参数后点击"结束回合"提交操作</span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPassage(!passage)}
                    disabled={!canSubmit}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      passage
                        ? 'bg-accent text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {passage ? '✓ 已选择传代' : '传代培养'}
                  </button>
                  {passage && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">稀释比例: 1/{passageRatio}</span>
                      <input
                        type="range"
                        min="2"
                        max="100"
                        value={passageRatio}
                        onChange={(e) => setPassageRatio(parseInt(e.target.value))}
                        className="w-24"
                      />
                    </div>
                  )}
                  <button
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className="bg-primary hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-all"
                  >
                    结束回合
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="w-80 border-l border-slate-700 flex flex-col bg-dark/50">
          <PlayerList players={gameState?.players || []} />
          <ChatPanel 
            messages={gameState?.messages || []}
            onSend={sendChat}
          />
        </div>
      </div>

      {isFinished && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-dark border border-slate-600 rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-center mb-6">
              🏆 游戏结束
            </h2>
            <div className="space-y-3 mb-6">
              {[...(gameState?.players || [])]
                .sort((a, b) => b.score - a.score)
                .map((p, index) => (
                  <div 
                    key={p.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0 ? 'bg-yellow-500/20 border border-yellow-500/50' :
                      index === 1 ? 'bg-slate-400/20 border border-slate-400/50' :
                      index === 2 ? 'bg-amber-600/20 border border-amber-600/50' :
                      'bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold w-6 text-center">
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                      </span>
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="font-medium">{p.name}</span>
                      {p.isYou && <span className="text-xs text-primary">(你)</span>}
                    </div>
                    <span className="font-bold text-lg">
                      {Math.floor(p.score).toLocaleString()}
                    </span>
                  </div>
                ))}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (generatingReport) return;
                  setGeneratingReport(true);
                  try {
                    const report = await onGenerateReport?.();
                    if (report) {
                      navigate(`/report/${report.id}`);
                    }
                  } finally {
                    setGeneratingReport(false);
                  }
                }}
                disabled={generatingReport}
                className="w-full bg-accent hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {generatingReport ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div>
                    生成中...
                  </>
                ) : (
                  <>
                    <FileText className="w-5 h-5" />
                    生成实验报告
                  </>
                )}
              </button>
              <div className="flex gap-2">
                <button
                  onClick={onStartReplay}
                  className="flex-1 bg-secondary hover:bg-cyan-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  回放
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  再来一局
                </button>
              </div>
              <button
                onClick={() => navigate('/reports')}
                className="w-full text-slate-400 hover:text-white text-sm py-2 transition-all"
              >
                查看报告广场 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
