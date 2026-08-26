# Instrução de Build — App de Avatares/Molduras (estilo Twibbonize)

> Este documento é um **prompt de engenharia** para ser colado no Antigravity (ou outro agente de codificação) gerar a aplicação completa, pronta para build via Docker e deploy no Easypanel.

---

## 1. Objetivo do produto

Construir uma aplicação web que permite ao usuário:

1. Escolher uma **moldura/máscara** (PNG transparente pré-definida) em uma lista.
2. Fazer upload de uma foto (webcam ou arquivo).
3. Posicionar/dar zoom na foto dentro da área definida pela máscara (redonda ou quadrada).
4. Gerar a imagem final (foto + moldura sobreposta) em alta resolução.
5. Baixar o resultado (PNG) ou copiar/compartilhar.

A aplicação deve poder ser **embutida (embeddable)** em qualquer site via `<iframe>` ou script de embed, mantendo isolamento visual (sem vazar CSS do site host) e responsividade.

As molduras (arquivos PNG) **não são públicas nem versionadas no repositório**. Elas ficam hospedadas externamente (ex.: um bucket S3/R2/CDN privado ou servidor próprio) e a aplicação as carrega dinamicamente a partir de uma URL/manifesto informado por variável de ambiente no `.env` do container Docker.

---

## 2. Arquitetura geral

```
┌─────────────────────────────┐        ┌───────────────────────────┐
│   Frontend (SPA embeddable)  │  <───► │   Backend API (Node/Fastify│
│   React + Canvas/Konva       │  HTTP  │   ou Express)               │
│   - seletor de molduras       │        │   - proxy/cache de molduras │
│   - upload + crop + preview   │        │   - endpoint de manifesto   │
│   - export PNG (client-side)  │        │   - health check             │
└─────────────────────────────┘        └───────────────────────────┘
                                                     │
                                                     ▼
                                      ┌───────────────────────────┐
                                      │ Storage externo de PNGs     │
                                      │ (privado, via FRAMES_*_URL) │
                                      └───────────────────────────┘
```

- **Renderização da imagem final**: feita no **client-side** via `<canvas>` (evita subir foto do usuário para o servidor, reduz custo e é mais rápido). O backend serve apenas o **manifesto das molduras** e faz **proxy/cache** dos PNGs (para não expor a URL privada real diretamente ao navegador, e permitir CORS controlado).
- **Backend** é fino: 2–3 endpoints, sem banco de dados obrigatório (pode usar cache em memória/disco para os PNGs baixados).
- **Frontend** é uma SPA leve, pensada para rodar dentro de `iframe` (embed), com fundo transparente e tamanho responsivo.

---

## 3. Stack sugerida

| Camada | Tecnologia |
|---|---|
| Frontend | React + Vite + TypeScript + Canvas API (ou Konva.js para crop/zoom) |
| Backend | Node.js + Fastify (ou Express) |
| Container | Docker multi-stage (build frontend → serve estático + API no mesmo container ou 2 serviços) |
| Orquestração | docker-compose.yml (compatível com Easypanel) |
| Cache de molduras | Sistema de arquivos local (`/app/cache/frames`) com TTL configurável |
| Proxy reverso | Nativo do Easypanel (Traefik) — a app só precisa expor uma porta HTTP |

---

## 4. Estrutura de arquivos esperada

```
avatar-app/
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── .dockerignore
├── README.md
├── easypanel.json               # (opcional) metadados de serviço para Easypanel
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   ├── routes/
│   │   │   ├── frames.ts        # GET /api/frames (manifesto)
│   │   │   ├── frame-proxy.ts   # GET /api/frames/:id/image (proxy do PNG)
│   │   │   └── health.ts        # GET /api/health
│   │   ├── services/
│   │   │   └── frameCache.ts    # download + cache com TTL
│   │   └── config/
│   │       └── env.ts           # leitura e validação do .env
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── components/
    │   │   ├── FrameSelector.tsx
    │   │   ├── ImageUploader.tsx
    │   │   ├── CropCanvas.tsx
    │   │   ├── PreviewExport.tsx
    │   │   └── EmbedShell.tsx   # wrapper com fundo transparente/responsivo
    │   ├── hooks/
    │   │   └── useFrames.ts
    │   └── utils/
    │       └── canvasExport.ts
    ├── index.html
    ├── package.json
    └── vite.config.ts
```

---

## 5. Variáveis de ambiente (`.env`)

O `.env` é o único lugar onde a origem das molduras é configurada. **Nenhuma URL de moldura fica hardcoded no código.**

