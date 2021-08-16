/* eslint-disable jsx-a11y/accessible-emoji */
import Head from 'next/head'

import Footer from '../components/Footer'
import styles from '../styles/Home.module.css'

export default function Home () {
  return (
    <div className={styles.container}>
      <Head>
        <title>SignalX</title>
        <link rel='icon' href='/favicon.ico' />
      </Head>

      <main className={styles.main}>
        {/* eslint-disable */}
        <img src='/logo.png' width='300' alt='SignalX' />

        <p className={styles.description}>
          <a href='/api/login'>Continue with Kite</a>
        </p>
      </main>
    </div>
  )
}
