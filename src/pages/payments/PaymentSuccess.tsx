import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircleIcon, PrinterIcon, PlusIcon, HomeIcon } from 'lucide-react';
export function PaymentSuccess() {
  const navigate = useNavigate();
  // Mock receipt number
  const receiptNo = `RCP-2026-${Math.floor(100000 + Math.random() * 900000)}`;
  return (
    <div className="max-w-2xl mx-auto pt-12">
      <div className="bg-white shadow-sm ring-1 ring-neutral-200 sm:rounded-lg p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-100 mb-6">
          <CheckCircleIcon
            className="h-10 w-10 text-success-600"
            aria-hidden="true" />
          
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 mb-2">
          Payment Recorded Successfully
        </h2>

        <p className="text-neutral-500 mb-8">
          Receipt{' '}
          <span className="font-medium text-neutral-900 tabular-nums">
            {receiptNo}
          </span>{' '}
          has been generated.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
            <PrinterIcon
              className="-ml-0.5 h-5 w-5 text-neutral-400"
              aria-hidden="true" />
            
            Print Receipt
          </button>

          <button
            type="button"
            onClick={() => navigate('/payments/new')}
            className="inline-flex items-center justify-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
            <PlusIcon
              className="-ml-0.5 h-5 w-5 text-neutral-400"
              aria-hidden="true" />
            
            Record Another
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
            
            <HomeIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>);

}