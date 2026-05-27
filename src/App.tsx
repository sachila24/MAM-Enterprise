import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { I18nProvider } from './i18n/I18nProvider';
import { FormatModeSync } from './components/layout/FormatModeSync';
import { ToastProvider } from './components/ui/Toast';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CustomerList } from './pages/customers/CustomerList';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { CustomerForm } from './pages/customers/CustomerForm';
import { LoansList } from './pages/loans/LoansList';
import { CreateLoan } from './pages/loans/CreateLoan';
import { LoanDetail } from './pages/loans/LoanDetail';
import { EarlySettlement } from './pages/loans/EarlySettlement';
import { PaymentsList } from './pages/payments/PaymentsList';
import { RecordPayment } from './pages/payments/RecordPayment';
import { PaymentSuccess } from './pages/payments/PaymentSuccess';
import { ReceiptsList } from './pages/receipts/ReceiptsList';
import { BikesList } from './pages/bikes/BikesList';
import { BikeForm } from './pages/bikes/BikeForm';
import { BikeDetail } from './pages/bikes/BikeDetail';
import { GuaranteesList } from './pages/guarantees/GuaranteesList';
import { AddGuarantee } from './pages/guarantees/AddGuarantee';
import { GuaranteeDetail } from './pages/guarantees/GuaranteeDetail';
import { ExpensesList } from './pages/expenses/ExpensesList';
import { AddExpense } from './pages/expenses/AddExpense';
import { Reports } from './pages/reports/Reports';
import { Backup } from './pages/admin/Backup';
import { Settings } from './pages/admin/Settings';
import { ActivityLog } from './pages/admin/ActivityLog';
import { DevTimePanel } from './components/dev/DevTimePanel';
import { DocumentsList } from './pages/documents/DocumentsList';
import { DocumentView } from './pages/documents/DocumentView';

export function App() {
  return (
    <I18nProvider>
      <FormatModeSync />
      <ToastProvider>
        <DevTimePanel />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }>
              <Route index element={<Dashboard />} />

              <Route path="customers">
                <Route index element={<CustomerList />} />
                <Route path="new" element={<CustomerForm />} />
                <Route path=":id/edit" element={<CustomerForm />} />
                <Route path=":id" element={<CustomerDetail />} />
              </Route>

              <Route path="loans">
                <Route index element={<LoansList />} />
                <Route path="new" element={<CreateLoan />} />
                <Route path=":id/early-settlement" element={<EarlySettlement />} />
                <Route path=":id" element={<LoanDetail />} />
              </Route>

              <Route path="payments">
                <Route index element={<PaymentsList />} />
                <Route path="new" element={<RecordPayment />} />
                <Route path="success" element={<PaymentSuccess />} />
              </Route>

              <Route path="receipts" element={<ReceiptsList />} />
              <Route path="documents">
                <Route index element={<DocumentsList />} />
                <Route path=":id" element={<DocumentView />} />
              </Route>

              <Route path="bikes">
                <Route index element={<BikesList />} />
                <Route path="new" element={<BikeForm />} />
                <Route path=":id/edit" element={<BikeForm />} />
                <Route path=":id" element={<BikeDetail />} />
              </Route>

              <Route path="guarantees">
                <Route index element={<GuaranteesList />} />
                <Route path="new" element={<AddGuarantee />} />
                <Route path=":id" element={<GuaranteeDetail />} />
              </Route>

              <Route path="expenses">
                <Route index element={<ExpensesList />} />
                <Route path="new" element={<AddExpense />} />
              </Route>

              <Route path="reports" element={<Reports />} />

              <Route path="activity" element={<ActivityLog />} />
              <Route path="backup" element={<Backup />} />
              <Route path="settings" element={<Settings />} />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </I18nProvider>);

}