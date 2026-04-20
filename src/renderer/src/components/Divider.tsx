import { useCallback, useEffect, useRef } from 'react';

interface Props {
  onDrag: (deltaPx: number) => void;
}

export function Divider({ onDrag }: Props) {
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);

  const onMove = useCallback(
    (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      onDrag(delta);
    },
    [onDrag],
  );

  const onUp = useCallback(() => {
    draggingRef.current = false;
    document.body.style.cursor = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [onMove, onUp]);

  return (
    <div
      className="divider"
      onMouseDown={(e) => {
        draggingRef.current = true;
        lastXRef.current = e.clientX;
        document.body.style.cursor = 'col-resize';
      }}
    />
  );
}
