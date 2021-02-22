/* eslint-disable jsx-a11y/accessible-emoji */
import Head from 'next/head';

import styles from '../styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Kha-ching</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Welcome to Kha-ching! ⚡️</h1>

        <p className={styles.description}>
          Get started by <a href="/api/login">Logging in with Kite</a>
        </p>
      </main>
    </div>
  );
}
