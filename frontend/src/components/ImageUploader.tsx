import { useState, useRef, useCallback } from 'react';
import './ImageUploader.css';

interface ImageUploaderProps {
  onImageSelected: (file: File, previewUrl: string) => void;
  maxSizeMb?: number;
}

export default function ImageUploader({ onImageSelected, maxSizeMb = 8 }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const validateAndProcess = useCallback(
    (file: File) => {
      setError(null);

      // Validar tipo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecione um arquivo de imagem válido.');
        return;
      }

      // Validar tamanho
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        setError(`A imagem deve ter no máximo ${maxSizeMb}MB. Tamanho atual: ${sizeMb.toFixed(1)}MB`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          onImageSelected(file, e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    },
    [maxSizeMb, onImageSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndProcess(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndProcess(file);
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 1280 } },
      });
      streamRef.current = stream;
      setIsWebcamActive(true);

      // Aguardar o vídeo estar pronto
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      console.error('Erro ao acessar webcam:', err);
      setError('Não foi possível acessar a câmera. Verifique as permissões.');
    }
  };

  const captureWebcam = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    // Para simplificar e evitar problemas com blob URLs, usamos dataUrl
    // O File original ainda é gerado a partir do blob caso o chamador precise
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'webcam-capture.png', { type: 'image/png' });
        stopWebcam();
        onImageSelected(file, dataUrl);
      }
    }, 'image/png', 1.0);
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  if (isWebcamActive) {
    return (
      <div className="image-uploader animate-fade-in">
        <h2 className="section-title">
          <span className="section-icon">📸</span>
          Tire sua foto
        </h2>

        <div className="webcam-container glass-card">
          <video
            ref={videoRef}
            className="webcam-video"
            autoPlay
            playsInline
            muted
          />
          <div className="webcam-actions">
            <button className="btn btn-primary btn-lg" onClick={captureWebcam}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2"/>
                <circle cx="10" cy="10" r="4" fill="currentColor"/>
              </svg>
              Capturar
            </button>
            <button className="btn btn-secondary" onClick={stopWebcam}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="image-uploader animate-fade-in">
      <h2 className="section-title">
        <span className="section-icon">📷</span>
        Envie sua foto
      </h2>
      <p className="section-description">
        Arraste uma imagem ou clique para selecionar. Máximo {maxSizeMb}MB.
      </p>

      <div
        className={`upload-dropzone glass-card ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
        role="button"
        tabIndex={0}
        aria-label="Área de upload — clique ou arraste uma imagem"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="upload-input-hidden"
          aria-hidden="true"
        />

        <div className="upload-icon-wrapper">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="upload-icon">
            <path
              d="M24 32V16M24 16L18 22M24 16L30 22"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8 28V36C8 38.2091 9.79086 40 12 40H36C38.2091 40 40 38.2091 40 36V28"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <p className="upload-text">
          <strong>Clique para selecionar</strong> ou arraste sua foto aqui
        </p>
        <p className="upload-hint">PNG, JPG, WebP, SVG • Máximo {maxSizeMb}MB</p>
      </div>

      <div className="upload-divider">
        <span>ou</span>
      </div>

      <button className="btn btn-secondary btn-lg upload-webcam-btn" onClick={startWebcam}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="14.5" cy="6.5" r="1" fill="currentColor"/>
        </svg>
        Usar webcam
      </button>

      {error && (
        <div className="upload-error animate-fade-in">
          <span>⚠️</span> {error}
        </div>
      )}
    </div>
  );
}
