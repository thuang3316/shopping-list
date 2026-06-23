import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Full-screen image viewer. Close via Escape, the ✕ button, or clicking the
// backdrop. With multiple images, supports next/prev (buttons + arrow keys).
// Rendered through a portal to document.body so it isn't clipped/anchored by an
// ancestor's overflow-hidden or transform (the cards use both).
export function Lightbox({ images, startIndex = 0, alt = '', onClose }) {
  const [i, setI] = useState(startIndex);
  const many = images.length > 1;
  const prev = useCallback(() => setI((n) => (n - 1 + images.length) % images.length), [images.length]);
  const next = useCallback(() => setI((n) => (n + 1) % images.length), [images.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (many && e.key === 'ArrowLeft') prev();
      else if (many && e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // lock scroll behind the modal
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, prev, next, many]);

  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        type="button"
        onClick={stop(onClose)}
        aria-label="Close"
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/15 text-white text-xl grid place-items-center hover:bg-white/25"
      >
        ✕
      </button>

      {many && (
        <button
          type="button"
          onClick={stop(prev)}
          aria-label="Previous image"
          className="absolute left-3 sm:left-6 w-11 h-11 rounded-full bg-white/15 text-white text-2xl grid place-items-center hover:bg-white/25"
        >
          ‹
        </button>
      )}

      <img
        src={images[i]}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[92vw] object-contain rounded-[var(--radius-card)]"
      />

      {many && (
        <>
          <button
            type="button"
            onClick={stop(next)}
            aria-label="Next image"
            className="absolute right-3 sm:right-6 w-11 h-11 rounded-full bg-white/15 text-white text-2xl grid place-items-center hover:bg-white/25"
          >
            ›
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 eyebrow text-white/80">
            {i + 1} / {images.length}
          </div>
        </>
      )}
    </div>,
    document.body,
  );
}
