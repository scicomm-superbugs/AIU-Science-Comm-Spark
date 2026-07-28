import React, { useState } from 'react';

export default function FTTestSection() {
  const [isLoading, setIsLoading] = useState(true);

  // Direct Form Response URL to bypass the "Fill out form" landing card and load questions in-frame
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSfbgcAi8mYiNdlWsIbzj8jgxOCFIrrwl1l-6b3akaZ9Dd2XDg/formResponse?embedded=true";

  return (
    <div style={{ width: '100%', height: 'calc(100vh - 120px)', minHeight: '680px', display: 'flex', flexDirection: 'column' }}>
      <div 
        style={{ 
          flex: 1, 
          width: '100%', 
          background: '#ffffff', 
          borderRadius: '24px', 
          border: '1.5px solid #e2e8f0', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.04)', 
          overflow: 'hidden', 
          position: 'relative' 
        }}
      >
        {/* Loading Spinner */}
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
            <div className="ft-spinner" style={{ width: '40px', height: '40px', borderWidth: '3px', marginBottom: '1rem' }} />
            <div style={{ fontWeight: 800, color: '#475569', fontSize: '0.95rem' }}>
              Loading Form...
            </div>
          </div>
        )}

        {/* Embedded Virtual Browser Viewport */}
        <iframe
          name="virtual_browser_frame"
          src={formUrl}
          title="Virtual Browser Viewport"
          onLoad={() => setIsLoading(false)}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block'
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}
