import { useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function StarField() {
  const stars = useMemo<Star[]>(() => {
    return Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      delay: Math.random() * 5,
      duration: Math.random() * 3 + 2,
      opacity: Math.random() * 0.6 + 0.2,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Grid lines */}
      <div className="absolute inset-0 grid-bg opacity-50" />

      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            backgroundColor: star.id % 3 === 0
              ? "oklch(0.85 0.18 195)"
              : star.id % 3 === 1
              ? "oklch(0.8 0.18 300)"
              : "oklch(0.9 0.05 240)",
            opacity: star.opacity,
            animation: `star-twinkle ${star.duration}s ${star.delay}s ease-in-out infinite`,
            boxShadow: star.size > 1.5
              ? `0 0 ${star.size * 3}px currentColor`
              : "none",
          }}
        />
      ))}

      {/* Radial gradient vignette */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(5, 5, 16, 0.7) 100%)",
        }}
      />

      {/* Scanlines */}
      <div className="scanlines" />
    </div>
  );
}
