import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  LogIn, 
  UserPlus, 
  LogOut, 
  Timer, 
  ChevronLeft, 
  User,
  Zap,
  Share2
} from 'lucide-react';

// --- Types ---
interface UserData {
  username: string;
  email: string;
}

interface LeaderboardEntry {
  username: string;
  time: number;
  timestamp: string;
}

type GameState = 'START' | 'WAITING' | 'CLICK_NOW' | 'RESULT' | 'TOO_SOON';
type View = 'GAME' | 'LEADERBOARD' | 'LOGIN' | 'SIGNUP';

// --- Components ---

export default function App() {
  const [view, setView] = useState<View>('GAME');
  const [user, setUser] = useState<UserData | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setView('GAME');
  };

  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] text-stone-300 font-sans selection:bg-stone-100 selection:text-black overflow-hidden">
      {/* Navigation Header */}
      <nav className="h-20 px-8 flex justify-between items-center border-b border-white/5 bg-[#0a0a0a] shrink-0">
        <div 
          className="flex flex-col cursor-pointer" 
          onClick={() => setView('GAME')}
        >
          <h1 className="serif text-3xl text-white tracking-tight">
            Reaction<span className="italic text-stone-500 text-2xl">.lab</span>
          </h1>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mt-1">Precision Measurement Suite</p>
        </div>

        <div className="flex gap-8 sm:gap-12 text-[11px] uppercase tracking-[0.2em] font-medium items-center">
          <button 
            onClick={() => setView('GAME')}
            className={`${view === 'GAME' ? 'text-white border-b border-white pb-1' : 'text-stone-500 hover:text-white'}`}
          >
            Test
          </button>
          <button 
            onClick={() => setView('LEADERBOARD')}
            className={`${view === 'LEADERBOARD' ? 'text-white border-b border-white pb-1' : 'text-stone-500 hover:text-white'}`}
          >
            Records
          </button>
          
          {user ? (
            <div className="flex items-center gap-6">
              <span className="hidden sm:inline text-stone-500">{user.username}</span>
              <button 
                onClick={handleLogout}
                className="text-stone-500 hover:text-white"
                title="Logout"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setView('LOGIN')}
              className="text-stone-500 hover:text-white"
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-6 overflow-y-auto relative py-8">
        {view === 'GAME' && <ReactionGame user={user} token={token} />}
        {view === 'LEADERBOARD' && <Leaderboard setView={setView} />}
        {view === 'LOGIN' && <AuthForm type="LOGIN" setUser={setUser} setToken={setToken} setView={setView} />}
        {view === 'SIGNUP' && <AuthForm type="SIGNUP" setUser={setUser} setToken={setToken} setView={setView} />}
      </main>

      <footer className="shrink-0 px-10 py-6 flex flex-col sm:flex-row justify-between items-center border-t border-white/5 gap-4">
        <div className="flex gap-8 order-2 sm:order-1">
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-stone-600 tracking-tighter">Hardware Accel</span>
            <span className="text-[10px] text-stone-400">Enabled</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] uppercase text-stone-600 tracking-tighter">Clock Sync</span>
            <span className="text-[10px] text-stone-400 font-mono italic">performance.now()</span>
          </div>
        </div>
        <div className="flex flex-col items-center sm:items-end gap-1 order-1 sm:order-2">
           <div className="text-[12px] sm:text-sm text-stone-300 uppercase tracking-[0.4em] font-medium">by Kairox</div>
           <div className="text-[9px] text-stone-700 uppercase tracking-widest">© 2024 Minimalist Dynamics</div>
        </div>
      </footer>
    </div>
  );
}

// --- View: Reaction Game ---