```env
# ---- Servidor ----
PORT=3000
NODE_ENV=production
PUBLIC_BASE_URL=https://avatares.seudominio.com

# ---- Fonte das molduras (privada) ----
# URL do manifesto JSON com a lista de molduras disponíveis (nome, id, thumbnail, shape: round|square)
FRAMES_MANIFEST_URL=https://cdn-privado.exemplo.com/molduras/manifest.json

# Base URL onde os PNGs individuais estão hospedados (caso o manifesto use paths relativos)
FRAMES_BASE_URL=https://cdn-privado.exemplo.com/molduras/

# Token/Authorization opcional, caso o storage privado exija autenticação (Bearer, Basic, etc.)
FRAMES_AUTH_HEADER=Bearer SEU_TOKEN_AQUI

# TTL do cache local dos PNGs baixados (em segundos)
FRAMES_CACHE_TTL=3600

# ---- Embed / CORS ----
# Domínios autorizados a embutir a aplicação via iframe
ALLOWED_EMBED_ORIGINS=https://sitecliente1.com,https://sitecliente2.com

# ---- Limites ----
MAX_UPLOAD_SIZE_MB=8
EXPORT_MAX_RESOLUTION=2048
```

### Formato esperado do `manifest.json` (hospedado externamente, apontado por `FRAMES_MANIFEST_URL`)

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

- `shape` define se a área de recorte da foto do usuário é **redonda** ou **quadrada** antes de aplicar o PNG por cima.
- O backend resolve `FRAMES_BASE_URL + file` para buscar o PNG real, faz cache local e serve via `/api/frames/:id/image`, nunca expondo a URL privada original ao navegador do cliente final.

---

## 6. Backend — especificação dos endpoints

### `GET /api/health`
Retorna `200 OK` com status simples. Usado pelo Easypanel/Docker healthcheck.

### `GET /api/frames`
- Busca `FRAMES_MANIFEST_URL` (com `FRAMES_AUTH_HEADER` se definido).
- Faz cache em memória com TTL de `FRAMES_CACHE_TTL`.
- Retorna JSON normalizado ao frontend, **substituindo** os campos `file`/`thumbnail` por URLs internas (`/api/frames/:id/image`, `/api/frames/:id/thumbnail`), nunca a URL privada crua.

### `GET /api/frames/:id/image`
- Resolve o `id` no manifesto, baixa o PNG de `FRAMES_BASE_URL` (se não estiver em cache local), salva em `/app/cache/frames/`, e serve o arquivo com headers de cache apropriados.

### `GET /api/frames/:id/thumbnail`
- Mesmo mecanismo, para a miniatura usada no seletor.

### Middleware de segurança
- Validar header `Origin`/`Referer` contra `ALLOWED_EMBED_ORIGINS` para as rotas de frame (evita hotlinking indevido do seu acervo privado de molduras).
- Rate limiting básico (ex.: `@fastify/rate-limit`) nas rotas de proxy.

---

## 7. Frontend — regras de UX/técnicas

1. **Seletor de molduras**: grid com thumbnails carregadas de `/api/frames`; cada item mostra `label` e indicador de formato (redondo/quadrado).
2. **Upload**: input de arquivo (`accept="image/*"`) + opção de captura via webcam (`<input capture>` ou `getUserMedia`, opcional).
3. **Crop/zoom**: canvas interativo com clip-path `circle` ou `rect` conforme `shape` da moldura escolhida; controles de zoom (slider) e arraste (pan).
4. **Composição final**: no `<canvas>`, desenhar nesta ordem:
   1. Foto do usuário (recortada pela máscara — redonda ou quadrada).
   2. Moldura PNG transparente por cima, na mesma resolução do canvas.
5. **Exportação**: `canvas.toBlob('image/png')`, respeitando `EXPORT_MAX_RESOLUTION`. Botão de download (`<a download>`) e, opcionalmente, botão "copiar imagem" via Clipboard API.
6. **Modo embed**:
   - `EmbedShell.tsx` deve garantir `background: transparent`, `overflow: hidden`, e altura calculada dinamicamente (usar `ResizeObserver` + `postMessage` para o host ajustar o `<iframe>` se necessário).
   - Detectar se está rodando dentro de um `iframe` (`window.self !== window.top`) para ajustar paddings/margens.
7. **Acessibilidade**: labels em inputs, contraste AA, navegação por teclado no seletor de molduras.

### Snippet de embed a ser fornecido no README para o cliente final

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

---

## 8. Dockerfile (multi-stage)

Instrua o agente a gerar um `Dockerfile` multi-stage com:

1. **Stage 1 — build frontend**: `node:20-alpine`, `npm ci && npm run build` dentro de `/frontend`, gerando `dist/`.
2. **Stage 2 — build backend**: `node:20-alpine`, `npm ci && npm run build` dentro de `/backend` (TypeScript → `dist/`).
3. **Stage 3 — runtime**: imagem `node:20-alpine` final, copiando:
   - `backend/dist` + `node_modules` de produção.
   - `frontend/dist` para uma pasta `public/` servida estaticamente pelo próprio Fastify/Express (`@fastify/static`), evitando precisar de um segundo container Nginx.
