import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import GamePage from './pages/GamePage';
import ReplayMode from './components/ReplayMode';
import { useWebSocket } from './hooks/useWebSocket';

function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [player, setPlayer] = useState(null);
  const [replayMode, setReplayMode] = useState(false);
  const [replayData, setReplayData] = useState(null);

  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';

  const { sendMessage, lastMessage, readyState } = useWebSocket(wsUrl);

  useEffect(() => {
    setWsConnected(readyState === 1);
  }, [readyState]);

  useEffect(() => {
    if (!lastMessage) return;

    try {
      const data = JSON.parse(lastMessage.data);
      if (data.type === 'game_state') {
        setGameState(data.data);
      } else if (data.type === 'joined_room' || data.type === 'room_created') {
        setPlayer(data.data.player);
        const initialState = {
          room: data.data.room,
          players: [data.data.player],
          environment: null,
          population: null,
          mutations: [],
          selection: null,
          differentiations: [],
          patents: [],
          contaminations: [],
          contracts: [],
          auctions: [],
          messages: [],
          submittedCount: 1,
          timeline: [],
        };
        setGameState(initialState);
      } else if (data.type === 'timeline') {
        setGameState(prev => prev ? { ...prev, timeline: data.data } : prev);
      } else if (data.type === 'replay_data') {
        setReplayData(data.data);
        setReplayMode(true);
      }
    } catch (e) {
      console.error('Failed to parse message:', e);
    }
  }, [lastMessage]);

  const createRoom = useCallback((roomName, playerName, color, maxPlayers, maxTurns) => {
    sendMessage(JSON.stringify({
      type: 'create_room',
      data: {
        roomName,
        playerName,
        color,
        maxPlayers,
        maxTurns,
      }
    }));
  }, [sendMessage]);

  const joinRoom = useCallback((roomId, playerName, color) => {
    sendMessage(JSON.stringify({
      type: 'join_room',
      data: {
        roomId,
        playerName,
        color,
      }
    }));
  }, [sendMessage]);

  const submitAction = useCallback((action) => {
    sendMessage(JSON.stringify({
      type: 'submit_action',
      data: action
    }));
  }, [sendMessage]);

  const startGame = useCallback(() => {
    sendMessage(JSON.stringify({
      type: 'start_game',
      data: {}
    }));
  }, [sendMessage]);

  const sendChat = useCallback((message) => {
    sendMessage(JSON.stringify({
      type: 'chat_message',
      data: { message }
    }));
  }, [sendMessage]);

  const placeBid = useCallback((auctionId, amount) => {
    sendMessage(JSON.stringify({
      type: 'place_bid',
      data: { auctionId, amount }
    }));
  }, [sendMessage]);

  const listRooms = useCallback(() => {
    sendMessage(JSON.stringify({
      type: 'list_rooms',
      data: {}
    }));
  }, [sendMessage]);

  const startReplay = useCallback(() => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8080';
    if (gameState?.room?.id) {
      fetch(`${apiUrl}/api/rooms/${gameState.room.id}/replay`)
        .then(res => res.json())
        .then(data => {
          setReplayData(data);
          setReplayMode(true);
        })
        .catch(err => {
          console.error('Failed to fetch replay data:', err);
          sendMessage(JSON.stringify({
            type: 'get_replay_data',
            data: {}
          }));
        });
    } else {
      sendMessage(JSON.stringify({
        type: 'get_replay_data',
        data: {}
      }));
    }
  }, [sendMessage, gameState]);

  const exitReplay = useCallback(() => {
    setReplayMode(false);
    setReplayData(null);
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-darker text-slate-200">
        {replayMode && replayData && (
          <ReplayMode
            replayData={replayData}
            players={gameState?.players || []}
            onExit={exitReplay}
          />
        )}
        <Routes>
          <Route 
            path="/" 
            element={
              <HomePage 
                wsConnected={wsConnected}
                createRoom={createRoom}
                joinRoom={joinRoom}
                listRooms={listRooms}
                gameState={gameState}
                player={player}
              />
            } 
          />
          <Route 
            path="/game" 
            element={
              gameState && player ? (
                <GamePage 
                  gameState={gameState}
                  player={player}
                  submitAction={submitAction}
                  startGame={startGame}
                  sendChat={sendChat}
                  placeBid={placeBid}
                  wsConnected={wsConnected}
                  onStartReplay={startReplay}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