function ReactionGame({ user, token }: { user: UserData | null, token: string | null }) {
  const [gameState, setGameState] = useState<GameState>('START');
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [standing, setStanding] = useState<{ rank: number, percentile: number } | null>(null);
  const [copied, setCopied] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const circleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  // Helper for background color (direct style manipulation for precision)
  const updateCircleStyle = useCallback((state: GameState, time?: number) => {
    if (!circleRef.current || !textRef.current) return;
    
    let bgColor = '#141414';
    let borderColor = 'rgba(255, 255, 255, 0.05)';
    let content = '';
    
    switch (state) {
      case 'START':
        content = '<div class="flex flex-col items-center"><h2 class="serif italic text-4xl text-white mb-2">Click to start</h2><p class="text-[10px] uppercase tracking-[0.3em] text-stone-500">Initialization Required</p></div>';
        break;
      case 'WAITING': 
        bgColor = '#7f1d1d'; 
        borderColor = 'rgba(239, 68, 68, 0.5)'; 
        content = '<div class="flex flex-col items-center"><span class="serif italic text-3xl text-white/70">Wait for green...</span></div>';
        break;
      case 'CLICK_NOW': 
        bgColor = '#10b981'; 
        borderColor = 'rgba(52, 211, 153, 0.5)'; 
        content = '<div class="flex flex-col items-center"><span class="serif italic text-7xl text-white font-bold tracking-tighter">CLICK NOW!</span></div>';
        break;
      case 'RESULT': 
        bgColor = '#1e3a8a'; 
        borderColor = 'rgba(96, 165, 250, 0.5)'; 
        content = `<div class="flex flex-col items-center"><span class="text-[10px] uppercase tracking-[0.4em] text-blue-300/50 mb-2">Your time</span><div class="flex items-baseline gap-1"><span class="serif italic text-8xl text-white font-bold">${time}</span><span class="serif italic text-2xl text-white/50">ms</span></div><p class="text-[9px] uppercase tracking-[0.3em] text-stone-400 mt-8">Click to try again</p></div>`;
        break;
      case 'TOO_SOON': 
        bgColor = '#1c1917'; 
        borderColor = 'rgba(255, 255, 255, 0.05)'; 
        content = '<div class="flex flex-col items-center"><span class="serif italic text-5xl text-white mb-3">Too soon!</span><p class="text-[10px] uppercase tracking-[0.4em] text-stone-500">Tap to reset sequence</p></div>';
        break;
    }
    
    circleRef.current.style.backgroundColor = bgColor;
    circleRef.current.style.borderColor = borderColor;
    textRef.current.innerHTML = content;
  }, []);

  // Sync state with manual style update
  useEffect(() => {
    updateCircleStyle(gameState, lastTime || 0);
  }, [gameState, lastTime, updateCircleStyle]);

  const startGame = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    setGameState('WAITING');
    setLastTime(null);
    setStanding(null);
    setCopied(false);
    
    // Random delay between 1.5 and 5 seconds
    const delay = Math.floor(Math.random() * 3500) + 1500; 
    
    timerRef.current = setTimeout(() => {
      // Sync with the next paint for absolute precision
      requestAnimationFrame(() => {
        if (circleRef.current) {
          circleRef.current.style.backgroundColor = '#10b981';
          circleRef.current.style.borderColor = 'rgba(52, 211, 153, 0.5)';
        }
        startTimeRef.current = performance.now();
        setGameState('CLICK_NOW');
      });
    }, delay);
  }, []);

  const handleInteraction = useCallback(() => {
    // CAPTURE TIME IMMEDIATELY
    const now = performance.now();

    if (gameState === 'WAITING') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setGameState('TOO_SOON');
    } else if (gameState === 'CLICK_NOW') {
      const reactionTime = Math.round(now - startTimeRef.current);
      setLastTime(reactionTime);
      setGameState('RESULT');
      fetchRank(reactionTime);
    } else if (gameState === 'START' || gameState === 'RESULT' || gameState === 'TOO_SOON') {
      startGame();
    }
  }, [gameState, startGame]);

  const fetchRank = async (time: number) => {
    try {
      const res = await fetch(`/api/rank?time=${time}`);
      const data = await res.json();
      setStanding({ rank: data.rank, percentile: data.percentile });
    } catch (e) {
      console.error('Failed to fetch rank prediction');
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lastTime) return;

    const shareText = `⚡ I just scored ${lastTime} ms reaction time!${standing ? `\nI'm faster than ${standing.percentile}% of players.` : ''}\nCan you beat me? 👉 ${window.location.origin}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Reaction.lab Result',
          text: shareText,
          url: window.location.origin,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard failed:', err);
      }
    }
  };

  // Helper for background color
  const getCircleColor = () => {
    switch (gameState) {
      case 'WAITING': return 'bg-[#7f1d1d] border-red-500/50'; // Red
      case 'CLICK_NOW': return 'bg-[#10b981] border-emerald-400/50'; // Green
      case 'RESULT': return 'bg-[#1e3a8a] border-blue-400/50'; // Blue
      case 'TOO_SOON': return 'bg-[#1c1917] border-white/5'; // Neutral
      default: return 'bg-[#141414] border-white/5'; // Neutral
    }
  };

  return (
      <div className="flex-1 flex flex-col items-center justify-center w-full select-none gap-12 py-10">
        <div className="relative flex items-center justify-center shrink-0">
          {/* Decorative background circle */}
          <div className="absolute w-[400px] h-[400px] sm:w-[480px] sm:h-[480px] border border-white/[0.02] rounded-full"></div>
          <div className="absolute w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] border border-white/[0.04] rounded-full"></div>
          
          {/* Main Interaction Circle */}
          <div 
            ref={circleRef}
            onPointerDown={handleInteraction}
            className="w-[300px] h-[300px] sm:w-[380px] sm:h-[380px] rounded-full border-2 flex flex-col items-center justify-center text-center p-10 cursor-pointer shadow-[0_0_80px_rgba(0,0,0,0.5)] z-10 interaction-circle"
          >
            <div ref={textRef} className="flex flex-col items-center justify-center w-full h-full">
              {/* Content injected via updateCircleStyle for max performance */}
            </div>
          </div>
        </div>

        {/* Persistence and Rank Overlay - Unified Flow */}
        {gameState === 'RESULT' && (
          <div className="flex flex-col items-center gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {standing && (
              <div className="px-6 py-3 border border-white/5 bg-white/[0.02] rounded-2xl backdrop-blur-md text-center max-w-xs transition-colors hover:border-white/10">
                <p className="text-[9px] text-stone-500 uppercase tracking-widest mb-1">Global Standing Estimate</p>
                {standing.rank <= 200 ? (
                  <p className="text-sm text-stone-300 font-medium">Ranked approximately <span className="text-white italic serif text-lg px-px">#{standing.rank}</span> overall</p>
                ) : (
                  <p className="text-sm text-stone-300 font-medium">Faster than <span className="text-white italic serif text-lg px-px">{standing.percentile}%</span> of players</p>
                )}
              </div>
            )}
            
            <button 
              onClick={handleShare}
              className="px-10 py-4 bg-transparent border border-white/10 text-stone-300 text-xs uppercase tracking-[0.2em] font-bold hover:bg-white/5 active:bg-white/10 transition-all flex items-center justify-center gap-3 rounded-2xl"
            >
              <Share2 size={14} className={copied ? "text-emerald-400" : ""} />
              {copied ? 'Copied!' : 'Share Result'}
            </button>
          </div>
        )}

        {/* Mode Status Footer */}
        <div className="flex flex-col sm:flex-row items-center gap-6 text-[10px] uppercase tracking-widest text-stone-600 mt-2 opacity-50">
          <div className="flex items-center gap-2">
            <Zap size={12} className={gameState === 'CLICK_NOW' ? 'text-emerald-500' : 'text-stone-700'} />
            <span>Precision: performance.now()</span>
          </div>
          <div className="hidden sm:block w-px h-3 bg-stone-900 opacity-50"></div>
          <div>{user ? `Operator: ${user.username}` : 'Anonymous Link Active'}</div>
        </div>
      </div>
  );
}