4. Criar usuário não-root para rodar o processo.
5. `HEALTHCHECK` apontando para `GET /api/health`.
6. `EXPOSE 3000` (ou valor de `PORT`).
7. `CMD ["node", "dist/server.js"]`.

---

## 9. docker-compose.yml (compatível Easypanel)

Deve conter:

```yaml
version: "3.8"

services:
  avatar-app:
    build: .
    image: avatar-app:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - frames-cache:/app/cache/frames
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  frames-cache:
```

Observações para o agente:
- Não expor variáveis sensíveis (`FRAMES_AUTH_HEADER`) em `docker-compose.yml` — sempre via `.env` (que não vai para o Git, apenas `.env.example`).
- O `volumes: frames-cache` garante persistência do cache de PNGs entre restarts do container, reduzindo chamadas ao storage privado.

---

## 10. Requisitos específicos para o Easypanel

1. O repositório deve conter `Dockerfile` na raiz (Easypanel detecta automaticamente builds via Dockerfile).
2. Documentar no `README.md` o passo a passo:
   - Criar novo "App" no Easypanel → "From Dockerfile/Git repo".
   - Configurar variáveis de ambiente (mapeando 1:1 com `.env.example`).
   - Definir porta interna `3000` e domínio/subdomínio.
   - Ativar HTTPS automático (Let's Encrypt, já nativo do Easypanel).
   - Adicionar volume persistente para `/app/cache/frames` (Easypanel permite mapear volumes na UI).
3. Incluir um arquivo `easypanel.json` (opcional, mas recomendado) com metadados básicos do serviço (nome, porta, healthcheck path) para facilitar import, caso o agente já suporte esse formato.
4. Garantir que a aplicação funcione com **apenas 1 porta exposta** (padrão exigido pelo proxy do Easypanel).

---

## 11. Segurança e privacidade

- As URLs reais das molduras (`FRAMES_MANIFEST_URL`, `FRAMES_BASE_URL`) **nunca** devem ser expostas no HTML/JS enviado ao navegador — todo o fluxo passa pelo proxy do backend.
- Validar `ALLOWED_EMBED_ORIGINS` tanto para o header `Content-Security-Policy: frame-ancestors` (permitir embed apenas nos domínios autorizados) quanto para as rotas de imagem (evitar hotlinking).
- Fotos enviadas pelos usuários **não devem ser persistidas no servidor** — todo o processamento é client-side; se o backend precisar tocar na foto (ex.: para watermark server-side no futuro), deletar imediatamente após uso.
- Sanitizar `id` recebido nas rotas `/api/frames/:id/*` contra path traversal.

---

## 12. Entregáveis esperados do agente (checklist final)

- [ ] Código-fonte completo (frontend + backend) conforme estrutura da seção 4.
- [ ] `Dockerfile` multi-stage funcional (`docker build` sem erros).
- [ ] `docker-compose.yml` pronto para `docker compose up`.
- [ ] `.env.example` com todas as variáveis documentadas (sem valores reais).
- [ ] `README.md` com:
  - Instruções de build/local dev.
  - Instruções específicas de deploy no Easypanel.
  - Snippet de embed (`<iframe>`) para o cliente final.
  - Descrição do formato do `manifest.json` esperado.
- [ ] Healthcheck funcional (`/api/health`).
- [ ] Testado localmente com um `manifest.json` mock (pode incluir 1-2 PNGs de exemplo em `/frontend/public/mock-frames/` apenas para dev, nunca em produção).

---

## 13. Prompt resumido (para colar direto no Antigravity)

> "Crie uma aplicação web full-stack (React + Vite no frontend, Node.js + Fastify no backend) para gerar avatares de redes sociais estilo Twibbonize. O usuário escolhe uma moldura PNG transparente (redonda ou quadrada) em uma lista, sobe uma foto, ajusta zoom/posição em um canvas, e exporta a imagem final combinada em PNG, tudo processado no client-side. As molduras não ficam no repositório: são carregadas dinamicamente a partir de um manifesto JSON remoto, cuja URL vem da variável de ambiente `FRAMES_MANIFEST_URL` (com `FRAMES_BASE_URL` e `FRAMES_AUTH_HEADER` opcionais), lido do `.env`. O backend expõe `/api/frames` (manifesto normalizado), `/api/frames/:id/image` e `/api/frames/:id/thumbnail` como proxy/cache dos PNGs remotos, e `/api/health`. A aplicação deve rodar embutida via `<iframe>` (fundo transparente, responsiva, com CSP `frame-ancestors` restrito por `ALLOWED_EMBED_ORIGINS`). Gere Dockerfile multi-stage, docker-compose.yml com volume persistente para cache de molduras, `.env.example` completo, e README com instruções de deploy no Easypanel (build via Dockerfile, 1 porta exposta, healthcheck, variáveis de ambiente)."

---

**Fim do documento de instrução.**
