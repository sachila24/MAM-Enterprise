import React from 'react';

const LOGO_SRC = '/assets/mam-logo.svg';

export interface MamLogoProps {
  /** Pixel width/height of the square logo area */
  size?: number;
  className?: string;
  /** Screen vs print sizing hints */
  variant?: 'app' | 'print';
}

export function MamLogo({
  size = 40,
  className = '',
  variant = 'app',
}: MamLogoProps) {
  const printClass = variant === 'print' ? 'mam-logo-print' : '';
  return (
    <img
      src={LOGO_SRC}
      alt="MAM Trading"
      width={size}
      height={size}
      className={`mam-logo object-contain shrink-0 ${printClass} ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}

export interface MamDocumentHeaderProps {
  title: string;
  children?: React.ReactNode;
}

/** Shared print header — logo, company lines, document title, optional meta */
export function MamDocumentHeader({ title, children }: MamDocumentHeaderProps) {
  return (
    <header className="mam-bill-header">
      <div className="mam-bill-logo-row">
        <MamLogo size={64} variant="print" />
      </div>
      <h1 className="mam-bill-company">MAM TRADING</h1>
      <p className="mam-bill-company-line">No.47, Galmaduwa, Mahailuppallama</p>
      <p className="mam-bill-company-line">දුරකථන: 071 593 1681 | 071 209 9416</p>
      <p className="mam-bill-title">{title}</p>
      {children}
    </header>
  );
}
