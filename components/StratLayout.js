import React from 'react';

import { useUser } from '../lib/customHooks';
import Footer from './Footer';
import Layout from './Layout';

const StratLayout = ({ children }) => {
  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      {children}
      <Footer />
    </Layout>
  );
};

export default StratLayout;
