import React, { useState } from 'react';
import { PlusIcon, UserPlusIcon, XIcon } from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useT } from '../../i18n/I18nProvider';
import { StatusChip } from '../../components/ui/StatusChip';
import { useToast } from '../../components/ui/Toast';
import type { Staff as StaffMember } from '../../types/entities';
import { formatDateTime } from '../../lib/format';
export function Staff() {
  const { t } = useT();
  const { showToast } = useToast();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const staff: StaffMember[] = [];
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsInviteModalOpen(false);
      showToast(t('invitationSentSuccess'), 'success');
    }, 800);
  };
  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title={t('nav.staff')}
        subtitle={t('staffSubtitle')}
        actions={
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="inline-flex items-center gap-x-2 rounded-md bg-brand-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          
            <UserPlusIcon className="-ml-0.5 h-5 w-5" aria-hidden="true" />
            {t('inviteStaff')}
          </button>
        } />
      

      <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200">
          <thead className="bg-neutral-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-neutral-900 sm:pl-6">
                {t('nameAndEmail')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                {t('roleLabel')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                {t('field.status')}
              </th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-neutral-900">
                {t('lastSignIn')}
              </th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                <span className="sr-only">{t('colActions')}</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {staff.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-neutral-500">
                  {t('noStaffYet')}
                </td>
              </tr>
            )}
            {staff.map((user) =>
            <tr key={user.id} className="hover:bg-neutral-50">
                <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-6">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-neutral-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-neutral-500">
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                  <span className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-600 ring-1 ring-inset ring-neutral-500/10">
                    {user.role}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                  <StatusChip status={user.active ? 'active' : 'inactive'} />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-neutral-500">
                  {formatDateTime(user.lastSignIn)}
                </td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                  {user.role !== 'OWNER' &&
                <button className="text-danger-600 hover:text-danger-900">
                      {t('deactivate')}
                    </button>
                }
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen &&
      <div
        className="relative z-50"
        aria-labelledby="modal-title"
        role="dialog"
        aria-modal="true">
        
          <div className="fixed inset-0 bg-neutral-900/80 transition-opacity" />
          <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
            <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
              <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
                <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
                  <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-md bg-white text-neutral-400 hover:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
                  
                    <span className="sr-only">{t('action.close')}</span>
                    <XIcon className="h-6 w-6" aria-hidden="true" />
                  </button>
                </div>
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 sm:mx-0 sm:h-10 sm:w-10">
                    <UserPlusIcon
                    className="h-6 w-6 text-brand-600"
                    aria-hidden="true" />
                  
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3
                    className="text-base font-semibold leading-6 text-neutral-900"
                    id="modal-title">
                    
                      {t('inviteStaffMember')}
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-neutral-500">
                        {t('inviteStaffHint')}
                      </p>
                    </div>

                    <form onSubmit={handleInvite} className="mt-6 space-y-4">
                      <div>
                        <label
                        htmlFor="email"
                        className="block text-sm font-medium leading-6 text-neutral-900">
                        
                          {t('emailAddress')}
                        </label>
                        <input
                        type="email"
                        id="email"
                        required
                        className="mt-2 block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                      
                      </div>

                      <div>
                        <label
                        htmlFor="role"
                        className="block text-sm font-medium leading-6 text-neutral-900">
                        
                          {t('roleLabel')}
                        </label>
                        <select
                        id="role"
                        className="mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-neutral-900 ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-brand-600 sm:text-sm sm:leading-6">
                        
                          <option value="STAFF">{t('roleStaffStandard')}</option>
                          <option value="MANAGER">
                            {t('roleManagerApprove')}
                          </option>
                        </select>
                      </div>

                      <div className="mt-8 sm:flex sm:flex-row-reverse">
                        <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex w-full justify-center rounded-md bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 sm:ml-3 sm:w-auto disabled:opacity-50">
                        
                          {isSubmitting ? t('sending') : t('sendInvitation')}
                        </button>
                        <button
                        type="button"
                        onClick={() => setIsInviteModalOpen(false)}
                        className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 hover:bg-neutral-50 sm:mt-0 sm:w-auto">
                        
                          {t('action.cancel')}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

}