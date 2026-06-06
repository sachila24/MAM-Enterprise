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
        <div className="mam-bill-sig">
          <div className="mam-bill-sig-line" />
          <span>{customerSignature}</span>
        </div>
        {variant === 'three' && guarantorSignature ? (
          <div className="mam-bill-sig">
            <div className="mam-bill-sig-line" />
            <span>{guarantorSignature}</span>
          </div>
        ) : null}
        <div className="mam-bill-sig">
          <div className="mam-bill-sig-line" />
          <span>{authorizedOfficer}</span>
        </div>
      </div>
      <MamDocumentFooter showEmail={showEmail} />
    </div>
  );
}
