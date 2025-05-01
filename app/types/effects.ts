interface Position {
  x: number;
  y: number;
}

interface Timing {
  startTime: number;
  duration: number;
}

interface Shadow {
  offsetX: number;
  offsetY: number;
  x: number;
  y: number;
  blur: number;
  color: string;
}

interface Border {
  width: number;
  style: string;
  color: string;
  radius: number;
}

interface Filter {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
}

interface BaseOverlay {
  id: string;
  type: 'text' | 'image';
  position: Position;
  timing: Timing;
}

interface ImageStyle {
  scale: number;
  rotation: number;
  opacity: number;
  filter: Filter;
  border: Border;
  shadow: Shadow;
}

interface TextStyle {
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  opacity: number;
  rotation: number;
  backgroundColor?: string;
  padding?: string;
  textAlign?: 'left' | 'center' | 'right';
  textShadow?: boolean;
  animation?: {
    type: string;
    duration: number;
  };
}

interface TextOverlayType extends BaseOverlay {
  type: 'text';
  content: string;
  style: TextStyle;
}

interface ImageOverlayType extends BaseOverlay {
  type: 'image';
  content: string;
  style: ImageStyle;
}

type OverlayType = TextOverlayType | ImageOverlayType;

interface MediaTrackItem {
  id: string;
  type: 'video' | 'audio' | 'image';
  content: string;
  startTime: number;
  duration: number;
  track: number;
  name?: string;
}

interface EffectsState {
  mediaItems: MediaTrackItem[];
  overlays: OverlayType[];
  selectedOverlayId: string | null;
  selectedMediaId: string | null;
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
    blur: number;
  };
  transform: {
    rotation: number;
    scale: number;
    position: Position;
  };
  speed: number;
}

export type {
  Position,
  Timing,
  Shadow,
  Border,
  Filter,
  BaseOverlay,
  ImageStyle,
  TextStyle,
  TextOverlayType,
  ImageOverlayType,
  OverlayType,
  MediaTrackItem,
  EffectsState
};