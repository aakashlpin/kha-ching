import { Divider, Link, Typography } from '@material-ui/core'
import Box from '@material-ui/core/Box'

const Footer = () => (
  <div>
    <Divider style={{ marginBottom: 16 }} />
    <Typography>
      <Box fontStyle='italic' fontSize={14} style={{ opacity: '0.8' }}>
        Built and maintained by{' '}
        <Link target='_blank' rel='noreferrer' href='https://twitter.com/aakashlpin' style={{ display: 'inline' }}>
          Aakash Goel
        </Link>{' '}
        |{' '}
        <Link target='_blank' rel='noreferrer' href='https://www.buymeacoffee.com/aakashgoel'>
          Buy me a coffee ☕️
        </Link>{' '}
        to support this work. | <Link href='mailto:me@aakashgoel.com'>Get in touch</Link> for any
        queries, suggestions, or feedback. | All about{' '}
        <Link target='_blank' rel='noreferrer' href='https://signalx.club'>
          SignalX
        </Link>
        .
      </Box>
    </Typography>
  </div>
)

export default Footer
