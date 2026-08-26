# Avatar App — Gerador de Avatares com Molduras

Aplicação web full-stack estilo [Twibbonize](https://www.twibbonize.com/) para criar avatares personalizados com molduras PNG transparentes.

![Stack](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-blue) ![Stack](https://img.shields.io/badge/Backend-Node.js%20%2B%20Fastify-green) ![Docker](https://img.shields.io/badge/Deploy-Docker%20%2B%20Easypanel-purple)

## ✨ Funcionalidades

- **Seletor de molduras**: grid visual com thumbnails e indicador de formato (redondo/quadrado)
- **Upload de foto**: arraste & solte, seletor de arquivo ou webcam
- **Editor interativo**: zoom + pan para posicionar a foto na moldura
- **Exportação client-side**: PNG de alta resolução gerado no navegador (sem upload ao servidor)
- **Download e cópia**: salvar como arquivo ou copiar para a área de transferência
- **Modo embeddable**: funciona dentro de `<iframe>` com fundo transparente e responsividade
- **Proxy de molduras**: backend protege URLs privadas do storage de molduras

## 🏗️ Arquitetura

```
Frontend (React SPA)  ←→  Backend (Fastify API)  ←→  Storage Remoto (CDN/S3)
   - Seletor de molduras      - /api/frames (manifesto)      - manifest.json
   - Upload + crop + zoom     - /api/frames/:id/image        - PNGs das molduras
   - Composição no canvas     - /api/frames/:id/thumbnail
   - Exportação PNG            - /api/health
```

- A **composição da imagem final** é feita no **client-side** (Canvas API) — nenhuma foto do usuário é enviada ao servidor
- O backend serve como **proxy/cache** das molduras, nunca expondo URLs privadas

## 📁 Estrutura do Projeto

```
avatar-app/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .dockerignore
├── easypanel.json
├── backend/
│   ├── src/
│   │   ├── server.ts                 # Servidor Fastify principal
│   │   ├── config/env.ts            # Validação de variáveis de ambiente
│   │   ├── routes/
│   │   │   ├── health.ts            # GET /api/health
│   │   │   ├── frames.ts            # GET /api/frames
│   │   │   └── frame-proxy.ts       # GET /api/frames/:id/image|thumbnail
│   │   └── services/
│   │       └── frameCache.ts        # Download + cache com TTL
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx                    # Fluxo principal (4 etapas)
    │   ├── components/
    │   │   ├── EmbedShell.tsx         # Wrapper para modo iframe
    │   │   ├── FrameSelector.tsx      # Grid de molduras
    │   │   ├── ImageUploader.tsx      # Upload + webcam
    │   │   ├── CropCanvas.tsx         # Editor de posição/zoom
    │   │   └── PreviewExport.tsx      # Preview + download/copiar
    │   ├── hooks/useFrames.ts
    │   └── utils/canvasExport.ts
    ├── public/mock-frames/            # Molduras de exemplo (apenas dev)
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

## 🚀 Desenvolvimento Local

### Pré-requisitos

- Node.js 20+
- npm 10+

### Setup

```bash
# 1. Clonar e configurar
cp .env.example .env
# Editar .env se necessário (para dev, pode deixar FRAMES_MANIFEST_URL vazio)

# 2. Instalar dependências
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 3. Rodar em modo desenvolvimento
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend (com proxy para o backend)
cd frontend && npm run dev
```

O frontend estará em `http://localhost:5173` e fará proxy de `/api` para `http://localhost:3000`.

Em modo dev, quando `FRAMES_MANIFEST_URL` está vazio, o frontend carrega automaticamente as molduras mock de `/mock-frames/`.

## 🐳 Docker

### Build e execução

```bash
docker compose up --build
```

A aplicação estará disponível em `http://localhost:3000`.

### Build manual

```bash
docker build -t avatar-app .
docker run -p 3000:3000 --env-file .env avatar-app
```

## ☁️ Deploy no Easypanel

1. **Criar novo App** no Easypanel → **"From Dockerfile/Git repo"**
2. **Conectar repositório** Git com o Dockerfile na raiz
3. **Configurar variáveis de ambiente** (copiar de `.env.example`):
   - `FRAMES_MANIFEST_URL` — URL do manifesto JSON com as molduras
   - `FRAMES_BASE_URL` — Base URL onde os PNGs estão hospedados
   - `FRAMES_AUTH_HEADER` — Token de autenticação (se necessário)
   - `ALLOWED_EMBED_ORIGINS` — Domínios autorizados para embed via iframe
4. **Definir porta interna**: `3000`
5. **Configurar domínio/subdomínio** (ex.: `avatares.seudominio.com`)
6. **HTTPS**: ativar Let's Encrypt (automático no Easypanel)
7. **Volume persistente**: mapear `/app/cache/frames` para persistir cache entre restarts
8. **Healthcheck**: já configurado em `/api/health`

## 📋 Formato do `manifest.json`

O manifesto deve ser um JSON hospedado externamente, apontado por `FRAMES_MANIFEST_URL`:

```json
{
  "frames": [
    {
      "id": "campanha-verao-01",
      "label": "Campanha Verão",
      "shape": "round",
      "file": "campanha-verao-01.png",
      "thumbnail": "campanha-verao-01-thumb.png"
    },
    {
      "id": "evento-tech-square",
      "label": "Evento Tech",
      "shape": "square",
      "file": "evento-tech-square.png",
      "thumbnail": "evento-tech-square-thumb.png"
    }
  ]
}
```

| Campo | Descrição |
|---|---|
| `id` | Identificador único (alfanumérico, hífens e underscores) |
| `label` | Nome exibido para o usuário |
| `shape` | `"round"` (recorte circular) ou `"square"` (recorte quadrado) |
| `file` | Nome do arquivo PNG da moldura (relativo ao `FRAMES_BASE_URL`) |
| `thumbnail` | Nome do arquivo de miniatura (pode ser o mesmo que `file`) |

## 🖼️ Embed via `<iframe>`

Para embutir o gerador em qualquer site:

```html
<iframe
  src="https://avatares.seudominio.com/embed"
  width="100%"
  height="640"
  style="border:0; max-width:480px;"
  allow="clipboard-write"
  title="Gerador de avatar"
></iframe>
```

### Ajuste dinâmico de altura (opcional)

O app envia `postMessage` com a altura atual. Para ajustar o iframe automaticamente:

```html
<script>
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'avatar-app-resize') {
      document.querySelector('iframe').style.height = e.data.height + 'px';
    }
  });
</script>
```

## 🔒 Segurança

- URLs privadas de molduras **nunca** são expostas ao navegador
- Validação de `Origin` via CORS e `frame-ancestors` (CSP)
- Rate limiting nas rotas de proxy
- Sanitização de IDs contra path traversal
- Fotos do usuário processadas apenas no cliente — nunca persistidas no servidor
- Variáveis sensíveis via `.env` (não versionado)

## ⚙️ Variáveis de Ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `PORT` | Não | `3000` | Porta do servidor |
| `NODE_ENV` | Não | `production` | Ambiente |
| `PUBLIC_BASE_URL` | Não | `http://localhost:3000` | URL pública da aplicação |
| `FRAMES_MANIFEST_URL` | Sim* | — | URL do manifesto JSON das molduras |
| `FRAMES_BASE_URL` | Não | — | Base URL dos PNGs (se paths relativos) |
| `FRAMES_AUTH_HEADER` | Não | — | Header de autenticação para o storage |
| `FRAMES_CACHE_TTL` | Não | `3600` | TTL do cache em segundos |
| `ALLOWED_EMBED_ORIGINS` | Não | `*` | Domínios permitidos para embed |
| `MAX_UPLOAD_SIZE_MB` | Não | `8` | Tamanho máximo de upload em MB |
| `EXPORT_MAX_RESOLUTION` | Não | `2048` | Resolução máxima de exportação |

\* Em modo dev, se vazio, o frontend usa molduras mock.

## 📄 Licença

Proprietário. Todos os direitos reservados.
