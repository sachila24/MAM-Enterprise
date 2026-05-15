import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useT } from '../../i18n/I18nProvider';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { DatePicker } from '../../components/ui/DatePicker';
import { useToast } from '../../components/ui/Toast';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { createExpense } from '../../lib/local-db/repositories';
import type { DbExpense } from '../../lib/local-db/types';

export function AddExpense() {
  const navigate = useNavigate();
  const { t } = useT();
  const { showToast } = useToast();
  const db = useDemoDb();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: 0,
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    createExpense(
      {
        category: formData.category as DbExpense['category'],
        amount: formData.amount,
        expense_date: formData.date,
        notes: formData.notes,
      },
      db
    );
    setIsSubmitting(false);
    showToast('Expense added successfully', 'success');
    navigate('/expenses');
  };
  const isValid = formData.amount > 0 && formData.notes.trim() !== '';
  return (
    <div className="max-w-2xl mx-auto pb-24">
      <PageHeader
        title="Add Expense"
        subtitle="Record money the business spent" />
      

      <div className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              What was this for? *
            </label>
            <input
              type="text"
              id="notes"
              value={formData.notes}
              onChange={(e) =>
              setFormData({
                ...formData,
                notes: e.target.value
              })
              }
              placeholder="e.g. Workshop repair supplies"
              className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
            
          </div>

          <div>
            <CurrencyInput
              label="Amount *"
              value={formData.amount}
              onChange={(val) =>
              setFormData({
                ...formData,
                amount: val
              })
              } />
            
          </div>

          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
            <div>
              <label
                htmlFor="category"
                className="block text-sm font-medium leading-6 text-neutral-900">
                
                Category
              </label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value
                })
                }
                className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                
                <option value="RENT">Rent</option>
                <option value="UTILITIES">Utilities</option>
                <option value="SALARIES">Salaries</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="FUEL">Fuel</option>
                <option value="SUPPLIES">Supplies</option>
                <option value="MARKETING">Marketing</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium leading-6 text-neutral-900 mb-2">
                Date
              </label>
              <DatePicker
                value={formData.date}
                onChange={(val) =>
                setFormData({
                  ...formData,
                  date: val
                })
                } />
              
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex justify-end gap-x-3">
          <button
            type="button"
            onClick={() => navigate('/expenses')}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
            
            {isSubmitting ? 'Saving...' : 'Save expense'}
          </button>
        </div>
      </div>
    </div>);

}