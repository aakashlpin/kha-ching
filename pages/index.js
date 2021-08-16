import styles from '../styles/Home.module.css'

export default function Home () {
  return (
    <div className={styles.container}>
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
