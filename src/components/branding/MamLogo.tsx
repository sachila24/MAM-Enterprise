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
  /** Slightly smaller logo for compact single-page receipts */
  compact?: boolean;
  /** Override default logo size (px) */
  logoSize?: number;
}

/** Print header — logo left, company details right, title below */
export function MamDocumentHeader({
  title,
  children,
  compact = false,
  logoSize: logoSizeProp,
}: MamDocumentHeaderProps) {
  const logoSize = logoSizeProp ?? (compact ? 48 : 52);
  return (
    <header className="mam-bill-header mam-bill-header-split">
      <div className="mam-bill-header-row">
        <div className="mam-bill-header-brand">
          <MamLogo size={logoSize} variant="print" />
        </div>
        <div className="mam-bill-header-info">
          <h1 className="mam-bill-company">MAM TRADING</h1>
          <p className="mam-bill-company-line">No.47, Galmaduwa, Mahailuppallama</p>
          <p className="mam-bill-company-line">දුරකථන: 071 593 1681 | 071 209 9416</p>
        </div>
      </div>
      <p className="mam-bill-title">{title}</p>
      {children}
    </header>
  );
}

export interface MamDocumentFooterProps {
  /** When false, omits the vendor email line (B5 payment receipts). */
  showEmail?: boolean;
}

/** Unobtrusive vendor credit — below signatures on all printed MAM documents */
export function MamDocumentFooter({ showEmail = true }: MamDocumentFooterProps) {
  return (
    <footer className="mam-bill-footer" aria-label="System vendor">
      <p className="mam-bill-footer-line">
        System Developed &amp; Maintained by Sachila Dissanayake
      </p>
      <p className="mam-bill-footer-line">0764608628</p>
      {showEmail && (
        <p className="mam-bill-footer-line">sathmika7@gmail.com</p>
      )}
    </footer>
  );
}
