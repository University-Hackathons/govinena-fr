"use client";

import { Spinner } from "@/components/ui/spinner";

type LoaderProps = {
  size?: number;
  stroke?: number;
  speed?: number;
  color?: string;
  className?: string;
  label?: string;
};

export function Loader({
  size = 40,
  stroke = 3,
  speed = 2,
  color = "var(--primary)",
  className,
  label = "Loading",
}: LoaderProps) {
  return (
    <div className={className} role="status" aria-live="polite" aria-label={label}>
      <Spinner
        style={{
          width: size,
          height: size,
          animationDuration: `${speed}s`,
          color,
        }}
        strokeWidth={stroke}
        aria-hidden="true"
      />
    </div>
  );
}

export default Loader;
