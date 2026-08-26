import { useEffect, useRef, type ReactNode } from 'react';

interface EmbedShellProps {
  children: ReactNode;
}

/**
 * Wrapper para modo embed (iframe).
 * - Fundo transparente quando dentro de iframe
 * - ResizeObserver + postMessage para ajuste dinâmico de altura pelo host
 */
export default function EmbedShell({ children }: EmbedShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isEmbed = typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    if (!isEmbed || !containerRef.current) return;

    // Enviar altura ao host via postMessage
    const sendHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.scrollHeight;
        window.parent.postMessage(
          { type: 'avatar-app-resize', height },
          '*'
        );
      }
    };

    // Observar mudanças de tamanho
    const observer = new ResizeObserver(() => {
      sendHeight();
    });

    observer.observe(containerRef.current);
    sendHeight(); // Enviar altura inicial

    return () => observer.disconnect();
  }, [isEmbed]);

  return (
    <div
      ref={containerRef}
      className={`app-container ${isEmbed ? 'embed' : ''}`}
      style={isEmbed ? { background: 'transparent', overflow: 'hidden' } : undefined}
    >
      {!isEmbed && (
        <>
          <div className="bg-decoration bg-orb-1" />
          <div className="bg-decoration bg-orb-2" />
        </>
      )}
      {children}
    </div>
  );
}
