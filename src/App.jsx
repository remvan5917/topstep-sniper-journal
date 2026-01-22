import React, { useState } from 'react';
import { Home, BarChart3, TrendingUp } from 'lucide-react';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [trades, setTrades] = useState([
    { id: 1, pnl: 150, emotion: 'Confident', date: '2024-01-22' },
    { id: 2, pnl: -50, emotion: 'Anxious', date: '2024-01-21' },
  ]);
  const [capital, setCapital] = useState(50000);
  const [newTrade, setNewTrade] = useState({ pnl: '', emotion: '' });

  const addTrade = () => {
    if (newTrade.pnl && newTrade.emotion) {
      setTrades([...trades, {
        id: trades.length + 1,
        pnl: parseFloat(newTrade.pnl),
        emotion: newTrade.emotion,
        date: new Date().toISOString().split('T')[0]
      }]);
      setCapital(capital + parseFloat(newTrade.pnl));
      setNewTrade({ pnl: '', emotion: '' });
    }
  };

  const totalProfit = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winRate = trades.filter(t => t.pnl > 0).length / trades.length * 100;
  const balance = capital + totalProfit;

  return (
    <div style={{
      backgroundColor: '#0f0f1e',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
      padding: '20px'
    }}>
      {/* Navigation */}
      <div style={{
        display: 'flex',
        gap: '20px',
        marginBottom: '30px',
        borderBottom: '1px solid #333',
        paddingBottom: '15px'
      }}>
        <button
          onClick={() => setActiveTab('home')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'home' ? '#00d4ff' : '#999',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Home size={20} /> Accueil
        </button>
        <button
          onClick={() => setActiveTab('desk')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'desk' ? '#00d4ff' : '#999',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={20} /> Trading Desk
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          style={{
            background: 'none',
            border: 'none',
            color: activeTab === 'performance' ? '#00d4ff' : '#999',
            fontSize: '16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <BarChart3 size={20} /> Performance
        </button>
      </div>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#00d4ff' }}>Topstep Sniper Journal</h1>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
              <div style={{ color: '#999', fontSize: '14px', marginBottom: '10px' }}>Balance Totale</div>
              <div style={{ fontSize: '28px', color: '#00d4ff', fontWeight: 'bold' }}>${balance.toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
              <div style={{ color: '#999', fontSize: '14px', marginBottom: '10px' }}>Profit Total</div>
              <div style={{ fontSize: '28px', color: totalProfit > 0 ? '#00ff88' : '#ff0055', fontWeight: 'bold' }}>${totalProfit.toFixed(2)}</div>
            </div>
            <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
              <div style={{ color: '#999', fontSize: '14px', marginBottom: '10px' }}>Win Rate</div>
              <div style={{ fontSize: '28px', color: '#00d4ff', fontWeight: 'bold' }}>{winRate.toFixed(1)}%</div>
            </div>
          </div>
          <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
            <h2 style={{ color: '#00d4ff', marginBottom: '15px' }}>Derniers Trades</h2>
            {trades.slice(-5).reverse().map(trade => (
              <div key={trade.id} style={{ padding: '10px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between' }}>
                <div>{trade.date} - {trade.emotion}</div>
                <div style={{ color: trade.pnl > 0 ? '#00ff88' : '#ff0055' }}>${trade.pnl.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trading Desk Tab */}
      {activeTab === 'desk' && (
        <div style={{ maxWidth: '600px' }}>
          <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#00d4ff' }}>Trading Desk</h1>
          <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#999' }}>P&L (Profit & Loss)</label>
              <input
                type="number"
                placeholder="Ex: 150 ou -50"
                value={newTrade.pnl}
                onChange={(e) => setNewTrade({ ...newTrade, pnl: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f0f1e',
                  border: '1px solid #00d4ff',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: '#999' }}>Émotions</label>
              <input
                type="text"
                placeholder="Ex: Confiant, Peureux, Calme..."
                value={newTrade.emotion}
                onChange={(e) => setNewTrade({ ...newTrade, emotion: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#0f0f1e',
                  border: '1px solid #00d4ff',
                  color: '#fff',
                  borderRadius: '4px',
                  fontSize: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              onClick={addTrade}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: '#00d4ff',
                border: 'none',
                color: '#0f0f1e',
                fontSize: '16px',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '0.8'}
              onMouseLeave={(e) => e.target.style.opacity = '1'}
            >
              Enregistrer Trade
            </button>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div>
          <h1 style={{ fontSize: '32px', marginBottom: '30px', color: '#00d4ff' }}>Performance</h1>
          <div style={{ backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', border: '1px solid #00d4ff', marginBottom: '20px' }}>
            <h2 style={{ color: '#00d4ff', marginBottom: '15px' }}>Tous les Trades ({trades.length})</h2>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {trades.map(trade => (
                <div key={trade.id} style={{ padding: '15px', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ color: '#00d4ff' }}>{trade.date}</div>
                    <div style={{ color: '#999', fontSize: '12px' }}>{trade.emotion}</div>
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: trade.pnl > 0 ? '#00ff88' : '#ff0055' }}>
                    ${trade.pnl > 0 ? '+' : ''}{trade.pnl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
