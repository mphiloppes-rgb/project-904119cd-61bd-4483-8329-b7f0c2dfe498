import { useRef, useState, useEffect } from "react";

// Pattern lock 3x3 grid (zi alhatif)
interface Props {
  onChange: (pattern: string) => void;
  size?: number;
  reset?: number; // يتغير عشان نمسح من برة
}

export default function PatternLock({ onChange, size = 240, reset }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => { setPath([]); setCursor(null); }, [reset]);

  const dotPositions = Array.from({ length: 9 }).map((_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const cell = size / 3;
    return { x: cell * col + cell / 2, y: cell * row + cell / 2 };
  });

  const getPoint = (e: React.PointerEvent | PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const checkDot = (pt: { x: number; y: number }) => {
    const threshold = size / 8;
    for (let i = 0; i < dotPositions.length; i++) {
      const d = Math.hypot(pt.x - dotPositions[i].x, pt.y - dotPositions[i].y);
      if (d < threshold && !path.includes(i)) {
        const next = [...path, i];
        setPath(next);
        onChange(next.join(","));
        return;
      }
    }
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setPath([]);
    setDrawing(true);
    const pt = getPoint(e);
    setCursor(pt);
    checkDot(pt);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const pt = getPoint(e);
    setCursor(pt);
    checkDot(pt);
  };
  const onUp = () => {
    setDrawing(false);
    setCursor(null);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      className="relative mx-auto touch-none select-none rounded-2xl bg-accent/40"
      style={{ width: size, height: size }}
    >
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        {path.map((p, i) => {
          if (i === 0) return null;
          const a = dotPositions[path[i - 1]];
          const b = dotPositions[p];
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round" />;
        })}
        {drawing && cursor && path.length > 0 && (
          <line x1={dotPositions[path[path.length - 1]].x} y1={dotPositions[path[path.length - 1]].y} x2={cursor.x} y2={cursor.y} stroke="hsl(var(--primary)/0.5)" strokeWidth={3} strokeLinecap="round" />
        )}
      </svg>
      {dotPositions.map((d, i) => (
        <div
          key={i}
          className={`absolute rounded-full transition-all ${path.includes(i) ? "bg-primary scale-110" : "bg-foreground/20"}`}
          style={{
            width: size / 8,
            height: size / 8,
            left: d.x - size / 16,
            top: d.y - size / 16,
          }}
        />
      ))}
    </div>
  );
}
