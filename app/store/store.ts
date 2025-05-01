import { configureStore } from '@reduxjs/toolkit';
import videoReducer from './videoSlice';
import effectsReducer from './effectsSlice';
import type { VideoState } from './videoSlice';
import type { EffectsState } from '../types/effects';

export interface RootState {
  video: VideoState;
  effects: EffectsState;
}

export const store = configureStore({
  reducer: {
    video: videoReducer,
    effects: effectsReducer,
  },
});

export type AppDispatch = typeof store.dispatch;





