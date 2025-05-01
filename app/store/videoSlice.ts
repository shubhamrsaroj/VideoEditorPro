import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { nanoid } from 'nanoid';

export interface VideoState {
  currentVideo: {
    url: string;
    duration: number;
  };
  timeline: {
    currentTime: number;
    trimStart: number;
    trimEnd: number;
  };
  audio: {
    backgroundMusic?: {
      url: string;
      volume: number;
    };
    isMuted: boolean;
    volume: number;
  };
  subtitles: Array<{
    id: string;
    text: string;
    startTime: number;
    endTime: number;
    style?: {
      fontSize?: number;
      color?: string;
      position?: 'top' | 'middle' | 'bottom';
      backgroundColor?: string;
      opacity?: number;
      textShadow?: boolean;
      fontWeight?: 'normal' | 'bold';
    };
  }>;
  trimmedSegments: Array<{
    id: string;
    startTime: number;
    endTime: number;
    thumbnail?: string;
    order: number;
  }>;
  overlays: Array<{
    id: string;
    type: 'text' | 'image';
    content: string;
    position: {
      x: number;
      y: number;
    };
    startTime: number;
    duration: number;
    style?: {
      fontSize?: number;
      color?: string;
      opacity?: number;
      animation?: 'fade' | 'slide' | 'none';
    };
  }>;
  renderStatus: {
    isRendering: boolean;
    progress: number;
    downloadUrl?: string;
  };
}

const initialState: VideoState = {
  currentVideo: {
    url: '',
    duration: 0,
  },
  timeline: {
    currentTime: 0,
    trimStart: 0,
    trimEnd: 0,
  },
  audio: {
    isMuted: false,
    volume: 1,
  },
  subtitles: [],
  trimmedSegments: [],
  overlays: [],
  renderStatus: {
    isRendering: false,
    progress: 0,
  },
};

