import React, { useCallback, useState, useSyncExternalStore } from 'react';
import { ClockIcon, MinusIcon } from 'lucide-react';
import {
  advanceDays,
  advanceMonths,
  clearManualDate,
  fromDatetimeLocalValue,
  getDevTimeSnapshot,
  getRealDate,
  getSystemDate,
  isManualDateEnabled,
  setManualDate,
  subscribeDevTime,
  toDatetimeLocalValue,
} from '../../lib/time/devTime';
import { getDb } from '../../lib/local-db/localDb';
import { syncAllFixedInstallmentLateFees } from '../../lib/local-db/fixedInstallmentSync';
import { syncAllInterestOnlyLoans } from '../../lib/local-db/interestOnlySync';
import { isDevEnvironment } from '../../lib/env/isDevEnvironment';

const PANEL_COLLAPSED_KEY = 'mam-dev-time-panel-collapsed';

function resyncFinanceForSimulatedDate(): void {
  const db = getDb();
  syncAllInterestOnlyLoans(db);
  syncAllFixedInstallmentLateFees(db);
}

function formatClock(date: Date): string {
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function readPanelCollapsed(): boolean {
  try {
    const raw = localStorage.getItem(PANEL_COLLAPSED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

function writePanelCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(PANEL_COLLAPSED_KEY, String(collapsed));
  } catch {
    /* ignore */
  }
}

export function DevTimePanel() {
  if (!isDevEnvironment()) {
    return null;
  }

  return <DevTimePanelInner />;
}

function DevTimePanelInner() {
  useSyncExternalStore(subscribeDevTime, getDevTimeSnapshot, getDevTimeSnapshot);

  const simulated = getSystemDate();
  const real = getRealDate();
  const testActive = isManualDateEnabled();

  const [collapsed, setCollapsed] = useState(readPanelCollapsed);
  const [inputValue, setInputValue] = useState(() =>
    toDatetimeLocalValue(simulated)
  );

  const setExpanded = useCallback((expanded: boolean) => {
    const nextCollapsed = !expanded;
    setCollapsed(nextCollapsed);
    writePanelCollapsed(nextCollapsed);
  }, []);

  const refreshInput = useCallback(() => {
    setInputValue(toDatetimeLocalValue(getSystemDate()));
  }, []);

  const applyDate = useCallback(() => {
    const parsed = fromDatetimeLocalValue(inputValue);
    if (!parsed) return;
    setManualDate(parsed);
    resyncFinanceForSimulatedDate();
    refreshInput();
  }, [inputValue, refreshInput]);

  const resetToReal = useCallback(() => {
    clearManualDate();
    resyncFinanceForSimulatedDate();
    refreshInput();
  }, [refreshInput]);

  const onAdvanceDays = useCallback(
    (days: number) => {
      advanceDays(days);
      resyncFinanceForSimulatedDate();
      refreshInput();
    },
    [refreshInput]
  );

  const onAdvanceMonths = useCallback(
    (months: number) => {
      advanceMonths(months);
      resyncFinanceForSimulatedDate();
      refreshInput();
    },
    [refreshInput]
  );

  const label = testActive ? 'TEST TIME' : 'DEV TIME';

  if (collapsed) {
    return (
      <div
        className="no-print fixed bottom-4 right-4 z-30 flex flex-col items-end gap-1"
        role="region"
        aria-label="Developer time simulation (collapsed)"
      >
        {testActive && (
          <span
            className="rounded-full bg-amber-600/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
            title="Simulated date is active"
          >
            Simulated date
          </span>
        )}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-md backdrop-blur-sm transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
          style={{
            borderColor: testActive ? '#f59e0b' : '#a3a3a3',
            background: testActive
              ? 'rgba(255, 251, 235, 0.88)'
              : 'rgba(250, 250, 250, 0.82)',
            color: testActive ? '#92400e' : '#404040',
            opacity: testActive ? 0.95 : 0.78,
          }}
          aria-expanded={false}
          title="Open developer time panel"
        >
          <ClockIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>{label}</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="no-print dev-time-panel fixed bottom-4 right-4 z-30 flex max-h-[min(85vh,calc(100vh-2rem))] w-[min(100vw-1.5rem,300px)] flex-col overflow-hidden rounded-lg border text-sm shadow-xl"
      style={{
        borderColor: testActive ? '#f59e0b' : '#d4d4d4',
        background: testActive ? '#fffbeb' : '#fafafa',
      }}
      role="region"
      aria-label="Developer time simulation"
    >
      <div
        className="flex shrink-0 items-center justify-between gap-2 rounded-t-lg px-3 py-2 font-bold tracking-wide"
        style={{
          background: testActive ? '#d97706' : '#525252',
          color: '#fff',
        }}
      >
        <span className="truncate text-xs sm:text-sm">
          {testActive ? 'TEST MODE ACTIVE' : 'Dev time (simulation)'}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="shrink-0 rounded p-0.5 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Minimize developer time panel"
          title="Minimize"
        >
          <MinusIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain p-3">
        {testActive && (
          <p className="rounded border border-amber-300 bg-amber-100/80 px-2 py-1 text-center text-[10px] font-bold uppercase tracking-wide text-amber-900">
            Simulated date
          </p>
        )}

        <div>
          <div className="text-xs font-semibold uppercase text-amber-800">
            Simulated
          </div>
          <div className="break-words font-mono text-xs">{formatClock(simulated)}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-neutral-500">
            Real system
          </div>
          <div className="break-words font-mono text-xs text-neutral-600">
            {formatClock(real)}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-neutral-700">
            Set date &amp; time
          </span>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        </label>

        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-500"
            onClick={applyDate}
          >
            Apply
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs font-medium hover:bg-neutral-50"
            onClick={resetToReal}
          >
            Reset to Real Time
          </button>
        </div>

        <div className="flex flex-wrap gap-1 border-t border-amber-200/80 pt-2">
          <span className="w-full text-xs text-neutral-600">Quick advance</span>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs hover:bg-neutral-50"
            onClick={() => onAdvanceDays(1)}
          >
            +1 day
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs hover:bg-neutral-50"
            onClick={() => onAdvanceDays(7)}
          >
            +7 days
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs hover:bg-neutral-50"
            onClick={() => onAdvanceDays(30)}
          >
            +30 days
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs hover:bg-neutral-50"
            onClick={() => onAdvanceMonths(1)}
          >
            +1 month
          </button>
          <button
            type="button"
            className="rounded border border-neutral-300 bg-white px-1.5 py-0.5 text-xs hover:bg-neutral-50"
            onClick={() => onAdvanceMonths(3)}
          >
            +3 months
          </button>
        </div>
      </div>
    </div>
  );
}
