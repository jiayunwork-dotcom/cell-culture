import { useState } from 'react';
import { Gavel, Clock, DollarSign, Users } from 'lucide-react';

export default function AuctionPanel({ auctions, playerMoney, onPlaceBid }) {
  const [bidAmounts, setBidAmounts] = useState({});

  const activeAuctions = auctions?.filter(a => a.status === 'active') || [];

  const handleBid = (auctionId) => {
    const amount = bidAmounts[auctionId] || 0;
    if (amount > 0 && amount <= playerMoney) {
      onPlaceBid(auctionId, amount);
    }
  };

  const getBidAmount = (auctionId) => {
    return bidAmounts[auctionId] || 50;
  };

  const setBidAmount = (auctionId, amount) => {
    setBidAmounts(prev => ({
      ...prev,
      [auctionId]: amount
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Gavel className="w-6 h-6 text-primary" />
        试剂拍卖
      </h2>

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DollarSign className="w-5 h-5 text-accent" />
            <span className="text-slate-300">你的资金:</span>
          </div>
          <span className="text-xl font-bold text-accent">
            ¥{Math.floor(playerMoney).toLocaleString()}
          </span>
        </div>
      </div>

      {activeAuctions.length === 0 ? (
        <div className="bg-dark rounded-xl p-8 border border-slate-700 text-center">
          <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">当前没有进行中的拍卖</p>
          <p className="text-sm text-slate-500 mt-1">
            稀有试剂每3回合刷新一次
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeAuctions.map(auction => {
            const currentBid = auction.bids?.reduce((max, b) => Math.max(max, b.amount), 0) || 0;
            const bidCount = auction.bids?.length || 0;
            
            return (
              <div 
                key={auction.id}
                className="bg-dark rounded-xl p-5 border border-slate-700"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-purple-400">
                      {auction.itemName}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                      数量: {auction.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-400">
                        第 {auction.turnNumber} 回合
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Users className="w-4 h-4 text-slate-500" />
                      <span className="text-sm text-slate-400">
                        {bidCount} 人竞拍
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-darker rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">当前最高价</span>
                    <span className="font-bold text-accent">¥{currentBid}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="range"
                      min="10"
                      max="1000"
                      step="10"
                      value={getBidAmount(auction.id)}
                      onChange={(e) => setBidAmount(auction.id, parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>¥10</span>
                      <span className="text-primary font-medium">¥{getBidAmount(auction.id)}</span>
                      <span>¥1000</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleBid(auction.id)}
                    disabled={getBidAmount(auction.id) <= currentBid || getBidAmount(auction.id) > playerMoney}
                    className="bg-accent hover:bg-amber-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold px-4 py-2 rounded-lg transition-all"
                  >
                    出价
                  </button>
                </div>

                {getBidAmount(auction.id) <= currentBid && (
                  <p className="text-xs text-red-400 mt-2">
                  出价必须高于当前最高价
                </p>
                )}
                {getBidAmount(auction.id) > playerMoney && (
                  <p className="text-xs text-red-400 mt-2">
                    资金不足
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-dark rounded-xl p-5 border border-slate-700">
        <h3 className="font-semibold mb-3">📋 拍卖规则</h3>
        <ul className="text-sm text-slate-400 space-y-2">
          <li>• 每3回合会有新的稀有试剂拍卖</li>
          <li>• 本回合结束时结算，价高者得</li>
          <li>• 竞拍成功后从账户自动扣除费用</li>
          <li>• 稀有试剂可以帮助你快速提升细胞性能</li>
        </ul>
      </div>
    </div>
  );
}
