import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { useDemoDb } from '../../lib/local-db/useDemoDb';
import { createCustomer, getCustomer, updateCustomer } from '../../lib/local-db/repositories';

export function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { showToast } = useToast();
  const db = useDemoDb();
  const isEdit = Boolean(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    nic: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (!isEdit || !id) return;
    const customer = getCustomer(id, db);
    if (customer) {
      setFormData({
        name: customer.name,
        nic: customer.nic,
        phone: customer.phone,
        address: customer.address,
      });
    }
  }, [id, isEdit, db]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const payload = {
      full_name: formData.name,
      nic: formData.nic,
      phone: formData.phone,
      address: formData.address,
    };
    if (isEdit && id) {
      updateCustomer(id, payload, db);
    } else {
      createCustomer(payload, db);
    }
    setIsSubmitting(false);
    showToast(
      isEdit ? 'Customer updated successfully' : 'Customer saved successfully',
      'success'
    );
    navigate(isEdit && id ? `/customers/${id}` : '/customers');
  };

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <button
        type="button"
        onClick={() =>
          navigate(isEdit && id ? `/customers/${id}` : '/customers')
        }
        className="flex items-center text-sm font-medium text-neutral-500 hover:text-neutral-700 mb-6">
        <ArrowLeftIcon className="mr-1 h-4 w-4" /> Back to Customers
      </button>

      <PageHeader
        title={isEdit ? 'Edit Customer' : 'Add Customer'}
        subtitle={
          isEdit
            ? 'Update customer profile details.'
            : 'Create a new customer profile.'
        }
      />

      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm ring-1 ring-neutral-200 rounded-xl overflow-hidden">
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="name"
                className="block text-sm font-medium leading-6 text-neutral-900">
                Full Name *
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="nic"
                className="block text-sm font-medium leading-6 text-neutral-900">
                NIC Number *
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  name="nic"
                  id="nic"
                  required
                  value={formData.nic}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 tabular-nums"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium leading-6 text-neutral-900">
                Phone Number *
              </label>
              <div className="mt-2">
                <input
                  type="tel"
                  name="phone"
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+94 7X XXX XXXX"
                  className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6 tabular-nums"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium leading-6 text-neutral-900">
                Address *
              </label>
              <div className="mt-2">
                <textarea
                  id="address"
                  name="address"
                  rows={3}
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-neutral-200 bg-neutral-50 px-6 py-4 flex items-center justify-end gap-x-4">
          <button
            type="button"
            onClick={() =>
              navigate(isEdit && id ? `/customers/${id}` : '/customers')
            }
            className="text-sm font-semibold leading-6 text-neutral-900 hover:text-neutral-700">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand-600 px-6 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-70">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Customer' : 'Save Customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
