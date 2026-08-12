import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
} from "react-native-svg";

type IconProps = {
  size?: number;
  color?: string;
};

const stroke = (size: number, color: string, sw: number, children: React.ReactNode) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </Svg>
);

const fill = (size: number, color: string, children: React.ReactNode) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    {children}
  </Svg>
);

export const Menu = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2.2,
    <>
      <Line x1="4" y1="7" x2="20" y2="7" />
      <Line x1="4" y1="13" x2="14" y2="13" />
      <Line x1="4" y1="19" x2="20" y2="19" />
    </>,
  );

export const Sparkle = ({ size = 16, color = "#000" }: IconProps) =>
  fill(
    size,
    color,
    <Path d="M12 2.5l1.7 4.7L18 9l-4.3 1.8L12 15.5l-1.7-4.7L6 9l4.3-1.8L12 2.5zM19.5 14l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9.9-2.4zM5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8L2.5 16.5l1.8-.7L5 14z" />,
  );

export const Chevron = ({ size = 14, color = "#000" }: IconProps) =>
  stroke(size, color, 2.4, <Polyline points="9 6 15 12 9 18" />);

export const ChevronDown = ({ size = 14, color = "#000" }: IconProps) =>
  stroke(size, color, 2.4, <Polyline points="6 9 12 15 18 9" />);

export const ChevronLeft = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(size, color, 2.4, <Polyline points="15 18 9 12 15 6" />);

export const Mic = ({ size = 26, color = "#000" }: IconProps) =>
  fill(
    size,
    color,
    <Path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />,
  );

export const Plus = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2.4,
    <>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </>,
  );

export const Cal = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <>
      <Rect x="3" y="4" width="18" height="18" rx="3" />
      <Line x1="16" y1="2" x2="16" y2="6" />
      <Line x1="8" y1="2" x2="8" y2="6" />
      <Line x1="3" y1="10" x2="21" y2="10" />
    </>,
  );

export const Ruler = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <>
      <Path d="M21.3 8.7l-6-6a1 1 0 0 0-1.4 0L2.7 13.9a1 1 0 0 0 0 1.4l6 6a1 1 0 0 0 1.4 0L21.3 10.1a1 1 0 0 0 0-1.4z" />
      <Path d="M7.5 10.5l2 2M10.5 7.5l2 2M13.5 4.5l2 2M4.5 13.5l2 2" />
    </>,
  );

export const Quote = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <Path d="M3 21c0-5 2-7 5-8l-1-3c-3 1-6 4-6 9v3h2zM12 21c0-5 2-7 5-8l-1-3c-3 1-6 4-6 9v3h2z" />,
  );

export const Layers = ({ size = 16, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Polygon points="12 2 2 7 12 12 22 7 12 2" />
      <Polyline points="2 17 12 22 22 17" />
      <Polyline points="2 12 12 17 22 12" />
    </>,
  );

export const Camera = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <>
      <Path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>,
  );

export const X = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2.4,
    <>
      <Line x1="6" y1="6" x2="18" y2="18" />
      <Line x1="6" y1="18" x2="18" y2="6" />
    </>,
  );

export const Stop = ({ size = 22, color = "#000" }: IconProps) =>
  fill(size, color, <Rect x="6" y="6" width="12" height="12" rx="2.5" />);

export const Pencil = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <Path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />,
  );

export const Copy = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Rect x="9" y="9" width="13" height="13" rx="2" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>,
  );

export const RotateCcw = ({ size = 22, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Polyline points="1 4 1 10 7 10" />
      <Path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </>,
  );

export const CheckCircle = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Circle cx="12" cy="12" r="10" />
      <Polyline points="9 12 12 15 16 10" />
    </>,
  );

export const Send = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2.2,
    <>
      <Path d="M22 2L11 13" />
      <Path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </>,
  );

export const Folder = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <Path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />,
  );

export const Bar = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <>
      <Path d="M3 3v18h18" />
      <Path d="M18 17V9" />
      <Path d="M13 17V5" />
      <Path d="M8 17v-3" />
    </>,
  );

export const Book = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <Path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20" />,
  );

export const Shield = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <Path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  );

export const Sliders = ({ size = 20, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <>
      <Line x1="4" y1="21" x2="4" y2="14" />
      <Line x1="4" y1="10" x2="4" y2="3" />
      <Line x1="12" y1="21" x2="12" y2="12" />
      <Line x1="12" y1="8" x2="12" y2="3" />
      <Line x1="20" y1="21" x2="20" y2="16" />
      <Line x1="20" y1="12" x2="20" y2="3" />
      <Line x1="1" y1="14" x2="7" y2="14" />
      <Line x1="9" y1="8" x2="15" y2="8" />
      <Line x1="17" y1="16" x2="23" y2="16" />
    </>,
  );

export const Moon = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    1.8,
    <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />,
  );

export const Search = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Circle cx="11" cy="11" r="8" />
      <Line x1="21" y1="21" x2="16.65" y2="16.65" />
    </>,
  );

export const Info = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Circle cx="12" cy="12" r="10" />
      <Line x1="12" y1="16" x2="12" y2="12" />
      <Line x1="12" y1="8" x2="12.01" y2="8" />
    </>,
  );

export const AlertTriangle = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <Line x1="12" y1="9" x2="12" y2="13" />
      <Line x1="12" y1="17" x2="12.01" y2="17" />
    </>,
  );

export const AlertOctagon = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <Line x1="12" y1="8" x2="12" y2="12" />
      <Line x1="12" y1="16" x2="12.01" y2="16" />
    </>,
  );

export const Eye = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <Circle cx="12" cy="12" r="3" />
    </>,
  );

export const EyeOff = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <Line x1="1" y1="1" x2="23" y2="23" />
    </>,
  );

// Feather thumbs — feedback do laudo (sem emoji; critique 04/07)
export const ThumbUp = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <Path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />,
  );

export const ThumbDown = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <Path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />,
  );

// Feather image — análise de imagem de USG
export const ImageIcon = ({ size = 18, color = "#000" }: IconProps) =>
  stroke(
    size,
    color,
    2,
    <>
      <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <Circle cx="8.5" cy="8.5" r="1.5" />
      <Polyline points="21 15 16 10 5 21" />
    </>,
  );
