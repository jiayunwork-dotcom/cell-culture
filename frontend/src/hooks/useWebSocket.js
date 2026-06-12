import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [readyState, setReadyState] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setReadyState(1);
    };

    ws.onclose = () => {
      setReadyState(0);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setReadyState(0);
    };

    ws.onmessage = (message) => {
      setLastMessage({ data: message.data, timestamp: Date.now() });
    };

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(message);
    } else {
      console.warn('WebSocket not connected, message not sent');
    }
  }, []);

  return {
    readyState,
    lastMessage,
    sendMessage,
  };
}