export const videoSlice = createSlice({
  name: 'video',
  initialState,
  reducers: {
    //setting the current video , like im adding url and duration
    //dispatch(setCurrentVideo({ url: 'https://funnyvideo.com/cat.mp4', duration: 120 }));
    //{
  //type: 'video/setCurrentVideo',
  //payload: {
   // url: 'https://funnyvideo.com/cat.mp4',
    //duration: 120
  //}
//}
    setCurrentVideo: (state: VideoState, action: PayloadAction<{ url: string; duration: number }>) => {
      state.currentVideo = action.payload;
      state.timeline.trimEnd = action.payload.duration;
    },

    
    
    updateCurrentTime: (state: VideoState, action: PayloadAction<number>) => {
      state.timeline.currentTime = action.payload;
    },
    setTrimPoints: (state: VideoState, action: PayloadAction<{ start: number; end: number }>) => {
      state.timeline.trimStart = Math.max(0, action.payload.start);
      state.timeline.trimEnd = Math.min(state.currentVideo.duration, action.payload.end);
    },
    setBackgroundMusic: (state: VideoState, action: PayloadAction<{ url: string; volume?: number }>) => {
      state.audio.backgroundMusic = {
        url: action.payload.url,
        volume: action.payload.volume ?? 1,
      };
    },
    updateAudioSettings: (state: VideoState, action: PayloadAction<{ isMuted?: boolean; volume?: number }>) => {
      if (typeof action.payload.isMuted !== 'undefined') {
        state.audio.isMuted = action.payload.isMuted;
      }
      if (typeof action.payload.volume !== 'undefined') {
        state.audio.volume = action.payload.volume;
      }
    },
    addSubtitle: (state: VideoState, action: PayloadAction<{
      text: string;
      startTime: number;
      endTime: number;
      style?: {
        fontSize?: number;
        color?: string;
        position?: 'top' | 'middle' | 'bottom';
      };
    }>) => {
      state.subtitles.push({
        id: Date.now().toString(),
        ...action.payload,
      });
    },
    updateSubtitle: (state: VideoState, action: PayloadAction<{
      id: string;
      updates: {
        text?: string;
        startTime?: number;
        endTime?: number;
        style?: {
          fontSize?: number;
          color?: string;
          position?: 'top' | 'middle' | 'bottom';
          backgroundColor?: string;
          opacity?: number;
          textShadow?: boolean;
          fontWeight?: 'normal' | 'bold';
        };
      };
    }>) => {
      const subtitle = state.subtitles.find(s => s.id === action.payload.id);
      if (subtitle) {
        const { updates } = action.payload;
        
        // Update basic properties
        if (updates.text !== undefined) subtitle.text = updates.text;
        if (updates.startTime !== undefined) subtitle.startTime = updates.startTime;
        if (updates.endTime !== undefined) subtitle.endTime = updates.endTime;
        
        // Update style properties
        if (updates.style) {
          // Initialize style object if it doesn't exist
          if (!subtitle.style) subtitle.style = {};
          
          // Update each style property
          const style = updates.style;
          if (style.fontSize !== undefined) subtitle.style.fontSize = style.fontSize;
          if (style.color !== undefined) subtitle.style.color = style.color;
          if (style.position !== undefined) subtitle.style.position = style.position;
          if (style.backgroundColor !== undefined) subtitle.style.backgroundColor = style.backgroundColor;
          if (style.opacity !== undefined) subtitle.style.opacity = style.opacity;
          if (style.textShadow !== undefined) subtitle.style.textShadow = style.textShadow;
          if (style.fontWeight !== undefined) subtitle.style.fontWeight = style.fontWeight;
        }
      }
    },
    removeSubtitle: (state: VideoState, action: PayloadAction<string>) => {
      state.subtitles = state.subtitles.filter(s => s.id !== action.payload);
    },
    saveTrimmedSegment: (state: VideoState, action: PayloadAction<{
      startTime: number;
      endTime: number;
      thumbnail?: string;
    }>) => {
      state.trimmedSegments.push({
        id: Date.now().toString(),
        startTime: action.payload.startTime,
        endTime: action.payload.endTime,
        thumbnail: action.payload.thumbnail,
        order: state.trimmedSegments.length,
      });
    },
    reorderSegments: (state: VideoState, action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const segments = [...state.trimmedSegments];
      const [removed] = segments.splice(sourceIndex, 1);
      segments.splice(destinationIndex, 0, removed);
      segments.forEach((segment, index) => {
        segment.order = index;
      });
      state.trimmedSegments = segments;
    },
    updateRenderStatus: (state: VideoState, action: PayloadAction<{
      isRendering: boolean;
      progress?: number;
      downloadUrl?: string;
    }>) => {
      state.renderStatus = {
        ...state.renderStatus,
        ...action.payload,
      };
    },
    removeTrimmedSegment: (state: VideoState, action: PayloadAction<string>) => {
      state.trimmedSegments = state.trimmedSegments.filter(segment => segment.id !== action.payload);
    },
    addOverlay: (state, action: PayloadAction<{
      type: 'text' | 'image';
      content: string;
      position: { x: number; y: number };
      startTime?: number;
      duration?: number;
    }>) => {
      const { type, content, position, startTime = 0, duration = 5 } = action.payload;
      state.overlays.push({
        id: nanoid(),
        type,
        content,
        position,
        startTime,
        duration,
      });
    },
    updateOverlayPosition: (state: VideoState, action: PayloadAction<{
      id: string;
      position: { x: number; y: number };
    }>) => {
      const overlay = state.overlays.find(o => o.id === action.payload.id);
      if (overlay) {
        overlay.position = action.payload.position;
      }
    },
    updateOverlayStyle: (state: VideoState, action: PayloadAction<{
      id: string;
      style: {
        scale?: number;
        opacity?: number;
        rotation?: number;
        filter?: {
          brightness?: number;
          contrast?: number;
          saturation?: number;
          blur?: number;
        };
        border?: {
          width?: number;
          color?: string;
          style?: 'solid' | 'dashed' | 'dotted';
          radius?: number;
        };
        shadow?: {
          color?: string;
          blur?: number;
          x?: number;
          y?: number;
        };
        fontSize?: number;
        color?: string;
        animation?: 'fade' | 'slide' | 'none';
      };
    }>) => {
      const overlay = state.overlays.find(o => o.id === action.payload.id);
      if (overlay) {
        overlay.style = { ...overlay.style, ...action.payload.style };
      }
    },
    removeOverlay: (state: VideoState, action: PayloadAction<string>) => {
      state.overlays = state.overlays.filter(overlay => overlay.id !== action.payload);
    },
  },
});

export const {
  setCurrentVideo,
  updateCurrentTime,
  setTrimPoints,
  setBackgroundMusic,
  updateAudioSettings,
  addSubtitle,
  updateSubtitle,
  removeSubtitle,
  saveTrimmedSegment,
  reorderSegments,
  updateRenderStatus,
  removeTrimmedSegment,
  addOverlay,
  updateOverlayPosition,
  updateOverlayStyle,
  removeOverlay,
} = videoSlice.actions;

export default videoSlice.reducer; 