import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send } from 'lucide-react';

export default function ChatPanel({ messages, onSend }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col border-t border-slate-700">
      <div className="p-3 border-b border-slate-700">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <MessageCircle className="w-4 h-4" />
          聊天
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages?.length === 0 ? (
          <p className="text-center text-slate-500 text-sm py-4">暂无消息</p>
        ) : (
          messages?.map((msg, idx) => (
            <div key={idx} className="text-sm">
              <div className="flex items-baseline gap-2">
              <span className="font-medium text-primary">
                {msg.playerName || '玩家'}
              </span>
              <span className="text-xs text-slate-500">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <p className="text-slate-300 ml-0">{msg.message}</p>
          </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="发送消息..."
            className="flex-1 bg-darker border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-primary hover:bg-green-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
