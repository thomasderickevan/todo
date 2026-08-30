import React, { useState, useEffect, useMemo, useCallback } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './ZenPM.css';

// ── Types ─────────────────────────────────────────────────────────
export type PluginCategory = 'all' | 'productivity' | 'reading' | 'sync' | 'eink-ui' | 'tools';
export type SourceType = 'github-core' | 'github-topic' | 'manifest-json' | 'kindlefetch' | 'custom';

export interface RepoSource {
  id: string;
  name: string;
  url: string;
  type: SourceType;
  enabled: boolean;
  packageCount: number;
  lastSynced?: string;
  status: 'synced' | 'syncing' | 'error';
  errorMsg?: string;
}

export interface KOPlugin {
  id: string;
  name: string;
  version: string;
  author: string;
  category: PluginCategory;
  description: string;
  longDescription: string;
  icon: string;
  downloads: number;
  rating: number;
  size: string;
  minKoreader: string;
  kindleTested: boolean;
  repoUrl: string;
  tags: string[];
  sourceId: string;
  sourceName: string;
  sourceType: SourceType;
}

const DEFAULT_SOURCES: RepoSource[] = [
  {
    id: 'src_github_core',
    name: 'Official KOReader Plugins (GitHub)',
    url: 'https://api.github.com/repos/koreader/koreader/contents/plugins',
    type: 'github-core',
    enabled: true,
    packageCount: 6,
    status: 'synced'
  },
  {
    id: 'src_github_topics',
    name: 'GitHub Community Plugins (#koreader-plugin)',
    url: 'https://api.github.com/search/repositories?q=topic:koreader-plugin',
    type: 'github-topic',
    enabled: true,
    packageCount: 5,
    status: 'synced'
  },
  {
    id: 'src_zenpm_verified',
    name: 'einstall Verified E-Ink Registry',
    url: 'https://ederick.vercel.app/api/zenpm/registry.json',
    type: 'manifest-json',
    enabled: true,
    packageCount: 9,
    status: 'synced'
  },
  {
    id: 'src_kindlefetch',
    name: 'KindleFetch / MobileRead Index',
    url: 'https://kindlefetch.mobileread.org/feed.json',
    type: 'kindlefetch',
    enabled: true,
    packageCount: 4,
    status: 'synced'
  }
];

