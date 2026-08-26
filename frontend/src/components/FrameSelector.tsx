import { useState } from 'react';
import type { Frame } from '../hooks/useFrames';
import './FrameSelector.css';

interface FrameSelectorProps {
  frames: Frame[];
  loading: boolean;
  error: string | null;
  selectedFrame: Frame | null;
  onSelect: (frame: Frame) => void;
}

export default function FrameSelector({
  frames,
  loading,
  error,
  selectedFrame,
  onSelect,
}: FrameSelectorProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="frame-selector animate-fade-in">
        <h2 className="section-title">
          <span className="section-icon">🖼️</span>
          Escolha sua moldura
        </h2>
        <div className="frame-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="frame-card-skeleton skeleton" />
          ))}
        </div>
      </div>
    );
  }

  if (error && frames.length === 0) {
    return (
      <div className="frame-selector animate-fade-in">
        <h2 className="section-title">
          <span className="section-icon">🖼️</span>
          Escolha sua moldura
        </h2>
        <div className="frame-error glass-card">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
          <button className="btn btn-secondary mt-md" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="frame-selector animate-fade-in">
      <h2 className="section-title">
        <span className="section-icon">🖼️</span>
        Escolha sua moldura
      </h2>
      <p className="section-description">
        Selecione uma das molduras disponíveis para personalizar seu avatar.
      </p>

      <div className="frame-grid" role="radiogroup" aria-label="Seletor de molduras">
        {frames.map((frame, index) => (
          <button
            key={frame.id}
            className={`frame-card ${selectedFrame?.id === frame.id ? 'selected' : ''} ${hoveredId === frame.id ? 'hovered' : ''}`}
            onClick={() => onSelect(frame)}
            onMouseEnter={() => setHoveredId(frame.id)}
            onMouseLeave={() => setHoveredId(null)}
            role="radio"
            aria-checked={selectedFrame?.id === frame.id}
            aria-label={`Moldura: ${frame.label} (formato ${frame.shape === 'round' ? 'redondo' : 'quadrado'})`}
            tabIndex={0}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className={`frame-thumbnail-wrapper ${frame.shape}`}>
              <img
                src={frame.thumbnail}
                alt={frame.label}
                className="frame-thumbnail"
                loading="lazy"
              />
              {selectedFrame?.id === frame.id && (
                <div className="frame-check">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M5 10L8.5 13.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            <div className="frame-info">
              <span className="frame-label">{frame.label}</span>
              <span className="frame-shape-badge">
                {frame.shape === 'round' ? '⭕ Redondo' : '⬜ Quadrado'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
