/* eslint-disable jsx-a11y/accessible-emoji */
import { Link, List, ListItem, Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';
import React from 'react';

import useUser from '../lib/useUser';
import Layout from './Layout';

const StratLayout = ({ children }) => {
  const { user } = useUser({ redirectTo: '/' });

  if (!user || user.isLoggedIn === false) {
    return <Layout>loading...</Layout>;
  }

  return (
    <Layout>
      {children}
      <div>
        <Typography>
          <Box fontStyle="bold" fontSize={14} css={{ marginBottom: '16px' }}>
            ⚡️ Upgrade to{' '}
            <Link target="_blank" href="https://imjo.in/q6g7cB">
              Khaching Premium ↗
            </Link>{' '}
          </Box>
          <Box fontStyle="italic" fontSize={14}>
            Something not working or task failed? Goto{' '}
            <Link href="https://cloud.digitalocean.com/apps">DigitalOcean apps</Link>, select your
            app, goto the "Logs" section, copy paste all you see into a file and{' '}
            <Link href="mailto:me@aakashgoel.com">email me</Link>. <br />
            <br />
            Built and maintained by Aakash Goel |{' '}
            <Link target="_blank" href="https://www.buymeacoffee.com/aakashgoel">
              Buy me a coffee ☕️
            </Link>{' '}
            to support this work.
          </Box>
        </Typography>
      </div>
    </Layout>
  );
};

export default StratLayout;
