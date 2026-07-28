import React, { useState, useRef } from 'react';
import { RefreshCw, Lock, Maximize2, Minimize2, ExternalLink, Globe } from 'lucide-react';

export default function FTTestSection() {
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  // Target Google Form URL
  const originalUrl = "https://forms.gle/tzgEf9QxBj3nG43S9";
  const embeddedUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/viewform?embedded=true";

  const handleRefresh = () => {
    setIsLoading(true);
    setIframeKey(prev => prev + 1);
  };

  return (
    <div 
      style={{ 
        width: '100%', 
        height: isFullscreen ? '100vh' : 'calc(100vh - 120px)', 
        minHeight: '680px', 
        display: 'flex', 
        flexDirection: 'column',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : 'auto',
        zIndex: isFullscreen ? 3000 : 1,
        background: '#f8fafc',
        padding: isFullscreen ? '0' : '0 0 1rem 0',
        transition: 'all 0.25s ease'
      }}
    >
      <div 
        style={{ 
          flex: 1, 
          width: '100%', 
          background: '#ffffff', 
          borderRadius: isFullscreen ? '0' : '24px', 
          border: isFullscreen ? 'none' : '1.5px solid #cbd5e1', 
          boxShadow: isFullscreen ? 'none' : '0 12px 36px rgba(15,23,42,0.08)', 
          overflow: 'hidden', 
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Virtual Browser Top Navigation Bar */}
        <div 
          style={{ 
            height: '46px', 
            background: '#f1f5f9', 
            borderBottom: '1px solid #e2e8f0', 
            display: 'flex', 
            alignItems: 'center', 
            justify: 'space-between', 
            padding: '0 1rem', 
            gap: '1rem',
            userSelect: 'none'
          }}
        >
          {/* Virtual Browser Window Controls & Address Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '700px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#22c55e' }} />
            </div>

            {/* Virtual Address Bar */}
            <div 
              style={{ 
                flex: 1, 
                background: '#ffffff', 
                border: '1px solid #cbd5e1', 
                borderRadius: '8px', 
                padding: '0.25rem 0.75rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.4rem', 
                fontSize: '0.78rem', 
                color: '#475569',
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              <Lock size={13} style={{ color: '#16a34a', flexShrink: 0 }} />
              <span style={{ fontWeight: 700, color: '#0f172a' }}>https://</span>
              <span style={{ color: '#64748b' }}>forms.gle/tzgEf9QxBj3nG43S9</span>
            </div>
          </div>

          {/* Virtual Browser Toolbar Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={handleRefresh}
              className="ft-btn"
              title="Refresh Virtual Webview"
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '8px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}
            >
              <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
              Reload
            </button>

            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ft-btn"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Viewport"}
              style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '0.35rem 0.65rem', borderRadius: '8px', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 800 }}
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>
        </div>

        {/* Viewport Area */}
        <div style={{ flex: 1, width: '100%', position: 'relative', background: '#ffffff' }}>
          {isLoading && (
            <div 
              style={{ 
                position: 'absolute', 
                inset: 0, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justify: 'center', 
                background: '#ffffff', 
                zIndex: 10 
              }}
            >
              <div className="ft-spinner" style={{ width: '38px', height: '38px', borderWidth: '3px', marginBottom: '0.85rem' }} />
              <div style={{ fontWeight: 800, color: '#334155', fontSize: '0.9rem' }}>
                Connecting to Google Forms Virtual Webview...
              </div>
            </div>
          )}

          <iframe
            key={iframeKey}
            src={embeddedUrl}
            title="SciComm Spark Virtual Webview"
            onLoad={() => setIsLoading(false)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block'
            }}
            allow="storage-access *; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-popups-to-escape-sandbox allow-storage-access-by-user-activation"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
