import { useState, useCallback } from 'react';
import EmbedShell from './components/EmbedShell';
import FrameSelector from './components/FrameSelector';
import ImageUploader from './components/ImageUploader';
import CropCanvas, { type CropData } from './components/CropCanvas';
import PreviewExport from './components/PreviewExport';
import { useFrames, type Frame } from './hooks/useFrames';

type AppStep = 'select-frame' | 'upload-image' | 'crop' | 'preview';

export default function App() {
  const { frames, loading, error } = useFrames();
  const [step, setStep] = useState<AppStep>('select-frame');
  const [selectedFrame, setSelectedFrame] = useState<Frame | null>(null);
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [cropData, setCropData] = useState<CropData | null>(null);

  const stepIndex = ['select-frame', 'upload-image', 'crop', 'preview'].indexOf(step);

  const handleFrameSelect = useCallback((frame: Frame) => {
    setSelectedFrame(frame);
    setStep('upload-image');
  }, []);

  const handleImageSelected = useCallback((_file: File, previewUrl: string) => {
    setUserImageUrl(previewUrl);
    setStep('crop');
  }, []);

  const handleCropConfirm = useCallback((data: CropData) => {
    setCropData(data);
    setStep('preview');
  }, []);

  const handleReset = useCallback(() => {
    setSelectedFrame(null);
    setUserImageUrl(null);
    setCropData(null);
    setStep('select-frame');
  }, []);

  const handleBackToCrop = useCallback(() => {
    setStep('crop');
  }, []);

  return (
    <EmbedShell>
      <header className="app-header">
        <h1>Gerador de Avatar</h1>
        <p>Crie seu avatar personalizado em poucos passos</p>
      </header>

      {/* Step Indicator */}
      <nav className="step-indicator" aria-label="Progresso">
        {['Moldura', 'Foto', 'Ajuste', 'Exportar'].map((label, i) => (
          <span key={label} style={{ display: 'contents' }}>
            {i > 0 && (
              <span className={`step-connector ${i <= stepIndex ? 'active' : ''}`} />
            )}
            <button
              className={`step-dot ${i === stepIndex ? 'active' : ''} ${i < stepIndex ? 'completed' : ''}`}
              title={label}
              aria-label={`Etapa ${i + 1}: ${label}`}
              onClick={() => {
                // Permitir voltar para etapas anteriores
                if (i === 0) handleReset();
                else if (i === 1 && stepIndex > 1) {
                  setStep('upload-image');
                }
                else if (i === 2 && stepIndex > 2) {
                  setStep('crop');
                }
              }}
              disabled={i > stepIndex}
            />
          </span>
        ))}
      </nav>

      <main className="app-content">
        {step === 'select-frame' && (
          <FrameSelector
            frames={frames}
            loading={loading}
            error={error}
            selectedFrame={selectedFrame}
            onSelect={handleFrameSelect}
          />
        )}

        {step === 'upload-image' && selectedFrame && (
          <ImageUploader
            onImageSelected={handleImageSelected}
            maxSizeMb={8}
          />
        )}

        {step === 'crop' && selectedFrame && userImageUrl && (
          <CropCanvas
            imageUrl={userImageUrl}
            frame={selectedFrame}
            onCropConfirm={handleCropConfirm}
            onBack={() => setStep('upload-image')}
          />
        )}

        {step === 'preview' && selectedFrame && userImageUrl && cropData && (
          <PreviewExport
            imageUrl={userImageUrl}
            frame={selectedFrame}
            cropData={cropData}
            onBack={handleBackToCrop}
            onReset={handleReset}
          />
        )}
      </main>
    </EmbedShell>
  );
}
