import React from 'react';
import type { AppProps } from 'next/app';
import type { ReactElement, ReactNode } from 'react';
import type { NextPage } from 'next';
import { ThemeProvider } from '../context/ThemeContext';
import '../styles/globals.css';

// Define the NextPageWithLayout type
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactNode;
};

// Define the AppPropsWithLayout type
type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

function MyApp({ Component, pageProps }: AppPropsWithLayout) {
  // Use the layout defined at the page level, if available
  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <ThemeProvider>
      {getLayout(<Component {...pageProps} />)}
    </ThemeProvider>
  );
}

export default MyApp;