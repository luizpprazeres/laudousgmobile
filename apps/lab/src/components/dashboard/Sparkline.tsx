import { useId } from "react";

type Props = {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
};

export function Sparkline({
  values,
  width = 240,
  height = 40,
  stroke = "#059669",
  fill = "#10B981",
}: Props) {
  const gradId = `sg-${useId().replace(/[:]/g, "")}`;
  if (values.length < 2) return null;

  const max = Math.max(...values, 1);
  const stepX = width / (values.length - 1);
  const toY = (v: number) => height - (v / max) * (height - 4) - 2;

  const points = values.map((v, i) => `${i * stepX},${toY(v)}`).join(" L");
  const linePath = `M${points}`;
  const areaPath = `${linePath} L${width},${height} L0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-full" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity="0.25" />
          <stop offset="100%" stopColor={fill} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={linePath} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" />
      <path d={areaPath} fill={`url(#${gradId})`} />
    </svg>
  );
}