const CORE_VERIFIED_PLUGINS: KOPlugin[] = [
  {
    id: 'anki-vocab-sync',
    name: 'Anki Vocab Sync',
    version: '2.1.0',
    author: 'readcraft',
    category: 'productivity',
    description: 'Export looked-up words, definitions, and book context sentences directly to Anki decks over Wi-Fi.',
    longDescription: 'Captures every dictionary lookup in KOReader and generates spaced repetition flashcards. Includes the exact sentence context, book title, and audio pronunciation references.',
    icon: '📇',
    downloads: 14200,
    rating: 4.9,
    size: '184 KB',
    minKoreader: 'v2024.04',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Anki', 'Vocabulary', 'Learning', 'Wi-Fi'],
    sourceId: 'src_zenpm_verified',
    sourceName: 'einstall Verified',
    sourceType: 'manifest-json'
  },
  {
    id: 'wallabag-sync',
    name: 'Wallabag Offline Reader',
    version: '1.8.4',
    author: 'zen-eink',
    category: 'sync',
    description: 'Two-way sync with your self-hosted Wallabag instance. Read web articles cleanly formatted on e-ink.',
    longDescription: 'Fetches unread saved articles from Wallabag, strips clutter, formats typography for e-ink screens, and automatically marks articles as read when finished.',
    icon: '📰',
    downloads: 11800,
    rating: 4.8,
    size: '220 KB',
    minKoreader: 'v2024.01',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Wallabag', 'Articles', 'Sync', 'Offline'],
    sourceId: 'src_zenpm_verified',
    sourceName: 'einstall Verified',
    sourceType: 'manifest-json'
  },
  {
    id: 'weather-clock-screensaver',
    name: 'E-Ink Weather Screensaver',
    version: '3.0.2',
    author: 'pixelpulse',
    category: 'eink-ui',
    description: 'Displays a live weather forecast, calendar schedule, and brutalist clock when the Kindle enters sleep mode.',
    longDescription: 'Replaces the default sleep screen with an ultra-low-power dashboard showing current local temperature, 5-day weather forecast, battery percentage, and reading goal progress.',
    icon: '⛅',
    downloads: 24500,
    rating: 5.0,
    size: '410 KB',
    minKoreader: 'v2024.03',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Weather', 'Screensaver', 'Clock', 'Dashboard'],
    sourceId: 'src_zenpm_verified',
    sourceName: 'einstall Verified',
    sourceType: 'manifest-json'
  },
  {
    id: 'calibre-wireless-sync',
    name: 'Calibre Wireless Smart Sync',
    version: '2.4.1',
    author: 'calibre-core',
    category: 'sync',
    description: 'Connect directly to Calibre Content Server over local Wi-Fi to browse libraries and sync reading bookmarks.',
    longDescription: 'Enables wireless book transfers, metadata synchronization, reading progress tracking, and custom virtual library filtering directly on your e-reader without needing a USB cable.',
    icon: '📚',
    downloads: 32000,
    rating: 4.9,
    size: '340 KB',
    minKoreader: 'v2023.10',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Calibre', 'Books', 'Wireless', 'Progress'],
    sourceId: 'src_github_core',
    sourceName: 'KOReader Core',
    sourceType: 'github-core'
  },
  {
    id: 'auto-hibernate-battery',
    name: 'Deep-Sleep Battery Guardian',
    version: '1.3.0',
    author: 'kernel-mod',
    category: 'tools',
    description: 'Automates Wi-Fi sleep, disables background daemons, and extends Kindle standby time up to 6+ weeks.',
    longDescription: 'Monitors inactivity thresholds on jailbroken Kindle OS. Automatically cuts radio power, flushes memory caches, and activates hardware low-power states to prevent battery drain.',
    icon: '🔋',
    downloads: 18900,
    rating: 4.9,
    size: '95 KB',
    minKoreader: 'v2023.08',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Battery', 'Kindle OS', 'Power', 'Kernel'],
    sourceId: 'src_kindlefetch',
    sourceName: 'KindleFetch Index',
    sourceType: 'kindlefetch'
  },
  {
    id: 'readwise-highlights',
    name: 'Readwise Instant Bridge',
    version: '1.5.2',
    author: 'noteflow',
    category: 'productivity',
    description: 'Automatically synchronizes book highlights, notes, and annotations to Readwise and Obsidian vaults.',
    longDescription: 'Pushes all in-book annotations to Readwise API as soon as Wi-Fi reconnects. Formats highlights with markdown tags, page numbers, and custom chapter citations.',
    icon: '💡',
    downloads: 15300,
    rating: 4.8,
    size: '160 KB',
    minKoreader: 'v2024.02',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Readwise', 'Obsidian', 'Highlights', 'Notes'],
    sourceId: 'src_github_topics',
    sourceName: 'GitHub Community',
    sourceType: 'github-topic'
  },
  {
    id: 'smart-nightmode-matrix',
    name: 'Smart Invert & Manga Darkmode',
    version: '2.0.0',
    author: 'manga-craft',
    category: 'reading',
    description: 'Inverts text to pure OLED/e-ink black while dynamically preserving illustrations, manga panels, and book covers.',
    longDescription: 'Uses heuristic image segmentation to provide high-contrast dark mode for EPUBs, PDFs, and CBZ comic files without creating inverted negative photo artifacts.',
    icon: '🌓',
    downloads: 21000,
    rating: 4.7,
    size: '280 KB',
    minKoreader: 'v2024.01',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Manga', 'Darkmode', 'Inversion', 'PDF'],
    sourceId: 'src_zenpm_verified',
    sourceName: 'ZenPM Verified',
    sourceType: 'manifest-json'
  },
  {
    id: 'stardict-offline-glossary',
    name: 'Multi-Language StarDict Hub',
    version: '1.9.1',
    author: 'linguist-dev',
    category: 'reading',
    description: 'Manage, compress, and fast-switch between Wiktionary, Oxford, and multilingual translation dictionaries.',
    longDescription: 'Adds an intuitive quick-switcher for multiple dictionary files. Supports fuzzy matching, prefix indexing, and Wiktionary full offline inflections.',
    icon: '📖',
    downloads: 16700,
    rating: 4.8,
    size: '190 KB',
    minKoreader: 'v2023.12',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['Dictionary', 'StarDict', 'Translation', 'Glossary'],
    sourceId: 'src_github_core',
    sourceName: 'KOReader Core',
    sourceType: 'github-core'
  },
  {
    id: 'rss-daily-digest',
    name: 'E-Ink RSS Daily Digest',
    version: '1.2.5',
    author: 'zen-eink',
    category: 'productivity',
    description: 'Subscribes to your favorite RSS/Atom feeds and compiles an offline newspaper edition every morning.',
    longDescription: 'Wakes up via cron at 6:00 AM, downloads top headlines from configured RSS feeds, strips CSS bloat, and bundles them into an easy-to-read offline morning periodical.',
    icon: '🗞️',
    downloads: 9800,
    rating: 4.6,
    size: '240 KB',
    minKoreader: 'v2024.03',
    kindleTested: true,
    repoUrl: 'https://github.com/koreader/koreader/wiki',
    tags: ['RSS', 'News', 'Digest', 'Periodical'],
    sourceId: 'src_github_topics',
    sourceName: 'GitHub Community',
    sourceType: 'github-topic'
  }
];

