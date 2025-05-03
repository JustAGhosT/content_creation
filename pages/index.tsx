import React from 'react';
import MainLayout from '../components/layouts/MainLayout';
import Hero from '../components/Hero';
import type { NextPage } from 'next';
import { ReactElement } from 'react';

// Define a type for pages with getLayout function
type NextPageWithLayout = NextPage & {
  getLayout?: (page: ReactElement) => ReactElement;
};

const Home: NextPageWithLayout = () => {
  return <Hero />;
};

// Define the getLayout function
Home.getLayout = function getLayout(page: ReactElement): ReactElement {
  return (
    <MainLayout 
      title="Home"
      description="Content Creation Platform - Streamline your content workflow"
    >
      {page}
    </MainLayout>
  );
};

export default Home;