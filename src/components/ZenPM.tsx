import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './Navbar';
import LegalFooter from './LegalFooter';
import './ZenPM.css';

// ── Types ─────────────────────────────────────────────────────────
export type PluginCategory = 'all' | 'productivity' | 'reading' | 'sync' | 'eink-ui' | 'tools';

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
}

const COMMUNITY_PLUGINS: KOPlugin[] = [
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
    tags: ['Anki', 'Vocabulary', 'Learning', 'Wi-Fi']
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
    tags: ['Wallabag', 'Articles', 'Sync', 'Offline']
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
    tags: ['Weather', 'Screensaver', 'Clock', 'Dashboard']
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
    tags: ['Calibre', 'Books', 'Wireless', 'Progress']
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
    tags: ['Battery', 'Kindle OS', 'Power', 'Kernel']
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
    tags: ['Readwise', 'Obsidian', 'Highlights', 'Notes']
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
    tags: ['Manga', 'Darkmode', 'Inversion', 'PDF']
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
    tags: ['Dictionary', 'StarDict', 'Translation', 'Glossary']
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
    tags: ['RSS', 'News', 'Digest', 'Periodical']
  }
];

const ZenPM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'bundle' | 'guide' | 'registry'>('catalog');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>(['anki-vocab-sync', 'weather-clock-screensaver']);
  const [inspectedPlugin, setInspectedPlugin] = useState<KOPlugin | null>(null);

  useEffect(() => {
    document.title = '✦ endeavor • ZenPM for Kindle KOReader';
  }, []);

  // ── Filter logic ─────────────────────────────────────────────────
  const filteredPlugins = useMemo(() => {
    return COMMUNITY_PLUGINS.filter(p => {
      const matchCat = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchQuery = !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  const toggleSelectPlugin = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedPluginIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleDownloadInstaller = () => {
    const luaScript = `-- ZenPM On-Device Installer for KOReader
-- Save this file to /koreader/plugins/zenpm.koplugin/main.lua
local UIManager = require("ui/uimanager")
local InfoMessage = require("ui/widget/infomessage")

local ZenPM = {
    name = "zenpm",
    version = "1.0.0"
}

function ZenPM:init()
    UIManager:show(InfoMessage:new{
        text = "ZenPM Package Manager loaded successfully!\\nAccess via Tools -> ZenPM."
    })
end

return ZenPM
`;
    const blob = new Blob([luaScript], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zenpm_installer.lua';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportBundle = () => {
    const selectedPlugins = COMMUNITY_PLUGINS.filter(p => selectedPluginIds.includes(p.id));
    const manifest = {
      bundleName: 'ZenPM_Kindle_Bundle',
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
        repoUrl: p.repoUrl
      }))
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'zenpm_kindle_bundle.json';
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

        <div className="mc-bg-deco-text">ZENPM</div>

        <div className="mc-app-container">
          <div className="mc-app-card" style={{ '--app-color': '#00FFCC' } as React.CSSProperties}>
            <header className="mc-app-header">
              <div className="mc-app-title-group">
                <span className="mc-app-kicker">KINDLE JAILBREAK // E-INK ECOSYSTEM</span>
                <h1 className="mc-app-main-title">ZENPM // KOREADER HUB</h1>
              </div>
            </header>

            {/* Hero & Telemetry Banner */}
            <div className="zpm-hero-banner">
              <div className="zpm-hero-left">
                <span className="zpm-hero-tag">
                  <span>●</span> 9 VERIFIED PLUGINS READY FOR KINDLE
                </span>
                <h2 className="zpm-hero-title">E-Ink Plugin Repository & Bundle Creator</h2>
                <p className="zpm-hero-desc">
                  Browse, bundle, and flash community-crafted Lua plugins directly onto your jailbroken Kindle Paperwhite, Oasis, Scribe, or Kobo running KOReader.
                </p>
              </div>
              <div className="zpm-hero-actions">
                <button className="zpm-primary-btn" onClick={handleDownloadInstaller}>
                  <span>⬇</span> GET LUA INSTALLER
                </button>
                <button className="zpm-secondary-btn" onClick={() => setActiveTab('guide')}>
                  <span>📖</span> JAILBREAK GUIDE
                </button>
              </div>
            </div>

            {/* Sub-Tabs */}
            <div className="zpm-tabs">
              <button
                className={`zpm-tab-btn ${activeTab === 'catalog' ? 'active' : ''}`}
                onClick={() => setActiveTab('catalog')}
              >
                [01] COMMUNITY_CATALOG ({COMMUNITY_PLUGINS.length})
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'bundle' ? 'active' : ''}`}
                onClick={() => setActiveTab('bundle')}
              >
                [02] BUNDLE_BUILDER ({selectedPluginIds.length})
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
                onClick={() => setActiveTab('guide')}
              >
                [03] KINDLE_INSTALL_MANUAL
              </button>
              <button
                className={`zpm-tab-btn ${activeTab === 'registry' ? 'active' : ''}`}
                onClick={() => setActiveTab('registry')}
              >
                [04] RAW_JSON_REGISTRY
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
                  <div className="zpm-search-box">
                    <input
                      type="text"
                      className="zpm-search-input"
                      placeholder="SEARCH PLUGINS OR TAGS..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
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
                          <span className="zpm-card-badge">{plugin.category.toUpperCase()}</span>
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
                  {COMMUNITY_PLUGINS.filter(p => selectedPluginIds.includes(p.id)).map(p => (
                    <div key={p.id} className="zpm-plugin-card selected">
                      <div className="zpm-card-top">
                        <span className="zpm-card-badge">{p.category.toUpperCase()}</span>
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
                  <h3 className="zpm-hero-title">ZenPM Public Registry Endpoint</h3>
                  <p className="zpm-hero-desc">
                    This JSON payload is fetched directly by the on-device <code>zenpm.koplugin</code> when querying community updates over Wi-Fi.
                  </p>
                </div>
                <div className="zpm-code-block" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <pre style={{ margin: 0 }}>
                    {JSON.stringify(
                      {
                        registryVersion: '1.0.0',
                        maintainer: 'ENDEAVOR // ZenPM',
                        totalPackages: COMMUNITY_PLUGINS.length,
                        packages: COMMUNITY_PLUGINS
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
                    {inspectedPlugin.id}.koplugin // v{inspectedPlugin.version}
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
                <span className="zpm-meta-label">DOWNLOADS</span>
                <span className="zpm-meta-val">{inspectedPlugin.downloads.toLocaleString()}</span>
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
                className={`zpm-primary-btn ${selectedPluginIds.includes(inspectedPlugin.id) ? '' : ''}`}
                onClick={() => {
                  toggleSelectPlugin(inspectedPlugin.id);
                  setInspectedPlugin(null);
                }}
              >
                {selectedPluginIds.includes(inspectedPlugin.id) ? 'REMOVE FROM BUNDLE' : '+ ADD TO BUNDLE'}
              </button>
              <button className="zpm-secondary-btn" onClick={() => setInspectedPlugin(null)}>
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ZenPM;
