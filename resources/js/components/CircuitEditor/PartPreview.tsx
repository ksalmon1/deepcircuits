import React, { useEffect, useRef } from 'react';
import { CircuitBoard } from 'lucide-react';
import { getWokwiPart } from '@/integrations/wokwi';

interface PartPreviewProps {
  type: string;
  svgPath?: string | null;
  /** Square preview box edge, in px. */
  size?: number;
}

/**
 * A small live preview of a library part: element-rendered parts mount the
 * real web component scaled to fit; classic parts render their SVG; anything
 * else falls back to a generic icon.
 */
const PartPreview: React.FC<PartPreviewProps> = ({ type, svgPath, size = 44 }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const spec = getWokwiPart(type);

  useEffect(() => {
    const host = hostRef.current;
    if (!spec || !host) return;
    const element = document.createElement(spec.tag) as HTMLElement & { updateComplete?: Promise<unknown> };
    // Neutralize stretchy :host display rules so the artwork defines the size.
    element.style.display = 'inline-block';
    host.appendChild(element);
    let cancelled = false;
    const fit = () => {
      if (cancelled) return;
      // The shadow SVG is the artwork; the host box can stretch.
      const artwork = element.shadowRoot?.querySelector('svg') ?? element;
      const rect = artwork.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const scale = Math.min(1, size / rect.width, size / rect.height);
        element.style.transform = `scale(${scale})`;
        element.style.transformOrigin = 'top left';
        element.style.marginLeft = `${Math.max(0, (size - rect.width * scale) / 2)}px`;
        element.style.marginTop = `${Math.max(0, (size - rect.height * scale) / 2)}px`;
      }
    };
    Promise.resolve(element.updateComplete)
      .catch(() => undefined)
      .then(() => requestAnimationFrame(fit));
    return () => {
      cancelled = true;
      element.remove();
    };
  }, [spec, size]);

  if (spec) {
    return (
      <div
        ref={hostRef}
        style={{ width: size, height: size, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden
      />
    );
  }

  if (svgPath && svgPath.trim().startsWith('<svg')) {
    return (
      <div
        className="part-preview-svg"
        style={{ width: size, height: size, pointerEvents: 'none' }}
        aria-hidden
        dangerouslySetInnerHTML={{ __html: svgPath }}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      aria-hidden
    >
      <CircuitBoard size={size * 0.6} className="text-gray-400" />
    </div>
  );
};

export default PartPreview;
