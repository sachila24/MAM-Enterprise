import { MamDocumentFooter } from './MamLogo';

export type DocumentSignatureVariant = 'two' | 'three';

export interface MamDocumentBottomSectionProps {
  documentLegalNotice: string;
  customerSignature: string;
  guarantorSignature?: string;
  authorizedOfficer: string;
  variant?: DocumentSignatureVariant;
  showEmail?: boolean;
  showLegalNotice?: boolean;
}

function SignatureCell({ label }: { label: string }) {
  return (
    <div className="mam-bill-sig">
      <div className="mam-bill-sig-write-area">
        <div className="mam-bill-sig-line" aria-hidden="true" />
      </div>
      <span className="mam-bill-sig-label">{label}</span>
    </div>
  );
}

/** Shared legal notice, signatures, and vendor footer for all printed MAM bills. */
export function MamDocumentBottomSection({
  documentLegalNotice,
  customerSignature,
  guarantorSignature,
  authorizedOfficer,
  variant = 'two',
  showEmail = true,
  showLegalNotice = true,
}: MamDocumentBottomSectionProps) {
  return (
    <div className="mam-document-bottom">
      {showLegalNotice && documentLegalNotice ? (
        <p className="mam-bill-notice-box">{documentLegalNotice}</p>
      ) : null}
      <div
        className={`mam-bill-signatures${
          variant === 'two' ? ' mam-bill-signatures-two' : ''
        }`}
      >
        <SignatureCell label={customerSignature} />
        {variant === 'three' && guarantorSignature ? (
          <SignatureCell label={guarantorSignature} />
        ) : null}
        <SignatureCell label={authorizedOfficer} />
      </div>
      <MamDocumentFooter showEmail={showEmail} />
    </div>
  );
}
