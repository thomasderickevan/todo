import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useDriveSync } from '../hooks/useDriveSync';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import GuestStorageNotice from './GuestStorageNotice';
import guestUserIcon from '../assets/guest-user.svg';
import './CapitalFlow.css';

// ── Types ─────────────────────────────────────────────────────────
export type AssetType = 'crypto' | 'cash' | 'stock' | 'commodity' | 'other';

export interface AssetHolding {
  id: string;
  name: string;
  symbol: string;
  type: AssetType;
  quantity: number;
  purchasePrice: number;
  customPrice?: number;
  updatedAt: number;
}

export interface CashflowStream {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export interface MarketTicker {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  volume24h?: string;
  type: 'crypto' | 'forex';
}

export interface CapitalFlowData {
  holdings: AssetHolding[];
  streams: CashflowStream[];
}

const DEFAULT_DATA: CapitalFlowData = {
  holdings: [
    { id: 'init_1', name: 'Bitcoin', symbol: 'BTC', type: 'crypto', quantity: 0.25, purchasePrice: 65000, updatedAt: Date.now() },
    { id: 'init_2', name: 'Ethereum', symbol: 'ETH', type: 'crypto', quantity: 1.5, purchasePrice: 3200, updatedAt: Date.now() },
    { id: 'init_3', name: 'USD Treasury Reserve', symbol: 'USD', type: 'cash', quantity: 10000, purchasePrice: 1, updatedAt: Date.now() }
  ],
  streams: [
    { id: 'str_1', title: 'Core Contract / Salary', amount: 6500, type: 'income', category: 'Primary Revenue' },
    { id: 'str_2', title: 'Workstation & Cloud Server Infra', amount: 850, type: 'expense', category: 'Operational' },
    { id: 'str_3', title: 'Living & Facility Quarters', amount: 2200, type: 'expense', category: 'Living' }
  ]
};

const DEFAULT_MARKET_TICKERS: MarketTicker[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 95400, change24h: 2.45, high24h: 96800, low24h: 93200, type: 'crypto' },
  { symbol: 'ETH', name: 'Ethereum', price: 2750, change24h: -1.15, high24h: 2840, low24h: 2710, type: 'crypto' },
  { symbol: 'SOL', name: 'Solana', price: 185, change24h: 4.82, high24h: 192, low24h: 178, type: 'crypto' },
  { symbol: 'BNB', name: 'Binance Coin', price: 620, change24h: 0.95, high24h: 635, low24h: 610, type: 'crypto' },
  { symbol: 'EUR', name: 'Euro / USD', price: 1.08, change24h: 0.12, type: 'forex' },
  { symbol: 'GBP', name: 'British Pound', price: 1.29, change24h: -0.25, type: 'forex' },
  { symbol: 'JPY', name: 'Japanese Yen (USD/JPY)', price: 154.2, change24h: 0.45, type: 'forex' }
];

const ASSET_COLORS: Record<AssetType, string> = {
  crypto: '#FFB800',
  cash: '#00FF41',
  stock: '#00E5FF',
  commodity: '#FF7700',
  other: '#7C4DFF'
};

const ASSET_ICONS: Record<AssetType, string> = {
  crypto: '⚡',
  cash: '💵',
  stock: '📈',
  commodity: '🪙',
  other: '📦'
};

