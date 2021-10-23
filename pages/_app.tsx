import React from 'react'
import '../styles/globals.css'

import CssBaseline from '@material-ui/core/CssBaseline'
import { ThemeProvider } from '@material-ui/core/styles'
import Head from 'next/head'
import { SWRConfig } from 'swr'

import fetch from '../lib/fetchJson'
import theme from '../src/theme'

function MyApp ({ Component, pageProps }) {
  React.useEffect(() => {
    // Remove the server-side injected CSS.
    const jssStyles = document.querySelector('#jss-server-side')
    if (jssStyles) {
      jssStyles?.parentElement?.removeChild(jssStyles)
    }
  }, [])
  return (
    <SWRConfig
      value={{
        fetcher: fetch,
        onError: err => {
          console.error(err)
        }
      }}
    >
      <Head>
        <meta charSet='utf-8' />
        <meta httpEquiv='X-UA-Compatible' content='IE=edge' />
        <meta
          name='viewport'
          content='width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1,user-scalable=no'
        />
        <meta
          name='description'
          content='SignalX is an open source algo trading toolkit for Indian stock markets'
        />
        <meta
          name='keywords'
          content='algo trading, systematic trading, automation, strategies'
        />
        <title>SignalX | Open source Algo trading toolkit</title>

        <link rel='manifest' href='/manifest.json' />
        <link
          href='/icons/favicon-16x16.png'
          rel='icon'
          type='image/png'
          sizes='16x16'
        />
        <link
          href='/icons/favicon-32x32.png'
          rel='icon'
          type='image/png'
          sizes='32x32'
        />
        <link rel='apple-touch-icon' href='/apple-icon.png' />
        <meta name='theme-color' content='#19857b' />
      </Head>
      <ThemeProvider theme={theme}>
        {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
        <CssBaseline />
        <Component {...pageProps} />
      </ThemeProvider>
    </SWRConfig>
  )
}

export default MyApp
