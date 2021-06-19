/* eslint-disable jsx-a11y/accessible-emoji */
import { Divider, Link, Typography } from '@material-ui/core';
import Box from '@material-ui/core/Box';

const Footer = () => (
  <div>
    <Divider style={{ marginBottom: 16 }} />
    <Typography>
      <Box fontStyle="italic" fontSize={14} style={{ opacity: '0.8' }}>
        Built and maintained by{' '}
        <Link target="_blank" href="https://twitter.com/aakashlpin">
          Aakash Goel
        </Link>{' '}
        |{' '}
        <Link target="_blank" href="https://www.buymeacoffee.com/aakashgoel">
          Buy me a coffee ☕️
        </Link>{' '}
        to support this work. | <Link href="mailto:me@aakashgoel.com">Get in touch</Link> for any
        queries, suggestions, or feedback. | Read more about SignalX{' '}
        <Link target="_blank" href="https://www.notion.so/SignalX-5a43061a2b1f4e3ea10843f65186c30d">
          here
        </Link>
        .
      </Box>
    </Typography>
  </div>
);

export default Footer;
