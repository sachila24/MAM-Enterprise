import type { DisplayMode } from './simpleLabels';

type Bilingual = { en: string; si: string };

const pairs: Record<string, Bilingual> = {
  companyName: { en: 'MAM Trading', si: 'MAM Trading' },
  loanInvoiceTitle: {
    en: 'Loan Agreement / Bill',
    si: 'ණය ගිවිසුම් බිල',
  },
  paymentReceiptTitle: { en: 'Payment Receipt', si: 'ගෙවීම් ලදුපත' },
  loanReleaseTitle: {
    en: 'Loan Release Note',
    si: 'ණය මුදල් නිකුත් කිරීමේ සටහන',
  },
  cashSaleTitle: { en: 'Cash Sale Invoice', si: 'මුදල් විකිණුම් බිල' },
  releaseNoteNumber: { en: 'Release Note No.', si: 'නිකුත් සටහන අංකය' },
  releaseDetails: { en: 'Release Details', si: 'නිකුත් කිරීමේ විස්තර' },
  principalReleased: { en: 'Principal Amount', si: 'මුල්‍ය මුදල' },
  releasedBy: { en: 'Released By', si: 'නිකුත් කළේ' },
  remarks: { en: 'Remarks', si: 'සටහන්' },
  invoiceNumber: { en: 'Invoice No.', si: 'බිල් අංකය' },
  receiptNumber: { en: 'Receipt No.', si: 'ලදුපත් අංකය' },
  createdDate: { en: 'Created Date', si: 'සාදන දිනය' },
  customerDetails: { en: 'Customer Details', si: 'පාරිභෝගික විස්තර' },
  bikeDetails: { en: 'Bike Details', si: 'යතුරුපැදි විස්තර' },
  financeDetails: { en: 'Finance Details', si: 'ණය විස්තර' },
  guarantorDetails: { en: 'Guarantor Details', si: 'ඇපකරු විස්තර' },
  signatures: { en: 'Signatures', si: 'අත්සන්' },
  customerName: { en: 'Customer Name', si: 'පාරිභෝගික නම' },
  customerCode: { en: 'Customer Code', si: 'ගනුදෙනුකරු කේතය' },
  nic: { en: 'NIC', si: 'ජා. හැ. අංකය' },
  phone: { en: 'Phone', si: 'දුරකථන' },
  address: { en: 'Address', si: 'ලිපිනය' },
  bikeModel: { en: 'Model', si: 'මාදිලිය' },
  brand: { en: 'Brand', si: 'වෙළඳ නාමය' },
  color: { en: 'Color', si: 'වර්ණය' },
  chassisNo: { en: 'Chassis No.', si: 'චැසි අංකය' },
  engineNo: { en: 'Engine No.', si: 'එන්ජින් අංකය' },
  cashPrice: { en: 'Total Amount', si: 'මුළු මුදල' },
  initialPayment: { en: 'Amount Paid', si: 'ගෙවූ මුදල' },
  serviceFee: { en: 'Service Fee', si: 'සේවා ගාස්තු' },
  registrationFee: { en: 'Registration Fee', si: 'ලියාපදිංචි ගාස්තු' },
  netAdvancePayment: {
    en: 'Net Advance for Loan',
    si: 'ණයට යෙදෙන අග්‍රිම මුදල',
  },
  financeAmount: { en: 'Term Amount', si: 'කාල මුදල' },
  interestAmount: { en: 'Interest Amount', si: 'පොලී මුදල' },
  totalPayable: { en: 'Total Payable', si: 'ගෙවිය යුතු මුළු මුදල' },
  monthlyInstallment: { en: 'Monthly Installment', si: 'මාසික වාරිකය' },
  installmentCount: { en: 'Installment Count', si: 'වාරික ගණන' },
  lateFeeRule: { en: 'Late Fee Rule', si: 'ප්‍රමාද ගාස්තු නීතිය' },
  gracePeriod: { en: 'Grace Period', si: 'නිදහස් කාලය' },
  days: { en: 'days', si: 'දින' },
  customerSignature: { en: 'Customer Signature', si: 'පාරිභෝගික අත්සන' },
  guarantorSignature: { en: 'Guarantor Signature', si: 'ඇපකරු අත්සන' },
  authorizedOfficer: { en: 'Authorized Officer', si: 'අනුමත නිලධාරී' },
  paymentDate: { en: 'Payment Date', si: 'ගෙවීම් දිනය' },
  paymentTime: { en: 'Payment Time', si: 'ගෙවීම් වේලාව' },
  paymentMethod: { en: 'Payment Method', si: 'ගෙවීම් ක්‍රමය' },
  loanNumber: { en: 'Loan No.', si: 'ණය අංකය' },
  customerInformation: { en: 'Customer Information', si: 'පාරිභෝගික තොරතුරු' },
  loanInformation: { en: 'Loan Information', si: 'ණය තොරතුරු' },
  paymentInformation: { en: 'Payment Information', si: 'ගෙවීම් තොරතුරු' },
  balanceInformation: { en: 'Balance Information', si: 'ශේෂ තොරතුරු' },
  previousBalance: { en: 'Previous Balance', si: 'පෙර ශේෂය' },
  paymentAmount: { en: 'Payment Amount', si: 'ගෙවූ මුදල' },
  lateFee: { en: 'Late Fee', si: 'ප්‍රමාද ගාස්තු' },
  totalReceived: { en: 'Total Received', si: 'මුළු ලැබීම' },
  nextDueDate: { en: 'Next Due Date', si: 'ඊළඟ ගෙවීම් දිනය' },
  installmentNumber: { en: 'Installment Number', si: 'වාරික අංකය' },
  registrationNumber: { en: 'Registration Number', si: 'ලියාපදිංචි අංකය' },
  paidAmount: { en: 'Paid Amount', si: 'ගෙවූ මුදල' },
  discount: { en: 'Discount', si: 'වට්ටම' },
  appliedBreakdown: { en: 'Applied Breakdown', si: 'අදාළ වෙන්කිරීම' },
  remainingBalance: { en: 'Remaining Balance', si: 'ඉතිරි ශේෂය' },
  cashier: { en: 'Cashier / User', si: 'මුදල් අයකැමි' },
  lateFeePaid: { en: 'Late fee paid', si: 'ගෙවූ ප්‍රමාද ගාස්තු' },
  installmentPaid: { en: 'Installment paid', si: 'ගෙවූ වාරික' },
  interestPaid: { en: 'Interest paid', si: 'ගෙවූ පොලී' },
  principalPaid: { en: 'Principal paid', si: 'ගෙවූ මුල්‍යමුදල' },
  salePrice: { en: 'Sale Price', si: 'විකිණුම් මිල' },
  soldDate: { en: 'Sold Date', si: 'විකිණු දිනය' },
  lockedNotice: {
    en: 'This document is locked. Reprint only — content cannot be edited.',
    si: 'මෙම ලේඛනය අගුළු දමා ඇත. නැවත මුද්‍රණය පමණයි — අන්තර්ගතය සංස්කරණය කළ නොහැක.',
  },
  viewInvoice: { en: 'View Invoice', si: 'බිල බලන්න' },
  printInvoice: { en: 'Print Invoice', si: 'බිල මුද්‍රණය' },
  printDocument: { en: 'Print', si: 'මුද්‍රණය' },
  back: { en: 'Back', si: 'ආපසු' },
  installmentPlan: {
    en: 'Installment Plan (summary)',
    si: 'වාරික සැලසුම (සාරාංශය)',
  },
  collateralHeld: { en: 'Collateral held', si: 'ඇපකර භාණ්ඩ' },
  fileNumber: { en: 'File number', si: 'ගොනු අංකය' },
  vehicleNumber: { en: 'Vehicle number', si: 'වාහන අංකය' },
  guarantor1: { en: 'Guarantor 1', si: 'ඇපකරු 1' },
  guarantor2: { en: 'Guarantor 2', si: 'ඇපකරු 2' },
  description: { en: 'Description', si: 'විස්තරය' },
  itemType: { en: 'Type', si: 'වර්ගය' },
  storage: { en: 'Storage', si: 'ගබඩාව' },
  repairCost: { en: 'Repair', si: 'අලුත්වැඩියා' },
  otherCost: { en: 'Other cost', si: 'වෙනත් වියදම' },
  amountLkr: { en: 'Amount (LKR)', si: 'මුදල (රු.)' },
};

export type DocumentLabelKey = keyof typeof pairs;

export function getDocumentLabel(
  key: DocumentLabelKey,
  mode: DisplayMode = 'both'
): string {
  const { en, si } = pairs[key];
  if (mode === 'en') return en;
  if (mode === 'si') return si;
  return `${en} / ${si}`;
}

export function getDocumentLabels(mode: DisplayMode = 'both') {
  return Object.fromEntries(
    (Object.keys(pairs) as DocumentLabelKey[]).map((k) => [
      k,
      getDocumentLabel(k, mode),
    ])
  ) as Record<DocumentLabelKey, string>;
}
