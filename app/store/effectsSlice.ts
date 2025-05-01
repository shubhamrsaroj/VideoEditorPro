import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { EffectsState, MediaTrackItem, TextOverlayType, OverlayType } from '../types/effects';

export interface Filter {
  id: string;
  type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'blur' | 'sepia' | 'grayscale';
  value: number;
}

export interface Transition {
  id: string;
  type: 'fade' | 'slide' | 'zoom' | 'wipe';
  duration: number;
  startTime: number;
}

export interface Effect {
  id: string;
  type: 'zoom' | 'pan' | 'rotate' | 'flip';
  startTime: number;
  endTime: number;
  params: {
    startValue: number;
    endValue: number;
    direction?: 'horizontal' | 'vertical';
  };
}

const initialState: EffectsState = {
  mediaItems: [],
  overlays: [],
  selectedOverlayId: null,
  selectedMediaId: null,
  filters: {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    blur: 0
  },
  transform: {
    rotation: 0,
    scale: 1,
    position: {
      x: 0,
      y: 0
    }
  },
  speed: 1
};

const effectsSlice = createSlice({
  name: 'effects',
  initialState,
  reducers: {
    addMediaItem(state, action: PayloadAction<MediaTrackItem>) {
      state.mediaItems.push(action.payload);
    },
    updateMediaItem(
      state,
      action: PayloadAction<{
        itemId: string;
        updates: Partial<MediaTrackItem>;
      }>
    ) {
      const { itemId, updates } = action.payload;
      const item = state.mediaItems.find(item => item.id === itemId);
      if (item) {
        Object.assign(item, updates);
      }
    },
    removeMediaItem(state, action: PayloadAction<string>) {
      state.mediaItems = state.mediaItems.filter(item => item.id !== action.payload);
    },
    addOverlay(state, action: PayloadAction<OverlayType>) {
      state.overlays.push(action.payload);
    },
    updateOverlay(state, action: PayloadAction<{ id: string; updates: Partial<OverlayType> }>) {
      const { id, updates } = action.payload;
      const overlay = state.overlays.find(o => o.id === id);
      if (overlay) {
        Object.assign(overlay, updates);
      }
    },
    removeOverlay(state, action: PayloadAction<string>) {
      state.overlays = state.overlays.filter(o => o.id !== action.payload);
    },
    setSelectedOverlayId(state, action: PayloadAction<string | null>) {
      state.selectedOverlayId = action.payload;
    },
    setSelectedMediaId(state, action: PayloadAction<string | null>) {
      state.selectedMediaId = action.payload;
    },
    updateFilters(state, action: PayloadAction<Partial<EffectsState['filters']>>) {
      Object.assign(state.filters, action.payload);
    },
    updateTransform(state, action: PayloadAction<Partial<EffectsState['transform']>>) {
      Object.assign(state.transform, action.payload);
    },
    setSpeed(state, action: PayloadAction<number>) {
      state.speed = action.payload;
    }
  }
});

export const {
  addMediaItem,
  updateMediaItem,
  removeMediaItem,
  addOverlay,
  updateOverlay,
  removeOverlay,
  setSelectedOverlayId,
  setSelectedMediaId,
  updateFilters,
  updateTransform,
  setSpeed
} = effectsSlice.actions;

export default effectsSlice.reducer; 