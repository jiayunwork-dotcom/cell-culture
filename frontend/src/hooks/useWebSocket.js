import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url) {
  const [readyState, setReadyState] = useState(0);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectCountRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setReadyState(1);
      reconnectCountRef.current = 0;
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected, code:', event.code);
      setReadyState(0);

      if (reconnectCountRef.current < 5) {
        reconnectCountRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectCountRef.current), 10000);
        console.log(`Reconnecting in ${delay}ms (attempt ${reconnectCountRef.current})`);
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onmessage = (message) => {
      try {
        setLastMessage({ data: message.data, timestamp: Date.now() });
      } catch (e) {
        console.error('Error processing message:', e);
      }
    };
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(message);
        return true;
      } catch (e) {
        console.error('Failed to send message:', e);
        return false;
      }
    } else {
      console.warn('WebSocket not connected, message not sent');
      return false;
    }
  }, []);

  return {
    readyState,
    lastMessage,
    sendMessage,
  };
}
