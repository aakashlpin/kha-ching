import { Divider, Link, Typography } from '@material-ui/core'
import Box from '@material-ui/core/Box'

const Footer = () => (
  <div>
    <Divider style={{ marginBottom: 16 }} />
    <Typography>
      <Box fontStyle='italic' fontSize={14} style={{ opacity: '0.8' }}>
        <Link href='mailto:help@signalx.trade'>Get in touch</Link> for any
        queries, suggestions, or feedback. | Learn all about{' '}
        <Link target='_blank' rel='noreferrer' href='https://signalx.club'>
          SignalX
        </Link>
        . | By using SignalX you agree to the <Link target='_blank' rel='noreferrer' href='https://signalx.club/SignalX-User-Agreement-ac65c4c19279457ba7d133fdcaf2b21d'>terms and conditions.</Link>
      </Box>
    </Typography>
  </div>
)

export default Footer
