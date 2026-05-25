import { EyeIcon, PrinterIcon, RotateCwIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../i18n/I18nProvider';

interface DocumentRowActionsProps {
  documentId: string;
  printCount: number;
}

export function DocumentRowActions({
  documentId,
  printCount,
}: DocumentRowActionsProps) {
  const { t } = useT();
  const navigate = useNavigate();
  const isOriginal = printCount === 0;

  return (
    <div className="flex justify-end gap-1">
      <button
        type="button"
        onClick={() => navigate(`/documents/${documentId}`)}
        className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-brand-700"
        title={t('action.view')}
      >
        <EyeIcon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t('action.view')}</span>
      </button>
      {isOriginal ? (
        <button
          type="button"
          onClick={() => navigate(`/documents/${documentId}?print=1`)}
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-brand-700"
          title={t('docActionPrint')}
        >
          <PrinterIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('docActionPrint')}</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate(`/documents/${documentId}?print=1`)}
          className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-brand-700"
          title={t('docActionReprint')}
        >
          <RotateCwIcon className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">{t('docActionReprint')}</span>
        </button>
      )}
    </div>
  );
}
