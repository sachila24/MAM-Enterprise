import React, { useState } from 'react';
import {
  DownloadIcon,
  FileTextIcon,
  CalendarIcon,
  ClockIcon } from
'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DatePicker } from '../../components/ui/DatePicker';
import { formatDateTime } from '../../lib/format';
const reportCategories = [
{
  id: 'collections',
  label: 'Collections',
  icon: FileTextIcon
},
{
  id: 'loans',
  label: 'Loans & Risk',
  icon: FileTextIcon
},
{
  id: 'bikes',
  label: 'Bike Stock',
  icon: FileTextIcon
},
{
  id: 'guarantees',
  label: 'Guarantees',
  icon: FileTextIcon
},
{
  id: 'expenses',
  label: 'Expenses',
  icon: FileTextIcon
}];

interface RecentDownload {
  id: number;
  name: string;
  date: string;
}

export function Reports() {
  const recentDownloads: RecentDownload[] = [];
  const [activeCategory, setActiveCategory] = useState('collections');
  const [isGenerating, setIsGenerating] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      // Simulate download
    }, 1500);
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Reports"
        subtitle="Download CSV summaries for day-to-day office work" />
      

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Rail: Categories */}
        <div className="lg:col-span-3">
          <nav className="flex flex-col space-y-1">
            {reportCategories.map((cat) =>
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                  flex items-center gap-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${activeCategory === cat.id ? 'bg-brand-50 text-brand-700' : 'text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900'}
                `}>
              
                <cat.icon
                className={`h-5 w-5 shrink-0 ${activeCategory === cat.id ? 'text-brand-700' : 'text-neutral-400'}`} />
              
                {cat.label}
              </button>
            )}
          </nav>
        </div>

        {/* Right Pane: Options & Generate */}
        <div className="lg:col-span-6">
          <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
            <div className="p-6 sm:p-8">
              {activeCategory === 'collections' &&
              <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Daily Collection Report
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Payments received on the selected date.
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        Select Date
                      </label>
                      <DatePicker value={date} onChange={setDate} />
                    </div>
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5" />
                      {isGenerating ? 'Generating...' : 'Download CSV'}
                    </button>
                  </div>

                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Monthly Collection Report
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Totals for the selected month.
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        Select Month
                      </label>
                      <input
                      type="month"
                      className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                      defaultValue="2026-05" />
                    
                    </div>
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {isGenerating ? 'Generating...' : 'Download CSV'}
                    </button>
                  </div>
                </div>
              }

              {activeCategory === 'loans' &&
              <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Active Loans
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      All loans that are still running.
                    </p>
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      Download CSV
                    </button>
                  </div>
                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Overdue Loans
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Loans past due that still have a balance.
                    </p>
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      Download CSV
                    </button>
                  </div>
                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Completed Loans
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      Loans fully paid or closed as completed.
                    </p>
                    <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      Download CSV
                    </button>
                  </div>
                </div>
              }

              {activeCategory === 'bikes' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Bike Stock
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Current inventory and key numbers.
                  </p>
                  <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    Download CSV
                  </button>
                </div>
              }

              {activeCategory === 'guarantees' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Guarantee Reports
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Guarantees held: items you are still holding for loans.
                  </p>
                  <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    Download CSV
                  </button>
                </div>
              }

              {activeCategory === 'expenses' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    Expense Reports
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    Expenses: spending by date and category.
                  </p>
                  <div className="mt-4 max-w-xs">
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                      Select Month
                    </label>
                    <input
                    type="month"
                    className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                    defaultValue="2026-05" />
                  
                  </div>
                  <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    Download CSV
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        {/* Far Right: Recent Downloads */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">
            Recent Downloads
          </h3>
          <ul className="space-y-3">
            {recentDownloads.length === 0 && (
              <li className="text-sm text-neutral-500">
                No downloads yet. Generate a report to see it here.
              </li>
            )}
            {recentDownloads.map((dl) =>
            <li
              key={dl.id}
              className="bg-white p-3 rounded-lg shadow-sm ring-1 ring-neutral-200 flex items-start gap-3">
              
                <FileTextIcon className="h-5 w-5 text-neutral-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {dl.name}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-neutral-500">
                    <ClockIcon className="h-3 w-3" />
                    {formatDateTime(dl.date)}
                  </div>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>);

}