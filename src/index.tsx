import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getDbSnapshot, initLocalDemoDb } from './lib/local-db/localDb';
import { syncAllInterestOnlyLoans } from './lib/local-db/interestOnlySync';

initLocalDemoDb();
syncAllInterestOnlyLoans(getDbSnapshot());

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
