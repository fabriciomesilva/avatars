import dotenv from 'dotenv';
import path from 'path';

// Carrega .env da raiz do projeto (um nível acima de /backend)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface AppConfig {
  port: number;
  nodeEnv: string;
  publicBaseUrl: string;

  framesManifestUrl: string;
  framesBaseUrl: string;
  framesAuthHeader: string;
  framesCacheTtl: number;

  allowedEmbedOrigins: string[];

  maxUploadSizeMb: number;
  exportMaxResolution: number;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Variável de ambiente obrigatória não definida: ${key}`);
  }
  return value;
}

function getEnvOptional(key: string, defaultValue: string = ''): string {
  return process.env[key] ?? defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  if (isNaN(parsed)) {
    throw new Error(`Variável de ambiente ${key} deve ser um número, recebido: "${raw}"`);
  }
  return parsed;
}

export function loadConfig(): AppConfig {
  return {
    port: getEnvNumber('PORT', 3000),
    nodeEnv: getEnvOptional('NODE_ENV', 'development'),
    publicBaseUrl: getEnvOptional('PUBLIC_BASE_URL', 'http://localhost:3000'),

    framesManifestUrl: getEnv('FRAMES_MANIFEST_URL', ''),
    framesBaseUrl: getEnvOptional('FRAMES_BASE_URL', ''),
    framesAuthHeader: getEnvOptional('FRAMES_AUTH_HEADER', ''),
    framesCacheTtl: getEnvNumber('FRAMES_CACHE_TTL', 3600),

    allowedEmbedOrigins: getEnvOptional('ALLOWED_EMBED_ORIGINS', '*')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

    maxUploadSizeMb: getEnvNumber('MAX_UPLOAD_SIZE_MB', 8),
    exportMaxResolution: getEnvNumber('EXPORT_MAX_RESOLUTION', 2048),
  };
}

export const config = loadConfig();
