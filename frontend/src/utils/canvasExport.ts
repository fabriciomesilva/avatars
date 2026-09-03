/**
 * Compõe a imagem final: foto do usuário (com crop) + moldura PNG sobreposta
 */
export async function composeAvatar(
  userImage: HTMLImageElement,
  frameImage: HTMLImageElement,
  cropData: {
    x: number;
    y: number;
    scale: number;
  },
  shape: 'round' | 'square',
  maxResolution: number = 2048
): Promise<Blob> {
  // Para SVGs, naturalWidth/Height pode ser 0 — usar width/height do elemento como fallback
  const frameWidth = frameImage.naturalWidth || frameImage.width || 1080;
  const frameHeight = frameImage.naturalHeight || frameImage.height || 1080;
  const size = Math.min(Math.max(frameWidth, frameHeight), maxResolution) || 1080;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context não suportado');

  // 1. Desenhar a foto do usuário com clipping (redondo ou quadrado)
  ctx.save();

  if (shape === 'round') {
    // Clip circular
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }
  // Para quadrado, não precisa de clip — o canvas já é quadrado

  // Calcular posição e escala da imagem do usuário
  const uImgW = (userImage.naturalWidth || userImage.width || size) * cropData.scale * size;
  const uImgH = (userImage.naturalHeight || userImage.height || size) * cropData.scale * size;
  const posX = (cropData.x * size);
  const posY = (cropData.y * size);

  ctx.drawImage(userImage, posX, posY, uImgW, uImgH);

  ctx.restore();

  // 2. Desenhar a moldura PNG por cima
  ctx.drawImage(frameImage, 0, 0, size, size);

  // 3. Exportar como PNG Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Falha ao gerar imagem'));
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Baixa o blob como arquivo PNG
 */
export function downloadBlob(blob: Blob, filename: string = 'meu-avatar.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copia a imagem para a área de transferência via Clipboard API
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (!navigator.clipboard?.write) {
      console.warn('Clipboard API não suportada neste navegador');
      return false;
    }

    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.error('Erro ao copiar imagem:', err);
    return false;
  }
}

/**
 * Carrega uma imagem a partir de uma URL e retorna um HTMLImageElement.
 * Para SVGs sem dimensões intrínsecas, define width/height antes de carregar
 * para garantir que naturalWidth/naturalHeight não fiquem zerados.
 */
export function loadImage(src: string, fallbackSize: number = 1080): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    try {
      const url = new URL(src, window.location.href);
      if (url.origin !== window.location.origin && url.protocol.startsWith('http')) {
        img.crossOrigin = 'anonymous';
      }
    } catch (e) {
      // Ignore error
    }

    const isSvg = src.includes('.svg') || src.includes('image/svg');

    img.onload = () => {
      // Se for SVG e naturalWidth ainda for 0 após carregado,
      // forçar tamanho via atributos para rasterização correta
      if (isSvg && (img.naturalWidth === 0 || img.naturalHeight === 0)) {
        img.width = fallbackSize;
        img.height = fallbackSize;
      }
      resolve(img);
    };
    img.onerror = () => reject(new Error(`Falha ao carregar imagem: ${src}`));

    // Para SVGs, definir dimensões antes do src evita naturalWidth=0 em alguns browsers
    if (isSvg) {
      img.width = fallbackSize;
      img.height = fallbackSize;
    }

    img.src = src;
  });
}