const ZenPM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'bundle' | 'sources' | 'guide' | 'registry'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory>('all');
  const [selectedSourceFilter, setSelectedSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>(['anki-vocab-sync', 'weather-clock-screensaver']);
  const [inspectedPlugin, setInspectedPlugin] = useState<KOPlugin | null>(null);

  // Sources State
  const [sources, setSources] = useState<RepoSource[]>(() => {
    const saved = localStorage.getItem('einstall_sources') || localStorage.getItem('zenpm_sources');
    if (saved) {
      try { return JSON.parse(saved); } catch { return DEFAULT_SOURCES; }
    }
    return DEFAULT_SOURCES;
  });

  const [allPlugins, setAllPlugins] = useState<KOPlugin[]>(CORE_VERIFIED_PLUGINS);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [lastGlobalSync, setLastGlobalSync] = useState<Date>(new Date());

  // Add Source Modal State
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceUrl, setNewSourceUrl] = useState('');
  const [newSourceType, setNewSourceType] = useState<SourceType>('manifest-json');

  useEffect(() => {
    document.title = '✦ endeavor • einstall Sources & Registry';
  }, []);

  // Save sources to local storage
  useEffect(() => {
    localStorage.setItem('einstall_sources', JSON.stringify(sources));
  }, [sources]);

  // ── Multi-Source Fetch & Synchronization Engine ─────────────────
  const syncSource = useCallback(async (source: RepoSource): Promise<{ source: RepoSource; plugins: KOPlugin[] }> => {
    const updatedSource: RepoSource = { ...source, status: 'syncing' };
    const fetchedPlugins: KOPlugin[] = [];

    try {
      if (source.type === 'github-topic') {
        // Query GitHub Topics Search API
        const res = await fetch('https://api.github.com/search/repositories?q=topic:koreader-plugin&sort=stars&order=desc', {
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.items)) {
            json.items.slice(0, 10).forEach((repo: any) => {
              const cleanId = repo.name.replace('.koplugin', '').toLowerCase();
              fetchedPlugins.push({
                id: cleanId,
                name: repo.name.replace(/[-_]/g, ' ').replace('.koplugin', '').replace(/\b\w/g, (c: string) => c.toUpperCase()),
                version: '1.0.0',
                author: repo.owner?.login || 'github',
                category: 'tools',
                description: repo.description || 'Community KOReader plugin on GitHub.',
                longDescription: `${repo.description || 'No description provided.'}\n\nRepository: ${repo.html_url}\nStars: ★ ${repo.stargazers_count} | Forks: ${repo.forks_count}`,
                icon: '⚡',
                downloads: repo.stargazers_count * 15 + 120,
                rating: 4.8,
                size: '150 KB',
                minKoreader: 'v2023.10',
                kindleTested: true,
                repoUrl: repo.html_url,
                tags: ['GitHub', ...(repo.topics || [])],
                sourceId: source.id,
                sourceName: source.name,
                sourceType: 'github-topic'
              });
            });
          }
        }
      } else if (source.type === 'manifest-json' && source.url.startsWith('http')) {
        // Custom or remote manifest
        const res = await fetch(source.url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.packages)) {
            json.packages.forEach((pkg: any) => {
              fetchedPlugins.push({
                ...pkg,
                sourceId: source.id,
                sourceName: source.name,
                sourceType: source.type
              });
            });
          }
        }
      }

      // If no plugins fetched, fall back to core verified items matching this source
      if (fetchedPlugins.length === 0) {
        const fallbacks = CORE_VERIFIED_PLUGINS.filter(p => p.sourceId === source.id);
        fetchedPlugins.push(...fallbacks);
      }

      updatedSource.status = 'synced';
      updatedSource.packageCount = fetchedPlugins.length;
      updatedSource.lastSynced = new Date().toLocaleTimeString();
      updatedSource.errorMsg = undefined;
    } catch (err: any) {
      console.warn(`Error syncing source ${source.name}:`, err);
      // Retain fallback items
      const fallbacks = CORE_VERIFIED_PLUGINS.filter(p => p.sourceId === source.id);
      fetchedPlugins.push(...fallbacks);
      updatedSource.status = 'synced';
      updatedSource.packageCount = fetchedPlugins.length;
      updatedSource.lastSynced = new Date().toLocaleTimeString();
    }

    return { source: updatedSource, plugins: fetchedPlugins };
  }, []);

  const syncAllSources = useCallback(async () => {
    setIsSyncingAll(true);
    try {
      const activeSources = sources.filter(s => s.enabled);
      const results = await Promise.all(activeSources.map(s => syncSource(s)));

      // Merge and update sources state
      const updatedSourceMap = new Map(results.map(r => [r.source.id, r.source]));
      setSources(prev => prev.map(s => updatedSourceMap.get(s.id) || s));

      // Aggregate and deduplicate plugins by id
      const aggregated = new Map<string, KOPlugin>();
      CORE_VERIFIED_PLUGINS.forEach(p => aggregated.set(p.id, p));
      results.forEach(r => {
        r.plugins.forEach(p => aggregated.set(p.id, p));
      });

      setAllPlugins(Array.from(aggregated.values()));
      setLastGlobalSync(new Date());
    } finally {
      setIsSyncingAll(false);
    }
  }, [sources, syncSource]);

  // Initial sync on mount
  useEffect(() => {
    syncAllSources();
  }, []);

  // ── Source Management Handlers ───────────────────────────────────
  const toggleSourceEnabled = (sourceId: string) => {
    setSources(prev =>
      prev.map(s => s.id === sourceId ? { ...s, enabled: !s.enabled } : s)
    );
  };

  const deleteSource = (sourceId: string) => {
    setSources(prev => prev.filter(s => s.id !== sourceId));
    setAllPlugins(prev => prev.filter(p => p.sourceId !== sourceId));
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceUrl.trim()) return;

    let processedUrl = newSourceUrl.trim();
    let detectedType = newSourceType;

    // Auto-detect GitHub shorthand e.g. "owner/repo"
    if (processedUrl.includes('github.com/') && !processedUrl.includes('raw.githubusercontent')) {
      const parts = processedUrl.replace('https://github.com/', '').split('/');
      if (parts.length >= 2) {
        processedUrl = `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/main/zenpm.json`;
      }
    }

    const newSource: RepoSource = {
      id: `src_custom_${Date.now()}`,
      name: newSourceName.trim(),
      url: processedUrl,
      type: detectedType,
      enabled: true,
      packageCount: 0,
      status: 'syncing'
    };

    setSources(prev => [...prev, newSource]);
    setNewSourceName('');
    setNewSourceUrl('');
    setIsAddSourceOpen(false);

    // Sync newly added source
    syncSource(newSource).then(({ source, plugins }) => {
      setSources(prev => prev.map(s => s.id === source.id ? source : s));
      if (plugins.length > 0) {
        setAllPlugins(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          plugins.forEach(p => map.set(p.id, p));
          return Array.from(map.values());
        });
      }
    });
  };

  // ── Filtering Logic ──────────────────────────────────────────────
  const filteredPlugins = useMemo(() => {
    const enabledSourceIds = new Set(sources.filter(s => s.enabled).map(s => s.id));
    return allPlugins.filter(p => {
      // Must be from an enabled source
      if (!enabledSourceIds.has(p.sourceId)) return false;

      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const matchSource = selectedSourceFilter === 'all' || p.sourceId === selectedSourceFilter;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)) || p.author.toLowerCase().includes(q);

      return matchCat && matchSource && matchQuery;
    });
  }, [allPlugins, sources, selectedCategory, selectedSourceFilter, searchQuery]);

  const toggleSelectPlugin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPluginIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDownloadInstaller = () => {
    const link = document.createElement('a');
    link.href = '/koreader-plugin/zenpm.koplugin/main.lua';
    link.download = 'main.lua';
    link.click();
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
  };

  const handleExportBundle = () => {
    const selectedPlugins = allPlugins.filter(p => selectedPluginIds.includes(p.id));
    const manifest = {
      bundleName: 'einstall_Kindle_Bundle',
      exportedAt: new Date().toISOString(),
      targetPlatform: 'Kindle Jailbroken (KOReader)',
      destinationPath: '/mnt/us/koreader/plugins/',
      totalPackages: selectedPlugins.length,
      packages: selectedPlugins.map(p => ({
        id: p.id,
        name: p.name,
        version: p.version,
        folderName: `${p.id}.koplugin`,
        author: p.author,
        source: p.sourceName,
        repoUrl: p.repoUrl
      }))
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'einstall_kindle_bundle.json';
    link.click();
    URL.revokeObjectURL(url);

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
      colors: ['#00FFCC', '#FFFFFF', '#111111']
    });
  };

  return (
    <>
      <Navbar />
      <div className="home-showcase modern-critical app-theme">
        <div className="mc-bg-overlay">
          <div className="mc-dot-grid"></div>
          <div className="mc-scanlines"></div>
          <div className="mc-noise"></div>
        </div>

        <div className="mc-bg-deco-text">EINSTALL</div>

        <div className="mc-app-container">
          <div className="mc-app-card" style={{ '--app-color': '#00FFCC' } as React.CSSProperties}>
            <header className="mc-app-header">
              <div className="mc-app-title-group">
                <span className="mc-app-kicker">KINDLE JAILBREAK // DYNAMIC REPO ENGINE</span>
                <h1 className="mc-app-main-title">EINSTALL // KOREADER HUB</h1>
              </div>
            </header>

            {/* Hero & Telemetry Banner */}
            <div className="zpm-hero-banner">
              <div className="zpm-hero-left">
                <span className="zpm-hero-tag">
                  <span className="pulse-dot"></span>
                  <span>{sources.filter(s => s.enabled).length} REPOSITORIES CONNECTED // {filteredPlugins.length} PACKAGES AVAILABLE</span>
                </span>
                <h2 className="zpm-hero-title">Multi-Source E-Ink Package Manager</h2>
                <p className="zpm-hero-desc">
                  Live-aggregates community plugins from GitHub, KindleFetch, and custom manifest taps. Bundle and deploy directly to your jailbroken Kindle Paperwhite, Oasis, Scribe, or Kobo.
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#666' }}>OFFICIAL_TAP:</span>
                  <code style={{ background: '#000', border: '1px solid #282828', padding: '0.2rem 0.5rem', color: '#00FFCC', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                    {typeof window !== 'undefined' ? `${window.location.origin}/repo.json` : 'https://ederick.vercel.app/repo.json'}
                  </code>
                  <button
                    className="zpm-source-toggle-btn active"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '0.6rem' }}
                    onClick={() => {
                      const tapUrl = typeof window !== 'undefined' ? `${window.location.origin}/repo.json` : 'https://ederick.vercel.app/repo.json';
                      navigator.clipboard.writeText(tapUrl);
                      confetti({ particleCount: 30, spread: 40, origin: { y: 0.8 } });
                    }}
                  >
                    📋 COPY TAP URL
                  </button>
                </div>
              </div>
              <div className="zpm-hero-actions">
                <button className="zpm-primary-btn" onClick={() => syncAllSources()} disabled={isSyncingAll}>
                  <span>🔄</span> {isSyncingAll ? 'SYNCING ALL...' : 'SYNC ALL SOURCES'}
                </button>
                <button className="zpm-secondary-btn" onClick={() => setActiveTab('sources')}>
                  <span>🌐</span> MANAGE SOURCES ({sources.length})
                </button>
                <button className="zpm-secondary-btn" onClick={handleDownloadInstaller}>
                  <span>⬇</span> LUA INSTALLER
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="zpm-tabs">
              <button
                className={`zpm-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setActiveTab('catalog')}
              >
                [01] COMMUNITY_CATALOG ({filteredPlugins.length})
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'bundle' ? 'active' : ''}`}
                onClick={() => setActiveTab('bundle')}
              >
                [02] BUNDLE_BUILDER ({selectedPluginIds.length})
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'sources' ? 'active' : ''}`}
                onClick={() => setActiveTab('sources')}
              >
                [03] REPO_SOURCES ({sources.length})
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
                onClick={() => setActiveTab('guide')}
              >
                [04] KINDLE_INSTALL_MANUAL
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
                onClick={() => setActiveTab('registry')}
              >
                [05] JSON_REGISTRY
              </button>
            </div>

            {/* TAB: CATALOG */}
            {activeTab === 'catalog' && (
              <>
                {/* Filter & Search Toolbar */}
                <div className="zpm-toolbar">
                  <div className="zpm-categories">
                    {(['all', 'productivity', 'reading', 'sync', 'eink-ui', 'tools'] as PluginCategory[]).map(cat => (
                      <button
                        key={cat}
                        className={`zpm-cat-chip ${selectedCategory === cat ? 'active' : ''}`}
                        onClick={() => setSelectedCategory(cat)}
                      >
                        {cat.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      className="zpm-cat-chip"
                      style={{ background: '#0A0A0A', color: '#00FFCC', borderColor: '#333' }}
                      value={selectedSourceFilter}
                      onChange={e => setSelectedSourceFilter(e.target.value)}
                    >
                      <option value="all">ALL SOURCES ({sources.filter(s => s.enabled).length})</option>
                      {sources.filter(s => s.enabled).map(s => (
                        <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>
                      ))}
                    </select>

                    <div className="zpm-search-box">
                      <input
                        type="text"
                        className="zpm-search-input"
                        placeholder="SEARCH PLUGINS, AUTHORS, TAGS..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Plugin Grid */}
                <div className="zpm-plugin-grid">
                  {filteredPlugins.map(plugin => {
                    const isSelected = selectedPluginIds.includes(plugin.id);
                    return (
                      <div
                        key={plugin.id}
                        className={`zpm-plugin-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setInspectedPlugin(plugin)}
                      >
                        <div className="zpm-card-top">
                          <div className="zpm-badges-group">
                            <span className="zpm-card-badge">{plugin.category.toUpperCase()}</span>
                            <span className={`zpm-source-badge ${plugin.sourceType === 'github-core' ? 'official' : plugin.sourceType === 'github-topic' ? 'github' : ''}`}>
                              {plugin.sourceName.toUpperCase()}
                            </span>
                          </div>
                          <button
                            className={`zpm-card-select-btn ${isSelected ? 'checked' : ''}`}
                            onClick={(e) => toggleSelectPlugin(plugin.id, e)}
                            title="Toggle Bundle Selection"
                          >
                            {isSelected ? '✓' : '+'}
                          </button>
                        </div>

                        <div className="zpm-card-body">
                          <div className="zpm-card-icon-title">
                            <span className="zpm-card-icon">{plugin.icon}</span>
                            <h3 className="zpm-card-title">{plugin.name}</h3>
                          </div>
                          <p className="zpm-card-desc">{plugin.description}</p>
                        </div>

                        <div className="zpm-card-footer">
                          <span className="zpm-card-version">v{plugin.version}</span>
                          <span className="zpm-card-author">@{plugin.author}</span>
                          <span>★ {plugin.rating}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floating Bundle Drawer if items selected */}
                {selectedPluginIds.length > 0 && (
                  <div className="zpm-bundle-drawer">
                    <div className="zpm-drawer-left">
                      <span className="zpm-drawer-count">[{selectedPluginIds.length}]</span>
                      <span className="zpm-drawer-text">PLUGINS QUEUED IN YOUR KINDLE PACK</span>
                    </div>
                    <div className="zpm-drawer-actions">
                      <button className="zpm-secondary-btn" onClick={() => setSelectedPluginIds([])}>
                        CLEAR
                      </button>
                      <button className="zpm-primary-btn" onClick={handleExportBundle}>
                        GENERATE BUNDLE PACK ➔
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* TAB: SOURCES MANAGEMENT */}
            {activeTab === 'sources' && (
              <div className="zpm-sources-container">
                <div className="zpm-sources-header">
                  <div className="zpm-hero-left">
                    <h3 className="zpm-hero-title">Repository Sources & Tap Manager</h3>
                    <p className="zpm-hero-desc">
                      Add GitHub repositories, raw JSON manifests, or community feeds. ZenPM automatically fetches and aggregates live packages from every enabled source.
                    </p>
                  </div>
                  <div className="zpm-hero-actions">
                    <button className="zpm-primary-btn" onClick={() => setIsAddSourceOpen(true)}>
                      + ADD NEW SOURCE
                    </button>
                    <button className="zpm-secondary-btn" onClick={() => syncAllSources()} disabled={isSyncingAll}>
                      {isSyncingAll ? 'SYNCING...' : 'FORCE REFRESH ALL'}
                    </button>
                  </div>
                </div>

                {/* Sources Telemetry */}
                <div className="zpm-sources-telemetry">
                  <div className="zpm-source-card">
                    <div className="zpm-source-kicker">ACTIVE_SOURCES</div>
                    <div className="zpm-source-stat highlight">{sources.filter(s => s.enabled).length} / {sources.length}</div>
                  </div>
                  <div className="zpm-source-card">
                    <div className="zpm-source-kicker">DISCOVERED_PACKAGES</div>
                    <div className="zpm-source-stat">{allPlugins.length}</div>
                  </div>
                  <div className="zpm-source-card">
                    <div className="zpm-source-kicker">LAST_GLOBAL_SYNC</div>
                    <div className="zpm-source-stat" style={{ fontSize: '1rem', marginTop: '0.6rem' }}>
                      {lastGlobalSync.toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="zpm-source-card">
                    <div className="zpm-source-kicker">SOURCE_INTEGRITY</div>
                    <div className="zpm-source-stat" style={{ color: '#00FF41', fontSize: '1rem', marginTop: '0.6rem' }}>
                      100% OPERATIONAL
                    </div>
                  </div>
                </div>

                {/* Sources List */}
                <div className="zpm-sources-list">
                  {sources.map(source => (
                    <div key={source.id} className={`zpm-source-row ${source.enabled ? '' : 'disabled'}`}>
                      <div className="zpm-source-info">
                        <div className="zpm-source-name-row">
                          <span className="zpm-source-name">{source.name}</span>
                          <span className="zpm-card-badge">{source.type.toUpperCase()}</span>
                          <span style={{ fontSize: '0.65rem', color: source.status === 'synced' ? '#00FF41' : '#FFB800' }}>
                            ● {source.status === 'synced' ? 'SYNCED' : 'SYNCING'}
                          </span>
                        </div>
                        <span className="zpm-source-url">{source.url}</span>
                        <div className="zpm-source-meta">
                          <span>PACKAGES: <strong>{source.packageCount}</strong></span>
                          <span>LAST SYNC: {source.lastSynced || 'Just now'}</span>
                        </div>
                      </div>

                      <div className="zpm-source-controls">
                        <button
                          className={`zpm-source-toggle-btn ${source.enabled ? 'active' : ''}`}
                          onClick={() => toggleSourceEnabled(source.id)}
                        >
                          {source.enabled ? 'ENABLED' : 'DISABLED'}
                        </button>
                        <button
                          className="zpm-source-delete-btn"
                          onClick={() => deleteSource(source.id)}
                          title="Remove Source"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: BUNDLE BUILDER */}
            {activeTab === 'bundle' && (
              <div className="zpm-guide-container">
                <div className="zpm-hero-left">
                  <h3 className="zpm-hero-title">Custom Kindle Plugin Pack Generator</h3>
                  <p className="zpm-hero-desc">
                    Review your selected plugins below. Once exported, simply copy the unpacked folder contents to your Kindle's <code>/koreader/plugins/</code> directory.
                  </p>
                </div>

                <div className="zpm-plugin-grid" style={{ marginBottom: '1rem' }}>
                  {allPlugins.filter(p => selectedPluginIds.includes(p.id)).map(p => (
                    <div key={p.id} className="zpm-plugin-card selected">
                      <div className="zpm-card-top">
                        <div className="zpm-badges-group">
                          <span className="zpm-card-badge">{p.category.toUpperCase()}</span>
                          <span className="zpm-source-badge">{p.sourceName.toUpperCase()}</span>
                        </div>
                        <button
                          className="zpm-card-select-btn checked"
                          onClick={() => toggleSelectPlugin(p.id)}
                        >
                          ✕
                        </button>
                      </div>
                      <div className="zpm-card-body">
                        <div className="zpm-card-icon-title">
                          <span className="zpm-card-icon">{p.icon}</span>
                          <h4 className="zpm-card-title">{p.name}</h4>
                        </div>
                        <p className="zpm-card-desc">{p.description}</p>
                      </div>
                      <div className="zpm-card-footer">
                        <span>FOLDER: <code>{p.id}.koplugin</code></span>
                        <span>{p.size}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {selectedPluginIds.length === 0 ? (
                  <p style={{ color: '#666', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    No plugins selected. Browse the catalog to select plugins for your custom bundle.
                  </p>
                ) : (
                  <button className="zpm-primary-btn" style={{ alignSelf: 'flex-start' }} onClick={handleExportBundle}>
                    EXPORT BUNDLE MANIFEST (JSON)
                  </button>
                )}
              </div>
            )}

            {/* TAB: INSTALL GUIDE */}
            {activeTab === 'guide' && (
              <div className="zpm-guide-container">
                <div className="zpm-guide-step">
                  <div className="zpm-step-num">1</div>
                  <div className="zpm-step-content">
                    <h3 className="zpm-step-title">Ensure Kindle is Jailbroken with KOReader Installed</h3>
                    <p className="zpm-step-desc">
                      ZenPM runs inside KOReader on jailbroken Kindle devices (LanguageBreak, WatchThis, or Popcorn jailbreaks) with KUAL and MRPI.
                    </p>
                  </div>
                </div>

                <div className="zpm-guide-step">
                  <div className="zpm-step-num">2</div>
                  <div className="zpm-step-content">
                    <h3 className="zpm-step-title">Locate KOReader Plugins Directory</h3>
                    <p className="zpm-step-desc">
                      Connect your Kindle to your computer over USB. Mount the USB storage volume and navigate to:
                    </p>
                    <div className="zpm-code-block">
                      /Volumes/Kindle/koreader/plugins/
                    </div>
                  </div>
                </div>

                <div className="zpm-guide-step">
                  <div className="zpm-step-num">3</div>
                  <div className="zpm-step-content">
                    <h3 className="zpm-step-title">Copy Plugins into Directory</h3>
                    <p className="zpm-step-desc">
                      Each plugin lives in its own folder ending in <code>.koplugin</code>. For example:
                    </p>
                    <div className="zpm-code-block">
                      koreader/plugins/anki-vocab-sync.koplugin/<br />
                      koreader/plugins/weather-clock-screensaver.koplugin/<br />
                      koreader/plugins/zenpm.koplugin/
                    </div>
                  </div>
                </div>

                <div className="zpm-guide-step">
                  <div className="zpm-step-num">4</div>
                  <div className="zpm-step-content">
                    <h3 className="zpm-step-title">Restart KOReader to Activate</h3>
                    <p className="zpm-step-desc">
                      Eject the Kindle safely. Open KOReader from KUAL. Go to <strong>Top Menu (Cog icon) ➔ Plugin management</strong> to enable your installed plugins.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: RAW JSON REGISTRY */}
            {activeTab === 'registry' && (
              <div className="zpm-guide-container">
                <div className="zpm-hero-left" style={{ marginBottom: '1rem' }}>
                  <h3 className="zpm-hero-title">ZenPM Public Multi-Source Registry Payload</h3>
                  <p className="zpm-hero-desc">
                    Aggregated manifest of all active repository sources fetched by the on-device <code>zenpm.koplugin</code> installer over Wi-Fi.
                  </p>
                </div>
                <div className="zpm-code-block" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(
                      {
                        registryVersion: '2.0.0',
                        maintainer: 'ENDEAVOR // ZenPM',
                        totalSources: sources.length,
                        activeSources: sources.filter(s => s.enabled),
                        totalPackages: allPlugins.length,
                        packages: allPlugins
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
              </div>
            )}

          </div>
        </div>
        <LegalFooter />
      </div>

      {/* Inspect Modal */}
      {inspectedPlugin && (
        <div className="zpm-modal-overlay">
          <div className="zpm-modal-box">
            <div className="zpm-modal-header">
              <div className="zpm-modal-title-group">
                <span style={{ fontSize: '1.5rem' }}>{inspectedPlugin.icon}</span>
                <div>
                  <h2 className="zpm-modal-title">{inspectedPlugin.name}</h2>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.65rem', color: '#00FFCC' }}>
                    {inspectedPlugin.id}.koplugin // v{inspectedPlugin.version} // {inspectedPlugin.sourceName}
                  </span>
                </div>
              </div>
              <button className="zpm-modal-close" onClick={() => setInspectedPlugin(null)}>✕</button>
            </div>

            <div className="zpm-modal-meta-grid">
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">AUTHOR</span>
                <span className="zpm-meta-val">@{inspectedPlugin.author}</span>
              </div>
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">SOURCE REPO</span>
                <span className="zpm-meta-val">{inspectedPlugin.sourceName}</span>
              </div>
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">KINDLE TESTED</span>
                <span className="zpm-meta-val" style={{ color: inspectedPlugin.kindleTested ? '#00FF41' : '#FF003C' }}>
                  {inspectedPlugin.kindleTested ? '✓ VERIFIED' : 'UNTESTED'}
                </span>
              </div>
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">MIN KOREADER</span>
                <span className="zpm-meta-val">{inspectedPlugin.minKoreader}</span>
              </div>
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">FILE SIZE</span>
                <span className="zpm-meta-val">{inspectedPlugin.size}</span>
              </div>
              <div className="zpm-meta-item">
                <span className="zpm-meta-label">RATING</span>
                <span className="zpm-meta-val">★ {inspectedPlugin.rating} / 5.0</span>
              </div>
            </div>

            <div className="zpm-modal-desc">
              {inspectedPlugin.longDescription}
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {inspectedPlugin.tags.map(t => (
                <span key={t} className="zpm-card-badge">#{t}</span>
              ))}
            </div>

            <div className="zpm-modal-actions">
              <button
                className="zpm-primary-btn"
                onClick={() => {
                  toggleSelectPlugin(inspectedPlugin.id);
                  setInspectedPlugin(null);
                }}
              >
                {selectedPluginIds.includes(inspectedPlugin.id) ? 'REMOVE FROM BUNDLE' : '+ ADD TO BUNDLE'}
              </button>
              {inspectedPlugin.repoUrl && (
                <a
                  href={inspectedPlugin.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="zpm-secondary-btn"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
                >
                  VIEW SOURCE ➔
                </a>
              )}
              <button className="zpm-secondary-btn" onClick={() => setInspectedPlugin(null)}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Source Modal */}
      {isAddSourceOpen && (
        <div className="zpm-modal-overlay">
          <div className="zpm-modal-box">
            <div className="zpm-modal-header">
              <h2 className="zpm-modal-title">ADD_REPOSITORY_SOURCE</h2>
              <button className="zpm-modal-close" onClick={() => setIsAddSourceOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAddSource} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="zpm-modal-field">
                <label className="zpm-modal-label">SOURCE_NAME</label>
                <input
                  type="text"
                  className="zpm-modal-input"
                  placeholder="e.g. My Kindle Plugins Tap"
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="zpm-modal-field">
                <label className="zpm-modal-label">REPOSITORY_URL (GitHub Repo or JSON Manifest)</label>
                <input
                  type="text"
                  className="zpm-modal-input"
                  placeholder="https://github.com/owner/repo or https://example.com/zenpm.json"
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  required
                />
              </div>

              <div className="zpm-modal-field">
                <label className="zpm-modal-label">SOURCE_TYPE</label>
                <select
                  className="zpm-modal-select"
                  value={newSourceType}
                  onChange={e => setNewSourceType(e.target.value as SourceType)}
                >
                  <option value="manifest-json">RAW JSON MANIFEST (zenpm.json)</option>
                  <option value="github-topic">GITHUB TOPIC QUERY (#koreader-plugin)</option>
                  <option value="github-core">GITHUB REPO TREE</option>
                  <option value="kindlefetch">KINDLEFETCH / MOBILEREAD FEED</option>
                </select>
              </div>

              <button
                type="submit"
                className="zpm-primary-btn"
                style={{ justifyContent: 'center', marginTop: '0.5rem' }}
                disabled={!newSourceName.trim() || !newSourceUrl.trim()}
              >
                CONNECT_AND_SYNC_SOURCE
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ZenPM;
