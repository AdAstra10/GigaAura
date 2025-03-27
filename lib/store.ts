import { configureStore } from '@reduxjs/toolkit';
import userReducer from './slices/userSlice';
import postsReducer from './slices/postsSlice';
import auraPointsReducer from './slices/auraPointsSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    user: userReducer,
    posts: postsReducer,
    auraPoints: auraPointsReducer,
    notifications: notificationsReducer,
  },
});

// Type safe state
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 