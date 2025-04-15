import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../lib/store'; // Adjust path if needed

// Export a typed version of the useDispatch hook
export const useAppDispatch = () => useDispatch<AppDispatch>(); 