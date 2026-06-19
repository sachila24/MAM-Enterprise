import './index.css';
import './styles/document-print.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { getDbSnapshot, initLocalDemoDb } from './lib/local-db/localDb';
import { syncAllFixedInstallmentLateFees } from './lib/local-db/fixedInstallmentSync';
import { syncAllInterestOnlyLoans } from './lib/local-db/interestOnlySync';
import { initSqliteInfrastructure } from './lib/sqlite/initSqlite';

initLocalDemoDb();
const db = getDbSnapshot();
syncAllInterestOnlyLoans(db);
syncAllFixedInstallmentLateFees(db);

void initSqliteInfrastructure(db);

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
