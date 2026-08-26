import { useState, useEffect, useCallback } from 'react';

export interface Frame {
  id: string;
  label: string;
  shape: 'round' | 'square';
  image: string;
  thumbnail: string;
}

interface UseFramesReturn {
  frames: Frame[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const MOCK_FRAMES: Frame[] = [
  {
    id: 'mock-round-01',
    label: 'Campanha Verão',
    shape: 'round',
    image: '/mock-frames/frame-round.svg',
    thumbnail: '/mock-frames/frame-round.svg',
  },
  {
    id: 'mock-square-01',
    label: 'Evento Tech',
    shape: 'square',
    image: '/mock-frames/frame-square.svg',
    thumbnail: '/mock-frames/frame-square.svg',
  },
  {
    id: 'mock-round-02',
    label: 'Pride Month',
    shape: 'round',
    image: '/mock-frames/frame-round.svg', // Reusing
    thumbnail: '/mock-frames/frame-round.svg',
  },
  {
    id: 'mock-square-02',
    label: 'Hackathon 2025',
    shape: 'square',
    image: '/mock-frames/frame-square.svg', // Reusing
    thumbnail: '/mock-frames/frame-square.svg',
  },
];

export function useFrames(): UseFramesReturn {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFrames = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/frames');

      if (!response.ok) {
        throw new Error(`Erro ao carregar molduras: ${response.status}`);
      }

      const data = await response.json();
      if (data.frames && data.frames.length > 0) {
        setFrames(data.frames);
      } else {
        setFrames(MOCK_FRAMES);
      }
    } catch (err) {
      console.error('Erro ao carregar molduras:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setFrames(MOCK_FRAMES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFrames();
  }, [fetchFrames]);

  return { frames, loading, error, refetch: fetchFrames };
}
