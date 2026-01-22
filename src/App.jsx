import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, addDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { Home, TrendingUp, Book } from 'lucide-react';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'topstep-sniper',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'demo'
};

let app, auth, db;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.log('Firebase offline mode');
}

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [trades, setTrades] = useState([]);
  const [capital, setCapital] = useState(50000);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auth
  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).then(({ user }) => {
        setUser(user);
        setLoading(false);
        loadData(user.uid);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (userId) => {
    if (!db) return;
    try {
      const q = query(collection(db, 'trades'), where('userId', '==', userId));
      onSnapshot(q, (snapshot) => {
        setTrades(snapshot.docs.map(doc => doc.data()));
      });
    } catch (e) {
      console.log('Offline:', e);
    }
  };

  const addTrade = async (trade) => {
    const newTrade = { ...trade, userId: user?.uid, timestamp: new Date() };
    setTrades([...trades, newTrade]);
    if (db && user) {
      try {
        await addDoc(collection(db, 'trades'), newTrade);
      } catch (e) {
        console.log('Save offline');
      }
    }
  };

  const stats = {
    totalTrades: trades.length,
    winRate: trades.length > 0 ? Math.round((trades.filter(t => t.pnl > 0).length / trades.length) * 100) : 0,
    totalPnl: trades.reduce((sum, t) => sum + (t.pnl || 0), 0),
    balance: capital + (trades.reduce((sum, t) => sum + (t.pnl || 0), 0))
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#0f0f1e] text-white">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#0f0f1e] text-white">
      {/* Navigation */}
      <nav className="bg-[#1a1a2e] border-b border-[#ffa500] p-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <h1 className="text-2xl font-bold text-[#ffa500]">🎯 Topstep Sniper</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('home')}
              className={`flex items-center gap-2 px-4 py-2 rounded ${activeTab === 'home' ? 'bg-[#ffa500] text-black' : 'text-gray-300'}`}
            >
              <Home size={18} /> Accueil
            </button>
            <button
              onClick={() => setActiveTab('desk')}
              className={`flex items-center gap-2 px-4 py-2 rounded ${activeTab === 'desk' ? 'bg-[#ffa500] text-black' : 'text-gray-300'}`}
            >
              <TrendingUp size={18} /> Trading Desk
            </button>
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded ${activeTab === 'journal' ? 'bg-[#ffa500] text-black' : 'text-gray-300'}`}
            >
              <Book size={18} /> Journal
            </button>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'home' && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-[#1a1a2e] p-6 rounded border border-[#ffa500]">
              <p className="text-gray-400">Balance</p>
              <p className="text-3xl font-bold text-[#ffa500]">${stats.balance.toFixed(2)}</p>
            </div>
            <div className="bg-[#1a1a2e] p-6 rounded border border-[#ffa500]">
              <p className="text-gray-400">P&L Total</p>
              <p className={`text-3xl font-bold ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${stats.totalPnl.toFixed(2)}
              </p>
            </div>
            <div className="bg-[#1a1a2e] p-6 rounded border border-[#ffa500]">
              <p className="text-gray-400">Win Rate</p>
              <p className="text-3xl font-bold text-[#ffa500]">{stats.winRate}%</p>
            </div>
            <div className="bg-[#1a1a2e] p-6 rounded border border-[#ffa500]">
              <p className="text-gray-400">Trades</p>
              <p className="text-3xl font-bold text-[#ffa500]">{stats.totalTrades}</p>
            </div>
          </div>
        )}

        {activeTab === 'desk' && (
          <TradeDesk onAddTrade={addTrade} />
        )}

        {activeTab === 'journal' && (
          <div className="bg-[#1a1a2e] rounded p-6 border border-[#ffa500]">
            <h2 className="text-2xl font-bold mb-4">Journal de Trading</h2>
            <div className="space-y-4">
              {trades.map((trade, idx) => (
                <div key={idx} className="bg-[#0f0f1e] p-4 rounded border border-gray-700">
                  <div className="flex justify-between">
                    <span className="font-bold">{trade.type}</span>
                    <span className={trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}>
                      {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                    </span>
                  </div>
                  {trade.emotion && <p className="text-sm text-gray-400 mt-2">Émotion: {trade.emotion}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TradeDesk = ({ onAddTrade }) => {
  const [type, setType] = useState('BUY');
  const [pnl, setPnl] = useState('');
  const [emotion, setEmotion] = useState('');

  const handleAdd = () => {
    if (pnl) {
      onAddTrade({ type, pnl: parseFloat(pnl), emotion });
      setPnl('');
      setEmotion('');
    }
  };

  return (
    <div className="bg-[#1a1a2e] rounded p-6 border border-[#ffa500]">
      <h2 className="text-2xl font-bold mb-6">Trading Desk</h2>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-2">Type</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full bg-[#0f0f1e] border border-[#ffa500] rounded p-2">
            <option>BUY</option>
            <option>SELL</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-2">P&L</label>
          <input type="number" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="Profit ou perte" className="w-full bg-[#0f0f1e] border border-[#ffa500] rounded p-2" />
        </div>
        <div>
          <label className="block text-sm mb-2">Émotion</label>
          <input type="text" value={emotion} onChange={(e) => setEmotion(e.target.value)} placeholder="Ex: Calme, FOMO..." className="w-full bg-[#0f0f1e] border border-[#ffa500] rounded p-2" />
        </div>
        <button onClick={handleAdd} className="w-full bg-[#ffa500] text-black font-bold py-2 rounded hover:bg-orange-600">
          Enregistrer Trade
        </button>
      </div>
    </div>
  );
};

export default App;
