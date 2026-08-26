import { useState, useEffect, useRef, useCallback } from 'react';
import type { Frame } from '../hooks/useFrames';
import type { CropData } from './CropCanvas';
import { composeAvatar, downloadBlob, copyImageToClipboard, loadImage } from '../utils/canvasExport';
import './PreviewExport.css';

interface PreviewExportProps {
  imageUrl: string;
  frame: Frame;
  cropData: CropData;
  onBack: () => void;
  onReset: () => void;
}

export default function PreviewExport({
  imageUrl,
  frame,
  cropData,
  onBack,
  onReset,
}: PreviewExportProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(true);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [downloaded, setDownloaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const generateImage = useCallback(async () => {
    setLoading(true);
    try {
      const [userImg, frameImg] = await Promise.all([
        loadImage(imageUrl),
        loadImage(frame.image),
      ]);

      const blob = await composeAvatar(userImg, frameImg, cropData, frame.shape);

      setResultBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      console.error('Erro ao gerar avatar:', err);
    } finally {
      setLoading(false);
    }
  }, [imageUrl, frame, cropData]);

  useEffect(() => {
    generateImage();

    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateImage]);

  const handleDownload = () => {
    if (!resultBlob) return;
    downloadBlob(resultBlob, `avatar-${frame.id}.png`);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  const handleCopy = async () => {
    if (!resultBlob) return;
    const success = await copyImageToClipboard(resultBlob);
    setCopyStatus(success ? 'success' : 'error');
    setTimeout(() => setCopyStatus('idle'), 3000);
  };

  if (loading) {
    return (
      <div className="preview-export animate-fade-in">
        <h2 className="section-title">
          <span className="section-icon">✨</span>
          Gerando seu avatar...
        </h2>
        <div className="preview-loading glass-card">
          <div className="spinner spinner-lg" />
          <p>Compondo imagem final em alta resolução...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="preview-export animate-fade-in">
      <h2 className="section-title">
        <span className="section-icon">✨</span>
        Seu avatar está pronto!
      </h2>
      <p className="section-description">
        Baixe ou copie sua imagem para usar nas redes sociais.
      </p>

      <div className="preview-card glass-card" ref={previewRef}>
        {previewUrl && (
          <div className={`preview-image-wrapper ${frame.shape}`}>
            <img
              src={previewUrl}
              alt="Seu avatar personalizado"
              className="preview-image"
            />
          </div>
        )}

        <div className="export-actions">
          <button
            className={`btn btn-accent btn-lg export-btn ${downloaded ? 'success' : ''}`}
            onClick={handleDownload}
            disabled={!resultBlob}
          >
            {downloaded ? (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M5 10L8.5 13.5L15 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Baixado!
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M10 3V13M10 13L6 9M10 13L14 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3 15V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Baixar PNG
              </>
            )}
          </button>

          <button
            className={`btn btn-secondary export-btn ${copyStatus === 'success' ? 'success' : ''}`}
            onClick={handleCopy}
            disabled={!resultBlob || copyStatus !== 'idle'}
          >
            {copyStatus === 'success' ? (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 8L6.5 10.5L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copiado!
              </>
            ) : copyStatus === 'error' ? (
              <>⚠️ Não suportado</>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="5" y="5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M11 3H4C3.44772 3 3 3.44772 3 4V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Copiar imagem
              </>
            )}
          </button>
        </div>

        <div className="preview-secondary-actions">
          <button className="btn btn-secondary" onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ajustar posição
          </button>
          <button className="btn btn-secondary" onClick={onReset}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C5.79086 2 3.87539 3.27477 2.88873 5.125" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M2 2.5V5.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Criar outro
          </button>
        </div>
      </div>
    </div>
  );
}
