import React from 'react';
import Head from 'next/head';

export default function SupportPage() {
  return (
    <div style={styles.container}>
      <Head>
        <title>FLIP_AI | SUPPORT_CHANNEL</title>
      </Head>

      <main style={styles.main}>
        <div style={styles.box}>
          <h1 style={styles.title}>› SUPPORT_CHANNEL_ACTIVE</h1>
          <p style={styles.text}>
            If you are experiencing system errors, account issues, or have 
            inquiries regarding FLIP_OS, please contact our relay team below.
          </p>

          <div style={styles.emailContainer}>
            <span style={styles.label}>DIRECT_RELAY:</span>
            <a href="mailto:flipaiappsupport@gmail.com" style={styles.email}>
              flipaiappsupport@gmail.com
            </a>
          </div>

          <div style={styles.footer}>
            <p style={styles.version}>FLIP_PROTOCOL_V1.0.0</p>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#000',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace',
    color: '#10b981',
    padding: '20px',
  },
  main: {
    maxWidth: '500px',
    width: '100%',
  },
  box: {
    border: '1px solid #111',
    padding: '40px',
    backgroundColor: '#050505',
    position: 'relative' as const,
  },
  title: {
    fontSize: '18px',
    letterSpacing: '2px',
    marginBottom: '20px',
    fontWeight: '900',
  },
  text: {
    color: '#555',
    lineHeight: '1.6',
    fontSize: '14px',
    marginBottom: '30px',
  },
  emailContainer: {
    borderLeft: '2px solid #10b981',
    paddingLeft: '15px',
    marginVertical: '20px',
  },
  label: {
    display: 'block',
    fontSize: '10px',
    color: '#333',
    marginBottom: '5px',
  },
  email: {
    color: '#10b981',
    textDecoration: 'none',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  footer: {
    marginTop: '40px',
    borderTop: '1px solid #111',
    paddingTop: '20px',
  },
  version: {
    fontSize: '10px',
    color: '#111',
    textAlign: 'center' as const,
    letterSpacing: '4px',
  },
};