// --- View: Leaderboard ---

function Leaderboard({ setView }: { setView: (v: View) => void }) {
  const [scores, setScores] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`HTTP error! status: ${res.status}, body: ${errorText}`);
        }
        const data = await res.json();
        setScores(data);
      } catch (e) {
        console.error('Failed to fetch scores:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchScores();
  }, []);

  return (
    <div 
      className="max-w-4xl mx-auto w-full flex flex-col items-center pb-20"
    >
      <div className="flex items-end justify-between w-full mb-12 border-b border-white/5 pb-8 pt-4">
        <div className="flex flex-col">
          <h2 className="serif text-4xl text-white tracking-tight">Global <span className="italic text-stone-500">Records</span></h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 mt-2">Verified Response Times (Top 500)</p>
        </div>
      </div>

      <div className="w-full space-y-2">
        {loading ? (
          <div className="py-20 text-center text-stone-600 text-xs uppercase tracking-widest animate-pulse">Syncing Database...</div>
        ) : scores.length === 0 ? (
          <div className="py-20 text-center text-stone-600 text-xs uppercase tracking-widest">Null Set. Records Empty.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
            {scores.map((s, i) => (
              <div key={i} className="flex justify-between items-baseline group py-2 border-b border-white/[0.02]">
                <div className="flex gap-4 items-baseline">
                  <span className="text-[10px] text-stone-600 font-mono">{(i+1).toString().padStart(2, '0')}.</span>
                  <span className="text-xs text-stone-400 group-hover:text-stone-200 uppercase tracking-wider">{s.username}</span>
                </div>
                <span className="serif italic text-white text-lg">{s.time}ms</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// --- View: Login / Signup ---

function AuthForm({ type, setUser, setToken, setView }: { 
  type: 'LOGIN' | 'SIGNUP', 
  setUser: (u: UserData) => void,
  setToken: (t: string) => void,
  setView: (v: View) => void 
}) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const endpoint = type === 'LOGIN' ? '/api/login' : '/api/signup';
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setToken(data.token);
        setUser(data.user);
        setView('GAME');
      } else {
        setError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setError('System connection error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="max-w-[400px] mx-auto w-full p-10 flex flex-col gap-10 bg-white/[0.02] border border-white/5 rounded-[2.5rem] backdrop-blur-md shadow-2xl relative z-10"
    >
      <div className="text-center flex flex-col gap-3">
        <h2 className="serif text-4xl text-white tracking-tight">
          {type === 'LOGIN' ? 'Sign In' : 'Register'}
        </h2>
        <p className="text-[10px] uppercase tracking-[0.4em] text-stone-500 font-medium">Access Global Suite</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {type === 'SIGNUP' && (
          <div className="flex flex-col gap-2">
            <label className="text-[9px] uppercase tracking-widest text-stone-600 font-bold ml-4">Username</label>
            <input 
              type="text" 
              required
              className="bg-white/[0.03] border border-white/[0.05] rounded-2xl px-5 py-4 focus:border-white/20 focus:bg-white/[0.06] outline-none text-white text-sm placeholder:text-stone-800"
              placeholder="System Identity"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
            />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <label className="text-[9px] uppercase tracking-widest text-stone-600 font-bold ml-4">Email Address</label>
          <input 
            type="email" 
            required
            className="bg-white/[0.03] border border-white/[0.05] rounded-2xl px-5 py-4 focus:border-white/20 focus:bg-white/[0.06] outline-none text-white text-sm placeholder:text-stone-800"
            placeholder="node@network.com"
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-[9px] uppercase tracking-widest text-stone-600 font-bold ml-4">Password</label>
          <input 
            type="password" 
            required
            className="bg-white/[0.03] border border-white/[0.05] rounded-2xl px-5 py-4 focus:border-white/20 focus:bg-white/[0.06] outline-none text-white text-sm placeholder:text-stone-800"
            placeholder="••••••••"
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
          />
        </div>

        {error && <p className="text-red-500 text-[10px] uppercase tracking-widest text-center mt-2">{error}</p>}

        <div className="flex flex-col gap-4 mt-4">
          <button 
            type="submit" 
            disabled={loading}
            className="px-8 py-4 bg-white text-black text-xs uppercase tracking-[0.2em] font-bold hover:bg-stone-200 disabled:opacity-50 rounded-2xl active:bg-stone-300"
          >
            {loading ? 'Authenticating...' : type === 'LOGIN' ? 'Initiate Session' : 'Register Node'}
          </button>
        </div>
      </form>

      <div className="text-center">
        <button 
          onClick={() => setView(type === 'LOGIN' ? 'SIGNUP' : 'LOGIN')}
          className="text-[10px] uppercase tracking-widest text-stone-600 hover:text-white font-bold"
        >
          {type === 'LOGIN' ? "Create new profile" : "Return to sign in"}
        </button>
      </div>
    </div>
  );
}
