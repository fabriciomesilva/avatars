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
    label: 'Time Sonia e Lula',
    shape: 'round',
    image: '/mock-frames/frame-round.svg',
    thumbnail: '/mock-frames/frame-round.svg',
  },
  {
    id: 'mock-square-01',
    label: 'Time Sonia e Lula',
    shape: 'square',
    image: '/mock-frames/frame-square.svg',
    thumbnail: '/mock-frames/frame-square.svg',
  },
  {
    id: 'mock-round-02',
    label: 'Time Sonia e Lula',
    shape: 'round',
    image: '/mock-frames/frame-round.svg', // Reusing
    thumbnail: '/mock-frames/frame-round.svg',
  },
  {
    id: 'mock-square-02',
    label: 'Time Sonia e Lula',
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
      // Usar sempre os dados da API quando a chamada teve sucesso,
      // independentemente de quantas molduras retornaram.
      // Os MOCK_FRAMES só são usados em caso de erro de rede.
      setFrames(Array.isArray(data.frames) ? data.frames : []);
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
