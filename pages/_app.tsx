import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store } from '../lib/store';
import dynamic from 'next/dynamic';

// Import WalletProvider dynamically with ssr disabled to avoid wallet provider conflicts
const WalletProviderWithNoSSR = dynamic(
  () => import('../contexts/WalletContext').then((mod) => mod.WalletProvider),
  { ssr: false }
);

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <WalletProviderWithNoSSR>
        <Component {...pageProps} />
      </WalletProviderWithNoSSR>
    </Provider>
  );
}

export default MyApp; 