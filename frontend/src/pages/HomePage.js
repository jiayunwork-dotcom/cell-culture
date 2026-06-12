import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FlaskConical, Users, Play, Plus, Wifi, WifiOff, FileText } from 'lucide-react';

const COLORS = [
  '#22c55e',
  '#0ea5e9',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#ec4899',
];

export default function HomePage({ 
  wsConnected, 
  createRoom, 
  joinRoom, 
  listRooms,
  gameState,
  player 
}) {
  const navigate = useNavigate();
  const [view, setView] = useState('main');
  const [playerName, setPlayerName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [roomName, setRoomName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [maxTurns, setMaxTurns] = useState(20);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [rooms, setRooms] = useState([]);

  useEffect(() => {
    if (gameState && player) {
      navigate('/game');
    }
  }, [gameState, player, navigate]);

  useEffect(() => {
    if (wsConnected) {
      listRooms();
    }
  }, [wsConnected, listRooms]);

  useEffect(() => {
    if (gameState && gameState.rooms) {
      setRooms(gameState.rooms);
    }
  }, [gameState]);

  const handleCreateRoom = () => {
    if (!playerName.trim() || !roomName.trim()) {
      alert('请输入玩家名称和房间名称');
      return;
    }
    createRoom(roomName, playerName, selectedColor, maxPlayers, maxTurns);
  };

  const handleJoinRoom = () => {
    if (!playerName.trim() || !joinRoomId.trim()) {
      alert('请输入玩家名称和房间ID');
      return;
    }
    joinRoom(joinRoomId, playerName, selectedColor);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-darker via-dark to-darker flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <FlaskConical className="w-12 h-12 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              细胞培养实验室
            </h1>
          </div>
          <p className="text-slate-400 text-lg">
            多人在线回合制细胞培养与生物实验策略游戏
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            {wsConnected ? (
              <>
                <Wifi className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm">已连接</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-danger" />
                <span className="text-danger text-sm">未连接</span>
              </>
            )}
          </div>
        </div>

        {view === 'main' && (
          <div className="space-y-4">
            <div className="bg-dark rounded-xl p-6 border border-slate-700">
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  玩家名称
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="输入你的名字"
                  className="w-full px-4 py-3 bg-darker border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  选择颜色
                </label>
                <div className="flex gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setView('create')}
                className="bg-primary hover:bg-green-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                创建房间
              </button>
              <button
                onClick={() => setView('join')}
                className="bg-secondary hover:bg-sky-600 text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Users className="w-5 h-5" />
                加入房间
              </button>
            </div>

            <Link
              to="/reports"
              className="block bg-dark hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-semibold py-4 px-6 rounded-xl transition-all text-center"
            >
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5 text-accent" />
                实验报告广场
              </div>
              <p className="text-xs text-slate-500 mt-1">查看其他玩家发布的实验报告</p>
            </Link>

            <div className="bg-dark rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-secondary" />
                游戏规则
              </h3>
              <ul className="space-y-2 text-slate-300 text-sm">
                <li>• 4-6人同时对战，每人管理一个细胞培养实验室</li>
                <li>• 通过调控培养环境、施加诱变和选择压力来培育细胞株</li>
                <li>• 20回合后综合评分最高者获胜</li>
                <li>• 评分 = 总细胞数 × 多样性指数 + 功能细胞价值 + 专利收入</li>
              </ul>
            </div>
          </div>
        )}

        {view === 'create' && (
          <div className="bg-dark rounded-xl p-6 border border-slate-700 space-y-4">
            <button
              onClick={() => setView('main')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ← 返回
            </button>
            
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Plus className="w-6 h-6 text-primary" />
              创建新房间
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                房间名称
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="我的实验室"
                className="w-full px-4 py-3 bg-darker border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  最大玩家数: {maxPlayers}
                </label>
                <input
                  type="range"
                  min="4"
                  max="6"
                  value={maxPlayers}
                  onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  总回合数: {maxTurns}
                </label>
                <input
                  type="range"
                  min="10"
                  max="30"
                  step="5"
                  value={maxTurns}
                  onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={!wsConnected}
              className="w-full bg-primary hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              创建并进入
            </button>
          </div>
        )}

        {view === 'join' && (
          <div className="bg-dark rounded-xl p-6 border border-slate-700 space-y-4">
            <button
              onClick={() => setView('main')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ← 返回
            </button>
            
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-secondary" />
              加入房间
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                房间ID
              </label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="输入房间ID"
                className="w-full px-4 py-3 bg-darker border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!wsConnected}
              className="w-full bg-secondary hover:bg-sky-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              加入游戏
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
