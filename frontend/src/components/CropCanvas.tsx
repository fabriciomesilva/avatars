import { useRef, useState, useCallback, useEffect } from 'react';
import type { Frame } from '../hooks/useFrames';
import './CropCanvas.css';

interface CropCanvasProps {
  imageUrl: string;
  frame: Frame;
  onCropConfirm: (cropData: CropData) => void;
  onBack: () => void;
}

export interface CropData {
  x: number;
  y: number;
  scale: number;
}

const CANVAS_DEFAULT_SIZE = 400;

export default function CropCanvas({ imageUrl, frame, onCropConfirm, onBack }: CropCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(CANVAS_DEFAULT_SIZE);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (containerRef.current) {
      setContainerSize(containerRef.current.clientWidth || CANVAS_DEFAULT_SIZE);
    }
  }, []);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    const nw = naturalWidth || containerSize;
    const nh = naturalHeight || containerSize;
    
    const scaleX = containerSize / nw;
    const scaleY = containerSize / nh;
    const initialScale = Math.max(scaleX, scaleY);
    setScale(initialScale);

    const imgW = nw * initialScale;
    const imgH = nh * initialScale;
    setPosition({
      x: (containerSize - imgW) / 2,
      y: (containerSize - imgH) / 2,
    });
    setLoading(false);
  };

  // ---- Mouse Events ----
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // ---- Touch Events ----
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
    }
  };

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isDragging || e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    },
    [isDragging, dragStart]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    return () => {
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchMove, handleTouchEnd]);

  // ---- Zoom com scroll ----
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale((prev) => Math.max(0.1, Math.min(5, prev + delta)));
  };

  // ---- Zoom slider ----
  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScale(parseFloat(e.target.value));
  };

  // ---- Confirmar crop ----
  const handleConfirm = () => {
    onCropConfirm({
      x: position.x / containerSize,
      y: position.y / containerSize,
      scale: scale / containerSize,
    });
  };

  return (
    <div className="crop-canvas-section animate-fade-in">
      <h2 className="section-title">
        <span className="section-icon">✂️</span>
        Ajuste sua foto
      </h2>
      <p className="section-description">
        Arraste para mover e use o slider para dar zoom. A moldura será aplicada por cima.
      </p>

      <div className="crop-canvas-wrapper glass-card">
        <div 
          className={`canvas-container ${frame.shape}`}
          style={{ 
            width: '100%', 
            aspectRatio: '1', 
            position: 'relative', 
            overflow: 'hidden', 
            backgroundColor: '#1a1a2e',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderRadius: frame.shape === 'round' ? '50%' : '0'
          }}
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onWheel={handleWheel}
        >
          {/* Imagem do Usuário */}
          <img 
            src={imageUrl} 
            alt="Sua foto" 
            onLoad={handleImageLoad}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              opacity: loading ? 0 : 1,
              transition: 'opacity 0.2s'
            }}
          />
          
          {/* Loading state visual */}
          {loading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white' }}>
              Carregando...
            </div>
          )}

          {/* Moldura PNG sobreposta */}
          <img 
            src={frame.image} 
            alt="Moldura" 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        </div>

        <div className="zoom-controls">
          <label htmlFor="zoom-slider" className="zoom-label">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </label>
          <input
            id="zoom-slider"
            type="range"
            min="0.1"
            max="5"
            step="0.01"
            value={scale}
            onChange={handleZoomChange}
            className="zoom-slider"
            aria-label="Controle de zoom"
          />
          <label className="zoom-label">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 11L14.5 14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M5 7H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M7 5V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </label>
        </div>

        <div className="crop-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Voltar
          </button>
          <button className="btn btn-primary btn-lg" onClick={handleConfirm}>
            Aplicar moldura
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
