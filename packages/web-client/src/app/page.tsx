import Link from 'next/link';

import styles from './page.module.scss';

export default function HomePage() {
  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Realtime AI Collaboration</h1>
        <p className={styles.subtitle}>
          Collaborative document editing with AI-powered writing suggestions
        </p>
        <div className={styles.actions}>
          <Link href='/login' className={styles.primaryButton}>
            Sign In
          </Link>
          <Link href='/register' className={styles.secondaryButton}>
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}
