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
        <h1 className={styles.title}>
          Welcome to <a href="https://nextjs.org">Kha-ching!</a>
        </h1>

        <p className={styles.description}>
          Get started by <a href="/api/login">Logging in with Kite</a>
        </p>
      </main>
    </div>
  );
}
