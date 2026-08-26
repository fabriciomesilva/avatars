import fs from 'fs';
import path from 'path';
import { config } from '../config/env';

const CACHE_DIR = path.resolve('/app/cache/frames');
// Fallback para desenvolvimento local
const LOCAL_CACHE_DIR = path.resolve(__dirname, '../../cache/frames');

interface CacheEntry {
  filePath: string;
  cachedAt: number;
  contentType: string;
}

const cacheIndex = new Map<string, CacheEntry>();

function getCacheDir(): string {
  // Em produção usa /app/cache/frames, em dev usa diretório local
  const dir = process.env.NODE_ENV === 'production' ? CACHE_DIR : LOCAL_CACHE_DIR;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Sanitiza o ID para evitar path traversal
 */
function sanitizeId(id: string): string {
  // Remove qualquer caractere que não seja alfanumérico, hífen ou underscore
  return id.replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Verifica se o item está em cache e ainda é válido (dentro do TTL)
 */
function isValidCache(key: string): CacheEntry | null {
  const entry = cacheIndex.get(key);
  if (!entry) return null;

  const elapsed = (Date.now() - entry.cachedAt) / 1000;
  if (elapsed > config.framesCacheTtl) {
    // TTL expirado — remover do índice
    cacheIndex.delete(key);
    // Tentar remover o arquivo (não bloqueia se falhar)
    try {
      fs.unlinkSync(entry.filePath);
    } catch {
      // Ignora erro na remoção
    }
    return null;
  }

  // Verifica se o arquivo ainda existe em disco
  if (!fs.existsSync(entry.filePath)) {
    cacheIndex.delete(key);
    return null;
  }

  return entry;
}

/**
 * Busca uma imagem do storage remoto, com cache local em disco
 */
export async function fetchFrameImage(
  id: string,
  remoteFileName: string,
  type: 'image' | 'thumbnail' = 'image'
): Promise<{ buffer: Buffer; contentType: string } | null> {
  const safeId = sanitizeId(id);
  const cacheKey = `${safeId}_${type}`;

  // 1. Verificar cache
  const cached = isValidCache(cacheKey);
  if (cached) {
    const buffer = fs.readFileSync(cached.filePath);
    return { buffer, contentType: cached.contentType };
  }

  // 2. Construir URL remota
  const baseUrl = config.framesBaseUrl.endsWith('/')
    ? config.framesBaseUrl
    : config.framesBaseUrl + '/';
  const remoteUrl = `${baseUrl}${remoteFileName}`;

  // 3. Buscar do storage remoto
  try {
    const headers: Record<string, string> = {};
    if (config.framesAuthHeader) {
      headers['Authorization'] = config.framesAuthHeader;
    }

    const response = await fetch(remoteUrl, { headers });
    if (!response.ok) {
      console.error(`Falha ao buscar frame ${id} de ${remoteUrl}: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || 'image/png';

    // 4. Salvar em cache no disco
    const cacheDir = getCacheDir();
    const ext = contentType.includes('png') ? '.png' : contentType.includes('webp') ? '.webp' : '.jpg';
    const filePath = path.join(cacheDir, `${cacheKey}${ext}`);

    fs.writeFileSync(filePath, buffer);

    cacheIndex.set(cacheKey, {
      filePath,
      cachedAt: Date.now(),
      contentType,
    });

    return { buffer, contentType };
  } catch (err) {
    console.error(`Erro ao buscar frame ${id}:`, err);
    return null;
  }
}

// ---- Cache do manifesto em memória ----
interface ManifestCache {
  data: any;
  cachedAt: number;
}

let manifestCache: ManifestCache | null = null;

export interface FrameManifestEntry {
  id: string;
  label: string;
  shape: 'round' | 'square';
  file: string;
  thumbnail: string;
}

export interface FrameManifest {
  frames: FrameManifestEntry[];
}

/**
 * Busca o manifesto de molduras do storage remoto, com cache em memória
 */
export async function fetchManifest(): Promise<FrameManifest | null> {
  // Verificar se temos manifesto em cache e se ainda é válido
  if (manifestCache) {
    const elapsed = (Date.now() - manifestCache.cachedAt) / 1000;
    if (elapsed < config.framesCacheTtl) {
      return manifestCache.data;
    }
  }

  const manifestUrl = config.framesManifestUrl;
  if (!manifestUrl) {
    console.warn('FRAMES_MANIFEST_URL não configurada, usando manifesto vazio');
    return { frames: [] };
  }

  try {
    const headers: Record<string, string> = {};
    if (config.framesAuthHeader) {
      headers['Authorization'] = config.framesAuthHeader;
    }

    const response = await fetch(manifestUrl, { headers });
    if (!response.ok) {
      console.error(`Falha ao buscar manifesto de ${manifestUrl}: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as FrameManifest;

    manifestCache = {
      data,
      cachedAt: Date.now(),
    };

    return data;
  } catch (err) {
    console.error('Erro ao buscar manifesto:', err);
    return null;
  }
}

/**
 * Limpa o cache de manifesto (para forçar refresh)
 */
export function clearManifestCache(): void {
  manifestCache = null;
}
