import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldCheck, 
  Zap,
  CheckCircle2,
  Circle,
  Save,
  Trash2,
  History,
  Settings,
  DollarSign,
  Target,
  Cloud,
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Smile,
  Upload,
  X,
  Home,
  ArrowRight,
  TrendingUp,
  Award,
  Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// Configuration Firebase (fournie par l'environnement)
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'topstep-sniper-journal';

const App = () => {
  // --- ÉTATS GÉNÉRAUX ---
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home'); 
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedTrade, setExpandedTrade] = useState(null);

  // --- ÉTATS TRADING JOURNAL & RÉGLAGES ---
  const [tradeLogs, setTradeLogs] = useState([]);
  const [startingCapital, setStartingCapital] = useState(50000);
  
  // États temporaires pour la saisie d'un nouveau trade
  const [tempPnl, setTempPnl] = useState("");
  const [tempEmotions, setTempEmotions] = useState("");
  const [tempScreenshot, setTempScreenshot] = useState(""); 
  
  const [checklist, setChecklist] = useState([
    { id: 1, text: "M30 : Direction Jaune/Gris (Pas de Bleu)", status: false, category: "CONTEXTE" },
    { id: 2, text: "IDCM : Pas de sur-achat/vente extrême", status: false, category: "CONTEXTE" },
    { id: 3, text: "M5 : Direction = M30 (Convergence)", status: false, category: "SIGNAL" },
    { id: 4, text: "US RIDER (M5) : Label de force apparu", status: false, category: "SIGNAL" },
    { id: 5, text: "VECTEUR DORÉ (M5) : Couleur confirmée", status: false, category: "SIGNAL" },
    { id: 6, text: "SL : Placé derrière Vecteur Doré M5", status: false, category: "RISQUE" },
  ]);

  // --- AUTHENTIFICATION (RÈGLE 3) ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Erreur Auth:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- SYNCHRONISATION FIRESTORE (RÈGLES 1 & 2) ---
  useEffect(() => {
    if (!user) return;

    // Charger le capital de départ sauvegardé
    const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'account');
    const unsubSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.startingCapital) setStartingCapital(data.startingCapital);
      }
    });

    // Écouter les trades enregistrés
    const tradesRef = collection(db, 'artifacts', appId, 'users', user.uid, 'trades');
    const unsubTrades = onSnapshot(tradesRef, (snap) => {
      const trades = [];
      snap.forEach(doc => trades.push({ id: doc.id, ...doc.data() }));
      // Tri manuel en mémoire (Règle 2 : pas de orderBy complexe)
      setTradeLogs(trades.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)));
    });

    return () => {
      unsubSettings();
      unsubTrades();
    };
  }, [user]);

  // --- GESTION DE L'IMPORTATION D'IMAGE ---
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Limitation pour Firestore (max ~800Ko recommandé en base64)
    if (file.size > 800000) {
      alert("L'image est trop lourde (max 800Ko). Veuillez réduire la qualité de votre capture.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setTempScreenshot(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // --- SAUVEGARDE DU CAPITAL SUR FIREBASE ---
  const updateCapital = async (newVal) => {
    const val = Number(newVal);
    setStartingCapital(val);
    if (!user) return;
    setIsSyncing(true);
    try {
      const settingsDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'settings', 'account');
      await setDoc(settingsDocRef, { startingCapital: val }, { merge: true });
    } catch (err) {
      console.error("Erreur sauvegarde capital:", err);
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  // --- CALCUL DES STATISTIQUES ---
  const stats = React.useMemo(() => {
    const totalTrades = tradeLogs.length;
    const wins = tradeLogs.filter(t => Number(t.pnl) > 0);
    const losses = tradeLogs.filter(t => Number(t.pnl) < 0);
    const winRate = totalTrades > 0 ? (wins.length / totalTrades) * 100 : 0;
    const grossProfit = wins.reduce((acc, t) => acc + Number(t.pnl), 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + Number(t.pnl), 0));
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : (grossProfit > 0 ? "INF" : "0.00");
    const netProfit = tradeLogs.reduce((acc, t) => acc + Number(t.pnl), 0);
    const lastTrade = tradeLogs.length > 0 ? tradeLogs[0] : null;
    return { totalTrades, wins: wins.length, losses: losses.length, winRate, profitFactor, netProfit, lastTrade };
  }, [tradeLogs]);

  // --- GESTION DE LA CHECKLIST ---
  const toggleCheck = (id) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, status: !item.status } : item));
  };

  // --- ENREGISTREMENT DU TRADE ---
  const saveTrade = async () => {
    if (!user || tempPnl === "") return;
    setIsSyncing(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'trades'), {
        timestamp: serverTimestamp(),
        checklistStatus: checklist.filter(i => i.status).length,
        type: checklist[0].status ? 'BUY' : 'SELL', 
        pnl: Number(tempPnl),
        emotions: tempEmotions,
        screenshotData: tempScreenshot 
      });
      // Réinitialisation du formulaire
      setChecklist(prev => prev.map(i => ({ ...i, status: false })));
      setTempPnl("");
      setTempEmotions("");
      setTempScreenshot("");
      setActiveTab('performance');
    } catch (err) { 
      console.error("Erreur sauvegarde trade:", err); 
    } finally { 
      setIsSyncing(false); 
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-slate-200 font-sans p-2 lg:p-6 flex flex-col">
      
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-6 border-b border-slate-800/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-3 rounded-2xl shadow-lg shadow-amber-500/20">
            <Target size={28} className="text-[#05070a]" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Topstep <span className="text-amber-500">Sniper</span> Desk</h1>
            <div className="flex items-center gap-2">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Système de Trading Cloud</p>
              {isSyncing && <Cloud size={12} className="text-emerald-500 animate-pulse" />}
            </div>
          </div>
        </div>

        <nav className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('home')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 ${activeTab === 'home' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
            <Home size={14} /> Accueil
          </button>
          <button onClick={() => setActiveTab('desk')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 ${activeTab === 'desk' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
            <LayoutDashboard size={14} /> Desk
          </button>
          <button onClick={() => setActiveTab('performance')} className={`flex items-center gap-2 px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all shrink-0 ${activeTab === 'performance' ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
            <BarChart3 size={14} /> Performance
          </button>
        </nav>
      </header>

      {/* --- PAGE D'ACCUEIL --- */}
      {activeTab === 'home' && (
        <div className="flex-1 flex flex-col items-center justify-center max-w-5xl mx-auto w-full animate-fadeIn pb-12">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-4 py-1.5 rounded-full text-amber-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
              <Zap size={14} className="animate-pulse" /> État de session prêt
            </div>
            <h2 className="text-4xl lg:text-5xl font-black text-white uppercase italic tracking-tighter mb-4">Snipez avec <span className="text-amber-500">Précision</span></h2>
            <p className="text-slate-500 text-sm font-medium max-w-lg mx-auto leading-relaxed font-bold uppercase tracking-tighter">Maîtrisez votre journal, analysez vos émotions et gravissez les paliers Topstep.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-amber-500/30 transition-all">
              <div className="bg-slate-800 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-xl">
                <DollarSign className="text-amber-500" size={32} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance de Compte</span>
              <div className="text-3xl font-black text-white italic tracking-tighter font-mono">${(Number(startingCapital) + stats.netProfit).toLocaleString()}</div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-emerald-500/30 transition-all">
              <div className="bg-slate-800 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-xl">
                <TrendingUp className="text-emerald-500" size={32} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Ratio de Victoires</span>
              <div className="text-3xl font-black text-white italic tracking-tighter font-mono">{stats.winRate.toFixed(1)}%</div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col items-center text-center group hover:border-blue-500/30 transition-all">
              <div className="bg-slate-800 p-4 rounded-2xl mb-4 group-hover:scale-110 transition-transform shadow-xl">
                <Award className="text-blue-500" size={32} />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Volume de Trades</span>
              <div className="text-3xl font-black text-white italic tracking-tighter font-mono">{stats.totalTrades}</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full">
            <button 
              onClick={() => setActiveTab('desk')}
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black p-6 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-amber-500/20 active:scale-95 group"
            >
              Nouveau Trade <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button 
              onClick={() => setActiveTab('performance')}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-white p-6 rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 transition-all active:scale-95 border border-white/5"
            >
              Historique Cloud <History size={20} />
            </button>
          </div>

          {stats.lastTrade && (
            <div className="mt-12 w-full p-6 bg-white/5 border border-white/5 rounded-3xl flex items-center justify-between shadow-inner">
              <div className="flex items-center gap-4">
                <div className="bg-slate-800 p-2 rounded-lg">
                  <Clock size={16} className="text-slate-400" />
                </div>
                <div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Dernier Sniping enregistré :</span>
                  <div className="text-[11px] font-bold text-slate-300 italic">{stats.lastTrade.timestamp?.toDate().toLocaleDateString()} — {stats.lastTrade.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
              <div className={`text-xl font-black italic tracking-tighter ${stats.lastTrade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.lastTrade.pnl >= 0 ? '+' : ''}{stats.lastTrade.pnl}$
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- TRADING DESK --- */}
      {activeTab === 'desk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn max-w-7xl mx-auto w-full">
          <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-lg font-black text-white flex items-center gap-3 mb-6 uppercase italic border-b border-slate-800 pb-4">
              <ShieldCheck className="text-amber-500" /> Validation Technique
            </h2>
            <div className="space-y-3">
              {checklist.map(item => (
                <button key={item.id} onClick={() => toggleCheck(item.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all duration-300 ${item.status ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-black/40 border-slate-800 text-slate-500 hover:border-slate-600'}`}>
                  <div className="flex flex-col items-start text-left">
                    <span className="text-[8px] font-black opacity-50 mb-1 tracking-widest">{item.category}</span>
                    <span className="text-xs font-bold uppercase tracking-tight">{item.text}</span>
                  </div>
                  {item.status ? <CheckCircle2 size={20} className="text-emerald-500" /> : <Circle size={20} className="opacity-20" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-lg font-black text-white mb-6 uppercase italic border-b border-slate-800 pb-4">Journal de session</h2>
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><DollarSign size={16} className="text-amber-500" /></div>
                  <input type="number" placeholder="P&L NET RÉALISÉ ($)" value={tempPnl} onChange={(e) => setTempPnl(e.target.value)} className="w-full bg-black border border-slate-800 rounded-xl py-4 pl-10 pr-4 text-xs font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-700" />
                </div>

                <div className="relative">
                  <div className="absolute top-4 left-4 flex items-start pointer-events-none"><Smile size={16} className="text-slate-600" /></div>
                  <textarea 
                    placeholder="PSYCHOLOGIE : VOTRE ÉTAT D'ESPRIT LORS DU TRADE..." 
                    value={tempEmotions} 
                    onChange={(e) => setTempEmotions(e.target.value)}
                    rows="3"
                    className="w-full bg-black border border-slate-800 rounded-xl py-4 pl-10 pr-4 text-xs font-bold text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-700 resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Capture Graphique (Optionnel)</span>
                    {tempScreenshot && (
                      <button onClick={() => setTempScreenshot("")} className="text-rose-500 hover:text-rose-400 flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter">
                        <X size={12} /> Supprimer
                      </button>
                    )}
                  </div>
                  
                  {!tempScreenshot ? (
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-2xl cursor-pointer bg-black/40 hover:bg-black/60 hover:border-amber-500/50 transition-all group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload size={24} className="text-slate-600 mb-2 group-hover:text-amber-500 group-hover:scale-110 transition-transform" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300">Importer une capture</p>
                      </div>
                      <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                  ) : (
                    <div className="relative rounded-2xl overflow-hidden border border-amber-500/30 group h-32 shadow-xl">
                      <img src={tempScreenshot} alt="Preview" className="w-full h-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all" />
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="bg-amber-500 text-black text-[9px] font-black px-2 py-1 rounded">IMAGE PRÊTE</span>
                      </div>
                    </div>
                  )}
                </div>
                
                {checklist.every(i => i.status) && tempPnl !== "" ? (
                  <button onClick={saveTrade} className="w-full p-6 bg-emerald-500 text-black font-black rounded-2xl animate-pulse shadow-xl shadow-emerald-500/20 flex flex-col items-center mt-4 transition-transform hover:scale-[1.01] active:scale-95">
                    <Save size={24} className="mb-1" /> ARCHIVER SUR LE CLOUD
                  </button>
                ) : (
                  <div className="p-6 bg-slate-800/20 rounded-2xl text-slate-600 font-bold text-center border border-dashed border-slate-800 text-[10px] uppercase tracking-widest leading-relaxed">
                    Validez la checklist complète + Saisissez le P&L pour enregistrer
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto w-full">
          {/* Configuration du Compte */}
          <div className="bg-slate-900/30 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-3 rounded-2xl"><Settings size={20} className="text-amber-500" /></div>
              <div>
                <h3 className="text-sm font-black text-white uppercase italic">Configuration du Compte</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Balance Initiale de votre compte Topstep</p>
              </div>
            </div>
            <div className="relative w-full md:w-64">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><DollarSign size={16} className="text-amber-500" /></div>
              <input 
                type="number" 
                value={startingCapital} 
                onChange={(e) => updateCapital(e.target.value)} 
                className="w-full bg-black border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-xs font-bold text-white focus:border-amber-500 outline-none" 
              />
            </div>
          </div>

          {/* Cartes de Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Taux de Réussite", value: `${stats.winRate.toFixed(1)}%`, sub: `${stats.wins}W — ${stats.losses}L`, icon: <Target className="text-blue-500" size={16} /> },
              { label: "Profit Factor", value: stats.profitFactor, sub: "Ratio Gains/Pertes", icon: <BarChart3 className="text-amber-500" size={16} /> },
              { label: "Trades Totaux", value: stats.totalTrades, sub: "Base historique", icon: <Zap className="text-purple-500" size={16} /> },
              { label: "Balance Finale", value: `$${(Number(startingCapital) + stats.netProfit).toLocaleString()}`, sub: `Profit Net: $${stats.netProfit.toLocaleString()}`, color: stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500", icon: <DollarSign className={stats.netProfit >= 0 ? "text-emerald-500" : "text-rose-500"} size={16} /> }
            ].map((s, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl shadow-xl hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
                  {s.icon}
                </div>
                <div className={`text-2xl font-black italic tracking-tighter ${s.color || "text-white"}`}>{s.value}</div>
                <span className="text-[9px] text-slate-600 font-bold uppercase">{s.sub}</span>
              </div>
            ))}
          </div>

          {/* Table d'Historique */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-3xl p-8 overflow-hidden shadow-2xl">
            <h2 className="text-xl font-black text-white flex items-center gap-3 uppercase italic mb-8 border-b border-slate-800 pb-4">
              <History className="text-amber-500" /> Historique Consolidé
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-500 uppercase font-black tracking-widest">
                    <th className="pb-4 w-8"></th>
                    <th className="pb-4">Date</th>
                    <th className="pb-4 text-center">Score Plan</th>
                    <th className="pb-4 text-center">Capture</th>
                    <th className="pb-4 text-right">P&L ($)</th>
                    <th className="pb-4 text-right pr-4">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {tradeLogs.map(trade => (
                    <React.Fragment key={trade.id}>
                      <tr className={`border-b border-slate-800/50 transition-colors ${expandedTrade === trade.id ? 'bg-white/5' : 'hover:bg-white/5'}`}>
                        <td className="py-4">
                          <button onClick={() => setExpandedTrade(expandedTrade === trade.id ? null : trade.id)} className="p-1 text-slate-600 hover:text-white transition-colors">
                            {expandedTrade === trade.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                          </button>
                        </td>
                        <td className="py-4 font-mono text-slate-400">{trade.timestamp?.toDate().toLocaleDateString() || 'Sync...'}</td>
                        <td className="py-4 text-center font-bold text-amber-500">{trade.checklistStatus}/6</td>
                        <td className="py-4 text-center">
                          {trade.screenshotData ? (
                            <div className="flex justify-center">
                              <img src={trade.screenshotData} className="w-8 h-8 object-cover rounded border border-slate-800 shadow-md" alt="cap" />
                            </div>
                          ) : (
                            <span className="text-slate-800 text-[9px] font-black uppercase italic tracking-widest">AUCUNE</span>
                          )}
                        </td>
                        <td className={`py-4 text-right font-mono font-black italic tracking-tighter ${trade.pnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{trade.pnl >= 0 ? '+' : ''}{trade.pnl}$</td>
                        <td className="py-4 text-right pr-2">
                          <button onClick={() => deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'trades', trade.id))} className="p-2 text-slate-800 hover:text-rose-500 transition-all">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {expandedTrade === trade.id && (
                        <tr className="bg-black/40">
                          <td colSpan="6" className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="flex flex-col gap-4">
                                <div className="flex items-start gap-3">
                                  <MessageSquare className="text-amber-500 shrink-0" size={16} />
                                  <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase italic mb-1 tracking-widest">Psychologie & Notes de session</h4>
                                    <p className="text-xs text-slate-300 italic leading-relaxed whitespace-pre-wrap">
                                      {trade.emotions || "Aucune note psychologique enregistrée pour ce trade."}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 border-t border-slate-800 pt-4">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Type d'entrée : <span className={trade.type === 'BUY' ? 'text-emerald-500' : 'text-rose-500'}>{trade.type}</span></span>
                                </div>
                              </div>
                              {trade.screenshotData && (
                                <div className="rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
                                   <img src={trade.screenshotData} className="w-full h-auto" alt="Capture de trading" />
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {tradeLogs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-slate-600 font-bold uppercase tracking-[0.4em]">Aucun sniping dans l'historique cloud</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-slate-800 pt-6 text-center text-slate-700 text-[9px] font-black uppercase tracking-[0.4em] italic">
        Topstep Sniper Suite • Station de Performance Cloud • 2026
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}} />
    </div>
  );
};

export default App;
