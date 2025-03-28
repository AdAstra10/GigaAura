import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../lib/store';
import dynamic from 'next/dynamic';
import { DarkModeProvider } from '../contexts/DarkModeContext';

// Import WalletProvider dynamically with ssr disabled to avoid wallet provider conflicts
const WalletProviderWithNoSSR = dynamic(
  () => import('../contexts/WalletContext').then((mod) => mod.WalletProvider),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <DarkModeProvider>
        <WalletProviderWithNoSSR>
          <Component {...pageProps} />
        </WalletProviderWithNoSSR>
      </DarkModeProvider>
    </Provider>
  );
}

export default MyApp; 