const CapitalFlow: React.FC = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  const { saveToDrive, isSyncing } = useDriveSync();

  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'cashflow' | 'markets'>('overview');
  const [data, setData] = useState<CapitalFlowData>(DEFAULT_DATA);
  const [marketTickers, setMarketTickers] = useState<MarketTicker[]>(DEFAULT_MARKET_TICKERS);
  const [isRefreshingMarket, setIsRefreshingMarket] = useState(false);
  const [lastFeedUpdate, setLastFeedUpdate] = useState<Date>(new Date());

  // Modals state
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [newAssetSymbol, setNewAssetSymbol] = useState('');
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetType, setNewAssetType] = useState<AssetType>('crypto');
  const [newAssetQty, setNewAssetQty] = useState('');
  const [newAssetPrice, setNewAssetPrice] = useState('');

  const [isAddStreamOpen, setIsAddStreamOpen] = useState(false);
  const [newStreamTitle, setNewStreamTitle] = useState('');
  const [newStreamAmount, setNewStreamAmount] = useState('');
  const [newStreamType, setNewStreamType] = useState<'income' | 'expense'>('income');
  const [newStreamCategory, setNewStreamCategory] = useState('Operational');

  const [marketSearchQuery, setMarketSearchQuery] = useState('');

  useEffect(() => {
    document.title = '✦ endeavor • CapitalFlow';
  }, []);

  // ── Live Market Feed Fetcher ─────────────────────────────────────
  const fetchMarketFeeds = useCallback(async () => {
    setIsRefreshingMarket(true);
    try {
      const updatedTickers: MarketTicker[] = [...DEFAULT_MARKET_TICKERS];

      // 1. Fetch Binance 24hr Tickers for top crypto assets
      try {
        const cryptoSymbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
        const binanceRes = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(cryptoSymbols))}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (binanceRes.ok) {
          const binanceData = await binanceRes.json();
          if (Array.isArray(binanceData)) {
            binanceData.forEach((item: { symbol: string; lastPrice: string; priceChangePercent: string; highPrice: string; lowPrice: string; quoteVolume: string }) => {
              const baseSymbol = item.symbol.replace('USDT', '');
              const existingIdx = updatedTickers.findIndex(t => t.symbol === baseSymbol);
              const tickerObj: MarketTicker = {
                symbol: baseSymbol,
                name: baseSymbol === 'BTC' ? 'Bitcoin' : baseSymbol === 'ETH' ? 'Ethereum' : baseSymbol === 'SOL' ? 'Solana' : baseSymbol === 'BNB' ? 'Binance Coin' : baseSymbol === 'XRP' ? 'Ripple' : 'Cardano',
                price: parseFloat(item.lastPrice),
                change24h: parseFloat(item.priceChangePercent),
                high24h: parseFloat(item.highPrice),
                low24h: parseFloat(item.lowPrice),
                volume24h: `$${(parseFloat(item.quoteVolume) / 1e6).toFixed(1)}M`,
                type: 'crypto'
              };
              if (existingIdx !== -1) {
                updatedTickers[existingIdx] = tickerObj;
              } else {
                updatedTickers.push(tickerObj);
              }
            });
          }
        }
      } catch (cryptoErr) {
        console.warn('Binance feed unreachable, trying CoinCap fallback', cryptoErr);
        try {
          const coinCapRes = await fetch('https://api.coincap.io/v2/assets?limit=6', { signal: AbortSignal.timeout(4000) });
          if (coinCapRes.ok) {
            const coinCapJson = await coinCapRes.json();
            if (coinCapJson.data && Array.isArray(coinCapJson.data)) {
              coinCapJson.data.forEach((c: { symbol: string; name: string; priceUsd: string; changePercent24Hr: string }) => {
                const existingIdx = updatedTickers.findIndex(t => t.symbol === c.symbol);
                const tickerObj: MarketTicker = {
                  symbol: c.symbol,
                  name: c.name,
                  price: parseFloat(c.priceUsd),
                  change24h: parseFloat(c.changePercent24Hr || '0'),
                  type: 'crypto'
                };
                if (existingIdx !== -1) {
                  updatedTickers[existingIdx] = tickerObj;
                } else {
                  updatedTickers.push(tickerObj);
                }
              });
            }
          }
        } catch {
          // Fallback retained
        }
      }

      // 2. Fetch Forex Currency Rates via open ECB data (Frankfurter)
      try {
        const forexRes = await fetch('https://api.frankfurter.app/latest?from=USD', { signal: AbortSignal.timeout(4000) });
        if (forexRes.ok) {
          const forexJson = await forexRes.json();
          if (forexJson && forexJson.rates) {
            const rates = forexJson.rates;
            if (rates.EUR) {
              const eurPrice = parseFloat((1 / rates.EUR).toFixed(4));
              const idx = updatedTickers.findIndex(t => t.symbol === 'EUR');
              if (idx !== -1) updatedTickers[idx] = { ...updatedTickers[idx], price: eurPrice };
            }
            if (rates.GBP) {
              const gbpPrice = parseFloat((1 / rates.GBP).toFixed(4));
              const idx = updatedTickers.findIndex(t => t.symbol === 'GBP');
              if (idx !== -1) updatedTickers[idx] = { ...updatedTickers[idx], price: gbpPrice };
            }
            if (rates.JPY) {
              const jpyPrice = parseFloat(rates.JPY.toFixed(2));
              const idx = updatedTickers.findIndex(t => t.symbol === 'JPY');
              if (idx !== -1) updatedTickers[idx] = { ...updatedTickers[idx], price: jpyPrice };
            }
          }
        }
      } catch (forexErr) {
        console.warn('Forex rate feed unreachable, using fallback cache', forexErr);
      }

      setMarketTickers(updatedTickers);
      setLastFeedUpdate(new Date());
    } finally {
      setIsRefreshingMarket(false);
    }
  }, []);

  // Auto-fetch on mount & periodically every 30 seconds
  useEffect(() => {
    fetchMarketFeeds();
    const interval = setInterval(fetchMarketFeeds, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketFeeds]);

  // ── Data Persistence ─────────────────────────────────────────────
  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        const local = localStorage.getItem('capitalflow_guest');
        if (local) {
          try {
            setData(JSON.parse(local));
          } catch {
            setData(DEFAULT_DATA);
          }
        }
        return;
      }

      try {
        const docRef = doc(db, 'capitalflow', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setData(docSnap.data() as CapitalFlowData);
        } else {
          setData(DEFAULT_DATA);
        }
      } catch (error) {
        console.error('Firebase read error for CapitalFlow', error);
        const local = localStorage.getItem(`capitalflow_${user.uid}`);
        if (local) setData(JSON.parse(local));
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [user, authLoading]);

  const saveData = useCallback(async (newData: CapitalFlowData) => {
    setData(newData);
    if (!user) {
      localStorage.setItem('capitalflow_guest', JSON.stringify(newData));
    } else {
      localStorage.setItem(`capitalflow_${user.uid}`, JSON.stringify(newData));
      try {
        await setDoc(doc(db, 'capitalflow', user.uid), newData);
      } catch (error) {
        console.error('Firebase write error for CapitalFlow', error);
      }
    }
  }, [user]);

  const handleSyncToDrive = async () => {
    await saveToDrive(
      'endeavor_capitalflow_vault.json',
      JSON.stringify({ ...data, exportedAt: new Date().toISOString() }, null, 2),
      { convertToGoogleDoc: false, mimeType: 'application/json' }
    );
  };

  // ── Asset Valuation & Calculations ──────────────────────────────
  const getAssetCurrentPrice = useCallback((holding: AssetHolding): number => {
    if (holding.symbol === 'USD') return 1;
    const ticker = marketTickers.find(t => t.symbol.toUpperCase() === holding.symbol.toUpperCase());
    if (ticker) return ticker.price;
    return holding.customPrice || holding.purchasePrice || 1;
  }, [marketTickers]);

  const portfolioStats = useMemo(() => {
    let totalNetWorth = 0;
    let totalCostBasis = 0;
    const typeDistribution: Record<AssetType, number> = { crypto: 0, cash: 0, stock: 0, commodity: 0, other: 0 };

    data.holdings.forEach(h => {
      const currentPrice = getAssetCurrentPrice(h);
      const val = h.quantity * currentPrice;
      const cost = h.quantity * h.purchasePrice;
      totalNetWorth += val;
      totalCostBasis += cost;
      typeDistribution[h.type] = (typeDistribution[h.type] || 0) + val;
    });

    const totalPL = totalNetWorth - totalCostBasis;
    const plPercent = totalCostBasis > 0 ? (totalPL / totalCostBasis) * 100 : 0;

    return {
      totalNetWorth,
      totalCostBasis,
      totalPL,
      plPercent,
      typeDistribution
    };
  }, [data.holdings, getAssetCurrentPrice]);

  const cashflowStats = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;

    data.streams.forEach(s => {
      if (s.type === 'income') totalIncome += s.amount;
      else totalExpenses += s.amount;
    });

    const netMonthlyDelta = totalIncome - totalExpenses;
    const monthlyBurn = totalExpenses;
    
    // Liquid cash holdings for runway
    const liquidCash = data.holdings
      .filter(h => h.type === 'cash' || h.symbol === 'USD')
      .reduce((sum, h) => sum + (h.quantity * getAssetCurrentPrice(h)), 0);

    const runwayMonths = netMonthlyDelta < 0 && monthlyBurn > 0
      ? (portfolioStats.totalNetWorth / Math.abs(netMonthlyDelta)).toFixed(1)
      : 'SUSTAINABLE';

    return {
      totalIncome,
      totalExpenses,
      netMonthlyDelta,
      monthlyBurn,
      liquidCash,
      runwayMonths
    };
  }, [data.streams, data.holdings, portfolioStats.totalNetWorth, getAssetCurrentPrice]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAssetSymbol.trim() || !newAssetQty || isNaN(Number(newAssetQty))) return;

    const qty = Math.max(0, parseFloat(newAssetQty));
    const price = newAssetPrice ? Math.max(0, parseFloat(newAssetPrice)) : (marketTickers.find(t => t.symbol.toUpperCase() === newAssetSymbol.trim().toUpperCase())?.price || 1);

    const newHolding: AssetHolding = {
      id: `asset_${Date.now()}`,
      symbol: newAssetSymbol.trim().toUpperCase(),
      name: newAssetName.trim() || newAssetSymbol.trim().toUpperCase(),
      type: newAssetType,
      quantity: qty,
      purchasePrice: price,
      updatedAt: Date.now()
    };

    saveData({
      ...data,
      holdings: [...data.holdings, newHolding]
    });

    setNewAssetSymbol('');
    setNewAssetName('');
    setNewAssetQty('');
    setNewAssetPrice('');
    setIsAddAssetOpen(false);
  };

  const handleDeleteAsset = (id: string) => {
    saveData({
      ...data,
      holdings: data.holdings.filter(h => h.id !== id)
    });
  };

  const handleAddStream = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStreamTitle.trim() || !newStreamAmount || isNaN(Number(newStreamAmount))) return;

    const newStream: CashflowStream = {
      id: `stream_${Date.now()}`,
      title: newStreamTitle.trim(),
      amount: Math.max(0, parseFloat(newStreamAmount)),
      type: newStreamType,
      category: newStreamCategory.trim() || 'General'
    };

    saveData({
      ...data,
      streams: [...data.streams, newStream]
    });

    setNewStreamTitle('');
    setNewStreamAmount('');
    setIsAddStreamOpen(false);
  };

  const handleDeleteStream = (id: string) => {
    saveData({
      ...data,
      streams: data.streams.filter(s => s.id !== id)
    });
  };

  // Filtered market tickers for search
  const filteredTickers = useMemo(() => {
    if (!marketSearchQuery.trim()) return marketTickers;
    const q = marketSearchQuery.toLowerCase();
    return marketTickers.filter(t => t.symbol.toLowerCase().includes(q) || t.name.toLowerCase().includes(q));
  }, [marketTickers, marketSearchQuery]);

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme">
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">CAPITAL</div>

        <div className="mc-app-container">
          {!user && (
            <GuestStorageNotice
              storageKey="guest_notice_capitalflow"
              title="OFFLINE_VAULT_ACTIVE"
              message="Operating in guest mode. Asset positions & cashflow telemetry are stored locally."
            />
          )}

          <div className="mc-app-card" style={{ '--app-color': '#FFB800' } as React.CSSProperties}>
            <header className="mc-app-header">
              <div className="mc-header-top">
                <div className="mc-user-badge">
                  <img
                    src={user?.photoURL || guestUserIcon}
                    alt="P"
                    className="mc-mini-avatar"
                    referrerPolicy="no-referrer"
                  />
                  <div className="mc-user-info">
                    <span className="mc-username">{user?.displayName?.split(' ')[0] || 'GUEST_OPERATOR'}</span>
                    <span className="mc-status-indicator" style={{ background: '#FFB800', boxShadow: '0 0 8px #FFB800' }}></span>
                  </div>
                </div>

                <div className="mc-header-actions">
                  {user ? (
                    <div className="mc-pill-group">
                      <button
                        className="mc-status-btn"
                        onClick={handleSyncToDrive}
                        disabled={isSyncing}
                      >
                        {isSyncing ? 'SYNCING...' : 'SYNC_VAULT'}
                      </button>
                      <button className="mc-action-icon" onClick={() => logout()}>🚪</button>
                    </div>
                  ) : (
                    <button className="mc-cta-btn" onClick={() => login()}>AUTHENTICATE</button>
                  )}
                </div>
              </div>

              <div className="mc-app-title-group">
                <span className="mc-app-kicker">FINANCIAL TELEMETRY // GLOBAL LIQUIDITY</span>
                <h1 className="mc-app-main-title">CAPITAL FLOW</h1>
              </div>
            </header>

            {/* Live Ticker Stream */}
            <div className="cf-ticker-bar">
              <div className="cf-ticker-label">
                <span className="cf-ticker-pulse"></span>
                <span>LIVE_FEED:</span>
              </div>
              <div className="cf-ticker-items">
                {marketTickers.slice(0, 6).map(t => (
                  <div key={t.symbol} className="cf-ticker-item">
                    <span className="cf-ticker-symbol">{t.symbol}</span>
                    <span className="cf-ticker-price">${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    <span className={`cf-ticker-change ${t.change24h >= 0 ? 'up' : 'down'}`}>
                      {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Primary Telemetry Grid */}
            <div className="cf-telemetry-grid">
              <div className="cf-telemetry-card">
                <div className="cf-telemetry-kicker">TOTAL_NET_WORTH</div>
                <div className="cf-telemetry-val highlight">
                  ${portfolioStats.totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="cf-telemetry-sub">
                  <span>COST: ${portfolioStats.totalCostBasis.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              <div className="cf-telemetry-card">
                <div className="cf-telemetry-kicker">UNREALIZED_P&L</div>
                <div className={`cf-telemetry-val ${portfolioStats.totalPL >= 0 ? 'positive' : 'negative'}`}>
                  {portfolioStats.totalPL >= 0 ? '+' : '-'}${Math.abs(portfolioStats.totalPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="cf-telemetry-sub">
                  <span className={portfolioStats.plPercent >= 0 ? 'cf-ticker-change up' : 'cf-ticker-change down'}>
                    {portfolioStats.plPercent >= 0 ? '▲' : '▼'} {Math.abs(portfolioStats.plPercent).toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="cf-telemetry-card">
                <div className="cf-telemetry-kicker">MONTHLY_CASH_DELTA</div>
                <div className={`cf-telemetry-val ${cashflowStats.netMonthlyDelta >= 0 ? 'positive' : 'negative'}`}>
                  {cashflowStats.netMonthlyDelta >= 0 ? '+' : '-'}${Math.abs(cashflowStats.netMonthlyDelta).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                </div>
                <div className="cf-telemetry-sub">
                  <span>IN: ${cashflowStats.totalIncome.toLocaleString()} | OUT: ${cashflowStats.totalExpenses.toLocaleString()}</span>
                </div>
              </div>

              <div className="cf-telemetry-card">
                <div className="cf-telemetry-kicker">CAPITAL_RUNWAY</div>
                <div className="cf-telemetry-val">
                  {cashflowStats.runwayMonths === 'SUSTAINABLE' ? '∞' : `${cashflowStats.runwayMonths} MO`}
                </div>
                <div className="cf-telemetry-sub">
                  <span>{cashflowStats.runwayMonths === 'SUSTAINABLE' ? 'POSITIVE CASHFLOW' : 'ESTIMATED DEPLETION'}</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="cf-nav-tabs">
              <button
                className={`cf-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                [01] OVERVIEW
              </button>
              <button
                className={`cf-tab-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
                onClick={() => setActiveTab('portfolio')}
              >
                [02] ASSETS_PORTFOLIO ({data.holdings.length})
              </button>
              <button
                className={`cf-tab-btn ${activeTab === 'cashflow' ? 'active' : ''}`}
                onClick={() => setActiveTab('cashflow')}
              >
                [03] CASHFLOW_STREAMS ({data.streams.length})
              </button>
              <button
                className={`cf-tab-btn ${activeTab === 'markets' ? 'active' : ''}`}
                onClick={() => setActiveTab('markets')}
              >
                [04] LIVE_MARKET_FEED
              </button>
            </div>

            {/* TAB: OVERVIEW */}
            {activeTab === 'overview' && (
              <>
                {/* Asset Allocation Bar */}
                <div className="cf-allocation-container">
                  <div className="cf-allocation-header">
                    <span className="cf-allocation-title">GLOBAL_ASSET_ALLOCATION</span>
                    <span className="cf-allocation-title">{data.holdings.length} POSITIONS DETECTED</span>
                  </div>
                  <div className="cf-allocation-bar">
                    {portfolioStats.totalNetWorth > 0 && (Object.keys(portfolioStats.typeDistribution) as AssetType[]).map(type => {
                      const val = portfolioStats.typeDistribution[type] || 0;
                      const percent = (val / portfolioStats.totalNetWorth) * 100;
                      if (percent <= 0) return null;
                      return (
                        <div
                          key={type}
                          className="cf-allocation-segment"
                          style={{
                            width: `${percent}%`,
                            background: ASSET_COLORS[type]
                          }}
                          title={`${type.toUpperCase()}: ${percent.toFixed(1)}% ($${val.toLocaleString()})`}
                        />
                      );
                    })}
                  </div>
                  <div className="cf-allocation-legend">
                    {(Object.keys(portfolioStats.typeDistribution) as AssetType[]).map(type => {
                      const val = portfolioStats.typeDistribution[type] || 0;
                      const percent = portfolioStats.totalNetWorth > 0 ? (val / portfolioStats.totalNetWorth) * 100 : 0;
                      return (
                        <div key={type} className="cf-legend-item">
                          <div className="cf-legend-color" style={{ background: ASSET_COLORS[type] }}></div>
                          <span>{type.toUpperCase()} ({percent.toFixed(1)}% / ${val.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Top Positions Snippet */}
                <div className="cf-section-header">
                  <span className="cf-section-title">TOP_HOLDINGS_VALUATION</span>
                  <button className="cf-action-btn" onClick={() => setIsAddAssetOpen(true)}>+ ADD_POSITION</button>
                </div>
                <div className="cf-table-container">
                  <table className="cf-table">
                    <thead>
                      <tr>
                        <th>ASSET</th>
                        <th>HOLDINGS</th>
                        <th>MARKET_PRICE</th>
                        <th>TOTAL_VALUE</th>
                        <th>RETURN (P&L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.holdings.slice(0, 5).map(h => {
                        const currentPrice = getAssetCurrentPrice(h);
                        const totalVal = h.quantity * currentPrice;
                        const cost = h.quantity * h.purchasePrice;
                        const pl = totalVal - cost;
                        const plPct = cost > 0 ? (pl / cost) * 100 : 0;

                        return (
                          <tr key={h.id}>
                            <td>
                              <div className="cf-asset-cell">
                                <span className="cf-asset-icon">{ASSET_ICONS[h.type]}</span>
                                <div className="cf-asset-details">
                                  <span className="cf-asset-name">{h.name}</span>
                                  <span className="cf-asset-type">{h.symbol} // {h.type.toUpperCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td><span className="cf-num-bold">{h.quantity}</span> {h.symbol}</td>
                            <td>${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td><span className="cf-num-bold">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                            <td>
                              <span className={pl >= 0 ? 'cf-ticker-change up' : 'cf-ticker-change down'}>
                                {pl >= 0 ? '+' : ''}${pl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({plPct.toFixed(1)}%)
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB: PORTFOLIO */}
            {activeTab === 'portfolio' && (
              <>
                <div className="cf-section-header">
                  <span className="cf-section-title">DETAILED_ASSET_REGISTER</span>
                  <div className="cf-btn-group">
                    <button className="cf-action-btn" onClick={() => fetchMarketFeeds()} disabled={isRefreshingMarket}>
                      {isRefreshingMarket ? 'UPDATING...' : 'REFRESH_PRICES'}
                    </button>
                    <button className="cf-action-btn" onClick={() => setIsAddAssetOpen(true)}>+ ADD_NEW_ASSET</button>
                  </div>
                </div>

                <div className="cf-table-container">
                  <table className="cf-table">
                    <thead>
                      <tr>
                        <th>ASSET / TYPE</th>
                        <th>QUANTITY</th>
                        <th>BUY_PRICE</th>
                        <th>CURRENT_PRICE</th>
                        <th>TOTAL_VALUE</th>
                        <th>PROFIT / LOSS</th>
                        <th>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.holdings.map(h => {
                        const currentPrice = getAssetCurrentPrice(h);
                        const totalVal = h.quantity * currentPrice;
                        const cost = h.quantity * h.purchasePrice;
                        const pl = totalVal - cost;
                        const plPct = cost > 0 ? (pl / cost) * 100 : 0;

                        return (
                          <tr key={h.id}>
                            <td>
                              <div className="cf-asset-cell">
                                <span className="cf-asset-icon">{ASSET_ICONS[h.type]}</span>
                                <div className="cf-asset-details">
                                  <span className="cf-asset-name">{h.name}</span>
                                  <span className="cf-asset-type">{h.symbol} // {h.type.toUpperCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td><span className="cf-num-bold">{h.quantity}</span> {h.symbol}</td>
                            <td>${h.purchasePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td>${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                            <td><span className="cf-num-bold">${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
                            <td>
                              <span className={pl >= 0 ? 'cf-ticker-change up' : 'cf-ticker-change down'}>
                                {pl >= 0 ? '+' : ''}${pl.toLocaleString(undefined, { maximumFractionDigits: 2 })} ({plPct.toFixed(1)}%)
                              </span>
                            </td>
                            <td>
                              <button className="cf-delete-btn" onClick={() => handleDeleteAsset(h.id)} title="Delete Asset">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* TAB: CASHFLOW */}
            {activeTab === 'cashflow' && (
              <>
                <div className="cf-section-header">
                  <span className="cf-section-title">RECURRING_CASHFLOW_MATRIX</span>
                  <button className="cf-action-btn" onClick={() => setIsAddStreamOpen(true)}>+ ADD_STREAM</button>
                </div>

                <div className="cf-cashflow-split">
                  <div>
                    <h3 className="cf-allocation-title" style={{ color: '#00FF41', marginBottom: '0.8rem' }}>
                      INFLOW_CHANNELS (${cashflowStats.totalIncome.toLocaleString()}/mo)
                    </h3>
                    <div className="cf-stream-list">
                      {data.streams.filter(s => s.type === 'income').map(s => (
                        <div key={s.id} className="cf-stream-item income">
                          <div className="cf-stream-info">
                            <span className="cf-stream-title">{s.title}</span>
                            <span className="cf-stream-cat">{s.category}</span>
                          </div>
                          <div className="cf-stream-right">
                            <span className="cf-stream-amount income">+${s.amount.toLocaleString()}/mo</span>
                            <button className="cf-delete-btn" onClick={() => handleDeleteStream(s.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="cf-allocation-title" style={{ color: '#FF003C', marginBottom: '0.8rem' }}>
                      OUTFLOW_BURN (${cashflowStats.totalExpenses.toLocaleString()}/mo)
                    </h3>
                    <div className="cf-stream-list">
                      {data.streams.filter(s => s.type === 'expense').map(s => (
                        <div key={s.id} className="cf-stream-item expense">
                          <div className="cf-stream-info">
                            <span className="cf-stream-title">{s.title}</span>
                            <span className="cf-stream-cat">{s.category}</span>
                          </div>
                          <div className="cf-stream-right">
                            <span className="cf-stream-amount expense">-${s.amount.toLocaleString()}/mo</span>
                            <button className="cf-delete-btn" onClick={() => handleDeleteStream(s.id)}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* TAB: MARKETS */}
            {activeTab === 'markets' && (
              <>
                <div className="cf-section-header">
                  <span className="cf-section-title">
                    GLOBAL_FEEDS_TELEMETRY (LAST SYNC: {lastFeedUpdate.toLocaleTimeString()})
                  </span>
                  <div className="cf-btn-group">
                    <input
                      type="text"
                      className="cf-modal-input"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', width: '180px' }}
                      placeholder="FILTER TICKER..."
                      value={marketSearchQuery}
                      onChange={e => setMarketSearchQuery(e.target.value)}
                    />
                    <button className="cf-action-btn" onClick={() => fetchMarketFeeds()} disabled={isRefreshingMarket}>
                      {isRefreshingMarket ? 'SYNCING...' : 'FORCE_SYNC'}
                    </button>
                  </div>
                </div>

                <div className="cf-market-grid">
                  {filteredTickers.map(t => (
                    <div key={t.symbol} className="cf-market-card">
                      <div className="cf-market-card-top">
                        <div>
                          <div className="cf-market-symbol">{t.symbol}</div>
                          <div className="cf-market-name">{t.name}</div>
                        </div>
                        <span className={`cf-ticker-change ${t.change24h >= 0 ? 'up' : 'down'}`}>
                          {t.change24h >= 0 ? '+' : ''}{t.change24h.toFixed(2)}%
                        </span>
                      </div>
                      <div className="cf-market-price">
                        ${t.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </div>
                      <div className="cf-market-meta">
                        <span>TYPE: {t.type.toUpperCase()}</span>
                        {t.high24h && <span>HIGH: ${t.high24h.toLocaleString()}</span>}
                        {t.low24h && <span>LOW: ${t.low24h.toLocaleString()}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>
        </div>
        <LegalFooter />
      </div>

      {/* Add Asset Modal */}
      {isAddAssetOpen && (
        <div className="cf-modal-overlay">
          <div className="cf-modal-box">
            <div className="cf-modal-header">
              <h2 className="cf-modal-title">REGISTER_NEW_ASSET</h2>
              <button className="cf-modal-close" onClick={() => setIsAddAssetOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddAsset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="cf-modal-field">
                <label className="cf-modal-label">ASSET_SYMBOL (e.g. BTC, ETH, USD, AAPL)</label>
                <input
                  type="text"
                  className="cf-modal-input"
                  placeholder="BTC"
                  value={newAssetSymbol}
                  onChange={e => setNewAssetSymbol(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">ASSET_NAME</label>
                <input
                  type="text"
                  className="cf-modal-input"
                  placeholder="Bitcoin Vault"
                  value={newAssetName}
                  onChange={e => setNewAssetName(e.target.value)}
                />
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">ASSET_CLASSIFICATION</label>
                <select
                  className="cf-modal-select"
                  value={newAssetType}
                  onChange={e => setNewAssetType(e.target.value as AssetType)}
                >
                  <option value="crypto">CRYPTO ASSET</option>
                  <option value="cash">CASH & FIAT RESERVE</option>
                  <option value="stock">PUBLIC EQUITY / STOCK</option>
                  <option value="commodity">PRECIOUS METAL / COMMODITY</option>
                  <option value="other">ALTERNATIVE ASSET</option>
                </select>
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">HOLDINGS_QUANTITY</label>
                <input
                  type="number"
                  step="any"
                  className="cf-modal-input"
                  placeholder="0.5"
                  value={newAssetQty}
                  onChange={e => setNewAssetQty(e.target.value)}
                  required
                />
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">PURCHASE_PRICE_USD (Cost Basis)</label>
                <input
                  type="number"
                  step="any"
                  className="cf-modal-input"
                  placeholder="65000"
                  value={newAssetPrice}
                  onChange={e => setNewAssetPrice(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="cf-modal-submit"
                disabled={!newAssetSymbol.trim() || !newAssetQty}
              >
                RECORD_POSITION
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Stream Modal */}
      {isAddStreamOpen && (
        <div className="cf-modal-overlay">
          <div className="cf-modal-box">
            <div className="cf-modal-header">
              <h2 className="cf-modal-title">REGISTER_CASHFLOW_STREAM</h2>
              <button className="cf-modal-close" onClick={() => setIsAddStreamOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddStream} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="cf-modal-field">
                <label className="cf-modal-label">STREAM_IDENTIFIER</label>
                <input
                  type="text"
                  className="cf-modal-input"
                  placeholder="SaaS Revenue or Cloud Infrastructure"
                  value={newStreamTitle}
                  onChange={e => setNewStreamTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">STREAM_FLOW_TYPE</label>
                <select
                  className="cf-modal-select"
                  value={newStreamType}
                  onChange={e => setNewStreamType(e.target.value as 'income' | 'expense')}
                >
                  <option value="income">INFLOW (INCOME / REVENUE)</option>
                  <option value="expense">OUTFLOW (EXPENSE / BURN)</option>
                </select>
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">MONTHLY_AMOUNT_USD</label>
                <input
                  type="number"
                  step="any"
                  className="cf-modal-input"
                  placeholder="1500"
                  value={newStreamAmount}
                  onChange={e => setNewStreamAmount(e.target.value)}
                  required
                />
              </div>

              <div className="cf-modal-field">
                <label className="cf-modal-label">CATEGORY_TAG</label>
                <input
                  type="text"
                  className="cf-modal-input"
                  placeholder="Operational / Living / Growth"
                  value={newStreamCategory}
                  onChange={e => setNewStreamCategory(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="cf-modal-submit"
                disabled={!newStreamTitle.trim() || !newStreamAmount}
              >
                RECORD_STREAM
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default CapitalFlow;
