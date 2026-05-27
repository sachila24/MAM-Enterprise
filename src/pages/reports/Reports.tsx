import React, { useMemo, useState } from 'react';
import {
  DownloadIcon,
  FileTextIcon,
  ClockIcon } from
'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DatePicker } from '../../components/ui/DatePicker';
import { formatDateTime } from '../../lib/format';
import { useT } from '../../i18n/I18nProvider';
import {
  formatMessage,
  reportCsvHeaderLine,
  type ReportCsvType,
} from '../../lib/i18n/messages';
import {
  createUtf8CsvBlob,
  generateReportCsvRows,
} from '../../lib/reports/reportCsv';

const REPORT_CATEGORY_IDS = [
  'collections',
  'income',
  'loans',
  'bikes',
  'guarantees',
  'expenses',
] as const;

interface RecentDownload {
  id: number;
  name: string;
  date: string;
}

function currentMonthValue(): string {
  return new Date().toISOString().slice(0, 7);
}

export function Reports() {
  const { t, language } = useT();
  const reportCategories = useMemo(
    () =>
      REPORT_CATEGORY_IDS.map((id) => ({
        id,
        label:
          id === 'collections'
            ? t('reportCategoryCollections')
            : id === 'income'
              ? t('reportCategoryIncome')
              : id === 'loans'
              ? t('reportCategoryLoans')
              : id === 'bikes'
                ? t('reportCategoryBikes')
                : id === 'guarantees'
                  ? t('reportCategoryGuarantees')
                  : t('reportCategoryExpenses'),
        icon: FileTextIcon,
      })),
    [t]
  );
  const recentDownloads: RecentDownload[] = [];
  const [activeCategory, setActiveCategory] = useState('collections');
  const [isGenerating, setIsGenerating] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectionsMonth, setCollectionsMonth] = useState(currentMonthValue);
  const [incomeMonth, setIncomeMonth] = useState(currentMonthValue);
  const [expensesMonth, setExpensesMonth] = useState(currentMonthValue);

  const downloadCsv = (
    reportType: ReportCsvType,
    filename: string,
    options: { date?: string; month?: string } = {}
  ) => {
    const header = reportCsvHeaderLine(reportType, language);
    const rows = generateReportCsvRows(reportType, {
      date: options.date,
      month: options.month,
      language,
    });
    const generated = formatMessage(
      'generatedOn',
      { date: new Date().toLocaleString() },
      language
    );
    const body =
      rows.length > 0
        ? `${header}\n${rows.join('\n')}`
        : `${header}\n${generated},${t('noDataAvailable')}`;
    const blob = createUtf8CsvBlob(body);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerate = (
    reportType: ReportCsvType = 'dailyCollections',
    options: { date?: string; month?: string } = {}
  ) => {
    setIsGenerating(true);
    try {
      const suffix = options.month ?? options.date ?? date;
      downloadCsv(reportType, `mam-report-${reportType}-${suffix}.csv`, options);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('nav.reports')}
        subtitle={t('reportsSubtitle')} />
      

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
                      {t('dailyReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('dailyReportHint')}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        {t('selectDate')}
                      </label>
                      <DatePicker
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <button
                    onClick={() => handleGenerate('dailyCollections', { date })}
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5" />
                      {isGenerating ? t('generating') : t('downloadCSV')}
                    </button>
                  </div>

                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('monthlyReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('monthlyReportHint')}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        {t('selectMonth')}
                      </label>
                      <input
                      type="month"
                      value={collectionsMonth}
                      onChange={(e) => setCollectionsMonth(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                    </div>
                    <button
                    onClick={() =>
                      handleGenerate('monthlyCollections', {
                        month: collectionsMonth,
                      })
                    }
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {isGenerating ? t('generating') : t('downloadCSV')}
                    </button>
                  </div>
                </div>
              }

              {activeCategory === 'income' &&
              <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('dailyIncomeReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('dailyIncomeReportHint')}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        {t('selectDate')}
                      </label>
                      <DatePicker
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                      />
                    </div>
                    <button
                    onClick={() => handleGenerate('dailyIncome', { date })}
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                      <DownloadIcon className="-ml-0.5 h-5 w-5" />
                      {isGenerating ? t('generating') : t('downloadCSV')}
                    </button>
                  </div>

                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('monthlyIncomeReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('monthlyIncomeReportHint')}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        {t('selectMonth')}
                      </label>
                      <input
                      type="month"
                      value={incomeMonth}
                      onChange={(e) => setIncomeMonth(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                    </div>
                    <button
                    onClick={() =>
                      handleGenerate('monthlyIncome', { month: incomeMonth })
                    }
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {isGenerating ? t('generating') : t('downloadCSV')}
                    </button>
                  </div>

                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('incomeSummaryReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('incomeSummaryReportHint')}
                    </p>
                    <div className="mt-4 max-w-xs">
                      <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                        {t('selectMonth')}
                      </label>
                      <input
                      type="month"
                      value={incomeMonth}
                      onChange={(e) => setIncomeMonth(e.target.value)}
                      className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                    </div>
                    <button
                    onClick={() =>
                      handleGenerate('incomeSummary', { month: incomeMonth })
                    }
                    disabled={isGenerating}
                    className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {isGenerating ? t('generating') : t('downloadCSV')}
                    </button>
                  </div>
                </div>
              }

              {activeCategory === 'loans' &&
              <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('activeLoansReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('activeLoansReportHint')}
                    </p>
                    <button
                    onClick={() => handleGenerate('activeLoans')}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {t('downloadCSV')}
                    </button>
                  </div>
                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('overdueLoansReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('overdueLoansReportHint')}
                    </p>
                    <button
                    onClick={() => handleGenerate('overdueLoans')}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {t('downloadCSV')}
                    </button>
                  </div>
                  <div className="border-t border-neutral-200 pt-8">
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {t('completedLoansReport')}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">
                      {t('completedLoansReportHint')}
                    </p>
                    <button
                    onClick={() => handleGenerate('completedLoans')}
                    disabled={isGenerating}
                    className="mt-4 inline-flex items-center gap-x-2 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 disabled:opacity-50">
                    
                      <DownloadIcon className="-ml-0.5 h-5 w-5 text-neutral-400" />
                      {t('downloadCSV')}
                    </button>
                  </div>
                </div>
              }

              {activeCategory === 'bikes' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {t('bikeStockReport')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('bikeStockReportHint')}
                  </p>
                  <button
                  onClick={() => handleGenerate('bikeStock')}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    {t('downloadCSV')}
                  </button>
                </div>
              }

              {activeCategory === 'guarantees' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {t('guaranteeReports')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('guaranteeReportsHint')}
                  </p>
                  <button
                  onClick={() => handleGenerate('guaranteesHeld')}
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    {t('downloadCSV')}
                  </button>
                </div>
              }

              {activeCategory === 'expenses' &&
              <div>
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {t('expenseReports')}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-500">
                    {t('expenseReportsHint')}
                  </p>
                  <div className="mt-4 max-w-xs">
                    <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                      {t('selectMonth')}
                    </label>
                    <input
                    type="month"
                    value={expensesMonth}
                    onChange={(e) => setExpensesMonth(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                  
                  </div>
                  <button
                  onClick={() =>
                    handleGenerate('expenses', { month: expensesMonth })
                  }
                  disabled={isGenerating}
                  className="mt-6 inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 disabled:opacity-50">
                  
                    <DownloadIcon className="-ml-0.5 h-5 w-5" />
                    {t('downloadCSV')}
                  </button>
                </div>
              }
            </div>
          </div>
        </div>

        {/* Far Right: Recent Downloads */}
        <div className="lg:col-span-3">
          <h3 className="text-sm font-medium text-neutral-900 mb-4">
            {t('recentDownloads')}
          </h3>
          <ul className="space-y-3">
            {recentDownloads.length === 0 && (
              <li className="text-sm text-neutral-500">
                {t('noDownloadsYet')}
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
