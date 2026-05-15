import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useT } from '../../i18n/I18nProvider';
import { CurrencyInput } from '../../components/ui/CurrencyInput';
import { useToast } from '../../components/ui/Toast';
import type { Bike } from '../../types/entities';
export function BikeForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useT();
  const { showToast } = useToast();
  const isEdit = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    model: '',
    chassisNo: '',
    engineNo: '',
    year: new Date().getFullYear(),
    color: '',
    costPrice: 0,
    sellingPrice: 0,
    status: 'in_stock',
    notes: ''
  });
  useEffect(() => {
    if (isEdit && id) {
      const bikes: Bike[] = [];
      const bike = bikes.find((b) => b.id === id);
      if (bike) {
        setFormData({
          model: bike.model,
          chassisNo: bike.chassisNo,
          engineNo: bike.engineNo,
          year: bike.year,
          color: bike.color,
          costPrice: bike.costPrice,
          sellingPrice: bike.sellingPrice,
          status: bike.status,
          notes: ''
        });
      }
    }
  }, [id, isEdit]);
  const handleChange = (
  e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>

  {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      showToast(
        isEdit ? 'Bike updated successfully' : 'Bike added successfully',
        'success'
      );
      navigate('/bikes');
    }, 800);
  };
  return (
    <div className="max-w-2xl mx-auto pb-24">
      <PageHeader
        title={isEdit ? 'Edit bike details' : 'Add bike to stock'}
        subtitle={
        isEdit ?
        'Update information for this bike' :
        'Enter details for the new inventory item'
        } />
      

      <div className="space-y-10 divide-y divide-neutral-200">
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 pt-8 first:pt-0">
          <div className="sm:col-span-6">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              Identification
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Basic details about the motorcycle.
            </p>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="model"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Model *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="model"
                id="model"
                value={formData.model}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
              
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="chassisNo"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Chassis Number *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="chassisNo"
                id="chassisNo"
                value={formData.chassisNo}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 font-mono" />
              
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="engineNo"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Engine Number *
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="engineNo"
                id="engineNo"
                value={formData.engineNo}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 font-mono" />
              
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="year"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Year
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="year"
                id="year"
                value={formData.year}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 tabular-nums" />
              
            </div>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="color"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Color
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="color"
                id="color"
                value={formData.color}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
              
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 pt-8">
          <div className="sm:col-span-6">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              Financials
            </h2>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Pricing information for this unit.
            </p>
          </div>

          <div className="sm:col-span-3">
            <CurrencyInput
              label="Cost Price"
              value={formData.costPrice}
              onChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                costPrice: val
              }))
              } />
            
          </div>

          <div className="sm:col-span-3">
            <CurrencyInput
              label="Selling Price *"
              value={formData.sellingPrice}
              onChange={(val) =>
              setFormData((prev) => ({
                ...prev,
                sellingPrice: val
              }))
              } />
            
          </div>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6 pt-8">
          <div className="sm:col-span-6">
            <h2 className="text-base font-semibold leading-7 text-neutral-900">
              Status & Notes
            </h2>
          </div>

          <div className="sm:col-span-3">
            <label
              htmlFor="status"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Status
            </label>
            <div className="mt-2">
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6">
                
                <option value="in_stock">In Stock</option>
                <option value="sold">Sold</option>
                <option value="held">Held</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-6">
            <label
              htmlFor="notes"
              className="block text-sm font-medium leading-6 text-neutral-900">
              
              Notes
            </label>
            <div className="mt-2">
              <textarea
                id="notes"
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
              
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-neutral-200 p-4 z-10">
        <div className="max-w-2xl mx-auto flex justify-end gap-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50">
            
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50">
            
            {isSubmitting ? 'Saving...' : 'Save bike'}
          </button>
        </div>
      </div>
    </div>);

}