import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

