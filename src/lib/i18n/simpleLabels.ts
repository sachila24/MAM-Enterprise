/** Bilingual UI labels: English first, Sinhala in brackets. */

export type DisplayMode = 'both' | 'en' | 'si';

function bi(en: string, si: string): string {
  return `${en} (${si})`;
}

export const t = {
  // Navigation
  'nav.dashboard': bi('Dashboard', 'උපකරණ පුවරුව'),
  'nav.customers': bi('Customers', 'ගනුදෙනුකරුවන්'),
  'nav.loans': bi('Loans & Installments', 'ණය සහ වාරික'),
  'nav.payments': bi('Payments', 'ගෙවීම්'),
  'nav.receipts': bi('Receipts', 'රිසිට්පත්'),
  'nav.bikeStock': bi('Bike Stock', 'යතුරුපැදි තොග'),
  'nav.guarantees': bi('Guarantees', 'ඇපකර'),
  'nav.expenses': bi('Expenses', 'වියදම්'),
  'nav.reports': bi('Reports', 'වාර්තා'),
  'nav.backup': bi('Backup', 'උපස්ථ'),
  'nav.staff': bi('Staff', 'කාර්ය මණ්ඩලය'),
  'nav.settings': bi('Business Settings', 'ව්‍යාපාරික සැකසුම්'),
  'nav.activityLog': bi('Activity Log', 'ක්‍රියාකාරකම් ලොගය'),
  'navGroup.operate': bi('OPERATE', 'මෙහෙයුම්'),
  'navGroup.inventory': bi('INVENTORY', 'තොග'),
  'navGroup.records': bi('RECORDS', 'වාර්තා'),
  'navGroup.admin': bi('ADMIN', 'පරිපාලන'),

  // Common actions
  'action.save': bi('Save', 'සුරකින්න'),
  'action.cancel': bi('Cancel', 'අවලංගු'),
  'action.add': bi('Add', 'එකතු කරන්න'),
  'action.edit': bi('Edit', 'සංස්කරණය'),
  'action.delete': bi('Delete', 'මකන්න'),
  'action.search': bi('Search', 'සොයන්න'),
  'action.filter': bi('Filter', 'පෙරහන'),
  'action.export': bi('Export', 'අපනයනය'),
  'action.back': bi('Back', 'ආපසු'),
  'action.next': bi('Next', 'ඊළඟ'),
  'action.confirm': bi('Confirm', 'තහවුරු කරන්න'),
  'action.continue': bi('Continue', 'ඉදිරියට'),
  'action.close': bi('Close', 'වසන්න'),
  'action.view': bi('View', 'බලන්න'),
  'action.viewAll': bi('View all', 'සියල්ල බලන්න'),

  // Common fields
  'field.name': bi('Name', 'නම'),
  'field.phone': bi('Phone', 'දුරකථන'),
  'field.address': bi('Address', 'ලිපිනය'),
  'field.date': bi('Date', 'දිනය'),
  'field.amount': bi('Amount', 'මුදල'),
  'field.notes': bi('Notes', 'සටහන්'),
  'field.status': bi('Status', 'තත්ත්වය'),
  'field.type': bi('Type', 'වර්ගය'),
  'field.description': bi('Description', 'විස්තරය'),
  'field.customer': bi('Customer', 'ගනුදෙනුකරු'),
  'field.loan': bi('Loan', 'ණය'),
  'field.method': bi('Method', 'ක්‍රමය'),
  'field.balance': bi('Balance', 'ඉතිරි මුදල'),

  // Misc
  'misc.comingSoon': bi('Coming Soon', 'ළඟදීම'),
  'misc.phase': bi('Coming in Phase', 'අදියරේදී'),
  'misc.signOut': bi('Sign out', 'ඉවත් වන්න'),
  'misc.profile': bi('Profile', 'පැතිකඩ'),
  'misc.unknown': bi('Unknown', 'නොදනී'),
  'misc.localDemo': bi('Local demo mode', 'දේශීය ඩෙමෝ'),
  'misc.localDemoHint': bi(
    'data stored in your browser only',
    'දත්ත බ්‍රවුසරයේ පමණි'
  ),
  'misc.resetDemo': bi('Reset demo data', 'ඩෙමෝ දත්ත යළි සකසන්න'),
  'misc.resetDemoConfirm': bi(
    'Reset all demo data to the seeded sample? This cannot be undone.',
    'සියලු ඩෙමෝ දත්ත යළි සකසන්නද? මෙය අහෝසි කළ නොහැක.'
  ),
  'misc.savedToLocalDemo': bi(
    'Saved to local demo storage',
    'දේශීය ඩෙමෝ ගබඩාවට සුරකින ලදී'
  ),

  // Stepper
  stepCustomer: bi('Customer', 'ගනුදෙනුකරු'),
  stepLoan: bi('Loan', 'ණය'),
  stepPayment: bi('Payment', 'ගෙවීම'),
  stepReview: bi('Review', 'සමාලෝචනය'),
  stepConfirm: bi('Confirm', 'තහවුරු කරන්න'),
  stepPurpose: bi('Purpose', 'අරමුණ'),
  stepMethod: bi('Method', 'ක්‍රමය'),
  stepTerms: bi('Terms', 'කොන්දේසි'),
  stepBikeGuarantee: bi('Bike / Guarantee', 'බයික් / ඇපකර'),
  stepItemDetails: bi('Item details', 'අයිතම විස්තර'),
  stepStorageConfirm: bi('Storage & Confirm', 'ගබඩාව සහ තහවුරු'),

  // Payments
  recordPayment: bi('Record Payment', 'ගෙවීම ඇතුළත් කරන්න'),
  recordPaymentSubtitle: bi(
    'Customer → loan → payment with live allocation preview',
    'ගනුදෙනුකරු → ණය → ගෙවීම (සජීව පෙරදසුන)'
  ),
  cashReceived: bi('Cash Received', 'ලැබුණු මුදල'),
  discount: bi('Discount', 'වට්ටම'),
  discountGiven: bi('Discount given', 'දුන් වට්ටම'),
  totalApplied: bi('Total Applied', 'මුළු ගණන'),
  loanBalance: bi('Loan Balance', 'ණය ඉතිරි මුදල'),
  nextDue: bi('Next Due', 'ඊළඟ ගෙවීම'),
  paymentSummary: bi('Payment summary', 'ගෙවීම් සාරාංශය'),
  paymentSummaryEmpty: bi(
    'Select a customer and loan to see the payment summary.',
    'ගෙවීම් සාරාංශයට ගනුදෙනුකරු සහ ණය තෝරන්න.'
  ),
  enterPayment: bi('Enter payment', 'ගෙවීම ඇතුළත් කරන්න'),
  confirmPayment: bi('Confirm payment', 'ගෙවීම තහවුරු කරන්න'),
  reviewPayment: bi('Review Payment', 'ගෙවීම සමාලෝචනය'),
  savingPayment: bi('Saving payment…', 'ගෙවීම සුරකිමින්…'),
  paymentRecorded: bi('Payment recorded successfully', 'ගෙවීම සාර්ථකයි'),
  paymentSaveFailed: bi('Could not save payment', 'ගෙවීම සුරැකිය නොහැක'),
  payments: bi('Payments', 'ගෙවීම්'),
  paymentRecordedTitle: bi('Payment Recorded', 'ගෙවීම සටහන් විය'),
  receiptPreview: bi('Receipt preview', 'රිසිට්පත් පෙරදසුන'),
  allocationPreview: bi('Allocation preview', 'බෙදා හැරීමේ පෙරදසුන'),
  allocationPreviewHint: bi(
    'How this payment will be applied before you confirm.',
    'තහවුරු කිරීමට පෙර මෙම ගෙවීම බෙදෙන ආකාරය.'
  ),
  allocationSummary: bi('Allocation summary', 'බෙදා හැරීමේ සාරාංශය'),
  scheduleImpact: bi('Schedule impact', 'කාලසටහනට බලපෑම'),
  viewFullSchedule: bi('View full schedule', 'සම්පූර්ණ කාලසටහන'),
  viewFullLoanSchedule: bi('View full loan schedule', 'සම්පූර්ණ ණය කාලසටහන'),
  printReceipt: bi('Print receipt', 'රිසිට්පත් මුද්‍රණය'),
  recordAnotherPayment: bi('Record another payment', 'තව ගෙවීමක්'),
  backToPayments: bi('Back to payments', 'ගෙවීම් වෙත ආපසු'),
  noPaymentDetails: bi('No payment details available.', 'ගෙවීම් විස්තර නැත.'),
  collectedToday: bi('Collected Today', 'අද එකතු වූ'),
  collectedThisWeek: bi('Collected This Week', 'මෙම සතිය'),
  pendingConfirmations: bi('Pending Confirmations', 'තහවුරු කිරීම් බලාපොරොත්තු'),
  needsReview: bi('Needs review', 'සමාලෝචනය අවශ්‍ය'),
  searchPayments: bi(
    'Search by Receipt, Customer, or Loan ID...',
    'රිසිට්, ගනුදෙනුකරු, ණය ID...'
  ),
  noPaymentsFound: bi(
    'No payments found matching your criteria.',
    'ගෙවීම් හමු නොවීය.'
  ),
  paymentMethod: bi('Payment method', 'ගෙවීම් ක්‍රමය'),
  paymentDate: bi('Payment date', 'ගෙවීම් දිනය'),
  chequeNumber: bi('Cheque number', 'චෙක් අංකය'),
  bankReference: bi('Bank reference', 'බැංකු යොමුව'),
  totalDue: bi('Total due', 'මුළු ගෙවිය යුතු'),
  current: bi('Current', 'වර්තමාන'),
  fullLoanBalance: bi('Full loan balance', 'සම්පූර්ණ ණය ශේෂය'),
  currentCycle: bi('Current cycle', 'වර්තමාන චක්‍රය'),
  paymentImpact: bi('Payment impact', 'ගෙවීමේ බලපෑම'),
  livePreview: bi('Live preview', 'සජීව පෙරදසුන'),
  cashEntered: bi('Cash entered', 'ඇතුළත් මුදල'),
  discountApplied: bi('Discount applied', 'වට්ටම යොදන ලදී'),
  loanBalanceAfter: bi('Loan balance after payment', 'ගෙවීමෙන් පසු ණය ශේෂය'),

  // Payment summary fields
  loanAmount: bi('Loan amount', 'ණය මුදල'),
  financeAmount: bi('Finance amount', 'මුල්‍ය මුදල'),
  paid: bi('Paid', 'ගෙවූ'),
  totalPayable: bi('Total payable', 'මුළු ගෙවිය යුතු'),
  monthlyInstallment: bi('Monthly installment', 'මාසික වාරිකය'),
  nextDueDate: bi('Next due date', 'ඊළඟ ගෙවීම් දිනය'),
  lateFeeRate: bi('Late fee rate', 'ප්‍රමාද ගාස්තු අනුපාතය'),
  lateFeesDue: bi('Late fees due', 'ගෙවිය යුතු ප්‍රමාද ගාස්තු'),
  arrearsInstallments: bi('Arrears installments', 'ප්‍රමාද වාරික'),
  currentMonth: bi('Current month', 'වර්තමාන මාසය'),
  totalDueToday: bi('Total due today', 'අද ගෙවිය යුතු මුළු මුදල'),

  // Allocation / receipt lines
  interestPaid: bi('Interest paid', 'ගෙවූ පොලිය'),
  principalPaid: bi('Principal paid', 'ගෙවූ මුල්‍ය'),
  remainingPrincipal: bi('Remaining principal', 'ඉතිරි මුල්‍ය'),
  pendingInterest: bi('Pending interest', 'බැඳි පොලිය'),
  lateFeePaid: bi('Late fee paid', 'ගෙවූ ප්‍රමාද ගාස්තු'),
  installmentPaid: bi('Installment paid', 'ගෙවූ වාරිකය'),
  advancePaid: bi('Advance paid', 'අග්‍රිම ගෙවීම'),
  remainingArrears: bi('Remaining arrears', 'ඉතිරි ප්‍රමාද'),
  arrearsRemaining: bi('Arrears remaining', 'ඉතිරි ප්‍රමාද'),
  principalBalanceAfter: bi('Principal balance after', 'පසු මුල්‍ය ශේෂය'),
  totalAllocated: bi('Total allocated', 'මුළු බෙදා හැරීම'),
  period: bi('Period', 'කාලය'),
  due: bi('Due', 'ගෙවිය යුතු'),
  thisPayment: bi('This payment', 'මෙම ගෙවීම'),
  remaining: bi('Remaining', 'ඉතිරි'),
  noScheduleLines: bi('No schedule lines to display.', 'කාලසටහන් පේළි නැත.'),
  fullAllocationSchedule: bi('Full allocation schedule', 'සම්පූර්ණ බෙදා හැරීම'),
  fullScheduleHint: bi(
    'All installments and fees considered for this payment',
    'මෙම ගෙවීමට සලකන සියලු වාරික සහ ගාස්තු'
  ),
  affectedByPayment: bi('Affected by this payment', 'මෙම ගෙවීමෙන් බලපෑම'),

  // Allocation row types (display)
  allocInterest: bi('Interest', 'පොලිය'),
  allocPrincipal: bi('Principal', 'මුල්‍ය'),
  allocLateFee: bi('Late fee', 'ප්‍රමාද ගාස්තු'),
  allocInstallment: bi('Installment', 'වාරිකය'),
  allocAdvance: bi('Advance', 'අග්‍රිම'),
  allocPartial: bi('Partial', 'අර්ධ'),
  allocPaid: bi('Paid', 'ගෙවූ'),
  allocRemaining: bi('Remaining', 'ඉතිරි'),

  // Loans
  createLoan: bi('Create Loan', 'ණය සාදන්න'),
  createLoanSubtitle: bi('Set up a new loan agreement', 'නව ණය ගිවිසුමක්'),
  newLoan: bi('New loan', 'නව ණය'),
  loansSubtitle: bi(
    'All cash loans and bike installment loans',
    'සියලුම මුදල් ණය සහ බයික් වාරික'
  ),
  selectCustomer: bi('Select Customer', 'ගනුදෙනුකරු තෝරන්න'),
  selectLoan: bi('Select loan', 'ණය තෝරන්න'),
  searchLoan: bi('Search loan code or type', 'ණය කේතය හෝ වර්ගය සොයන්න'),
  noLoansForCustomer: bi('No loans for this customer.', 'මෙම ගනුදෙනුකරුට ණය නැත.'),
  loanPurpose: bi('Loan Purpose', 'ණය අරමුණ'),
  cashLoan: bi('Cash Loan', 'මුදල් ණය'),
  bikeInstallment: bi('Bike Installment', 'බයික් වාරික'),
  repaymentMethod: bi('Repayment Method', 'ගෙවීම් ක්‍රමය'),
  fixedMonthlyInstallments: bi('Fixed monthly installments', 'ස්ථිර මාසික වාරික'),
  monthlyInterestReducing: bi(
    'Monthly Interest / Reducing Principal',
    'මාසික පොලිය / අඩු වන මුල්‍ය'
  ),
  fixedTermInstallment: bi('Fixed Term Installment', 'ස්ථිර කාල වාරික'),
  interestOnlyTerms: bi('Interest-Only Terms', 'පොලිය පමණ කොන්දේසි'),
  loanAmountField: bi('Loan amount', 'ණය මුදල'),
  monthlyInterestRate: bi('Monthly interest rate (%)', 'මාසික පොලිය (%)'),
  startDate: bi('Start date', 'ආරම්භ දිනය'),
  dueDay: bi('Due day (1–28)', 'ගෙවීම් දිනය (1–28)'),
  firstDueDate: bi('First due date', 'පළමු ගෙවීම් දිනය'),
  bikeInstallmentTerms: bi('Bike & installment terms', 'බයික් සහ වාරික කොන්දේසි'),
  fixedInstallmentTerms: bi('Fixed Installment Terms', 'ස්ථිර වාරික කොන්දේසි'),
  selectInStockBike: bi('-- Select in-stock bike --', '-- තොග බයික් තෝරන්න --'),
  bikeSellingPrice: bi('Bike selling price', 'බයික් විකිණීම් මිල'),
  downPayment: bi('Down payment', 'මුදල් තැන්පතු'),
  termMonths: bi('Term (months)', 'කාලය (මාස)'),
  monthlyFlatRate: bi('Monthly flat rate (%)', 'මාසික සමතල අනුපාතය (%)'),
  lateFeeRateField: bi('Late fee rate (%)', 'ප්‍රමාද ගාස්තු (%)'),
  discountOptional: bi('Discount (optional)', 'වට්ටම (අවශ්‍ය නම්)'),
  guaranteeItems: bi('Guarantee items', 'ඇපකර අයිතම'),
  addAnotherGuarantee: bi('Add another guarantee', 'තව ඇපකරයක්'),
  confirmLoan: bi('Confirm Loan', 'ණය තහවුරු කරන්න'),
  creatingLoan: bi('Creating loan…', 'ණය සාදමින්…'),
  loanCreated: bi('Loan created', 'ණය සාදන ලදී'),
  loanCreateFailed: bi('Could not create loan', 'ණය සාදිය නොහැක'),
  loanNotFound: bi('Loan not found', 'ණය හමු නොවීය'),
  recordPaymentAction: bi('Record Payment', 'ගෙවීම ඇතුළත් කරන්න'),
  earlySettlement: bi('Early Settlement', 'පූර්ව නිරාකරණය'),
  cancelLoan: bi('Cancel Loan', 'ණය අවලංගු'),
  addGuarantee: bi('Add Guarantee', 'ඇපකර එකතු කරන්න'),
  totalActiveLoans: bi('Total Active Loans', 'සක්‍රිය ණය'),
  outstandingPortfolio: bi('Outstanding Portfolio', 'ඉතිරි ණය පොර්ට්ෆෝලියෝ'),
  overdueLoans: bi('Overdue Loans', 'ප්‍රමාද ණය'),
  needsAttention: bi('Needs attention', 'අවධානය අවශ්‍ය'),
  completedThisMonth: bi('Completed This Month', 'මෙම මාසයේ අවසන්'),
  searchLoans: bi('Search by ID or Customer...', 'ID හෝ ගනුදෙනුකරු...'),
  allStatuses: bi('All Statuses', 'සියලු තත්ත්ව'),
  allTypes: bi('All Types', 'සියලු වර්ග'),
  noLoansFound: bi(
    'No loans found matching your criteria.',
    'ණය හමු නොවීය.'
  ),
  loanId: bi('Loan ID', 'ණය ID'),
  startDateCol: bi('Start Date', 'ආරම්භ දිනය'),

  // Bikes
  bikeStock: bi('Bike Stock', 'යතුරුපැදි තොග'),
  bikeStockSubtitle: bi('Manage inventory and sold bikes', 'තොග සහ විකිණූ බයික්'),
  addBike: bi('Add bike', 'බයික් එකතු කරන්න'),
  totalBikes: bi('Total bikes', 'මුළු බයික්'),
  inStock: bi('In stock', 'තොගයේ'),
  sold: bi('Sold', 'විකිණූ'),
  heldAsGuarantee: bi('Held as guarantee', 'ඇපකර ලෙස'),
  searchBikes: bi('Search model, chassis, engine...', 'මාදිලිය, රථ, එන්ජින්...'),
  noBikesFound: bi(
    'No bikes found matching your criteria.',
    'බයික් හමු නොවීය.'
  ),
  bikeNotFound: bi('Bike not found', 'බයික් හමු නොවීය'),
  markAsSold: bi('Mark as sold', 'විකිණූ ලෙස සලකුණු'),
  addBikeToStock: bi('Add bike to stock', 'තොගයට බයික් එකතු'),
  editBike: bi('Edit bike details', 'බයික් විස්තර සංස්කරණය'),
  model: bi('Model', 'මාදිලිය'),
  chassisNumber: bi('Chassis number', 'රථ අංකය'),
  engineNumber: bi('Engine number', 'එන්ජින් අංකය'),
  registrationNo: bi('Registration no.', 'ලියාපදිංචි අංකය'),
  purchaseDate: bi('Purchase date', 'මිලදී ගත් දිනය'),
  boughtPrice: bi('Bought price (cost)', 'මිලදී ගත් මිල'),
  listSellingPrice: bi('List selling price', 'විකිණීම් මිල'),
  repairCost: bi('Repair cost', 'අලුත්වැඩියා වියදම'),
  otherCost: bi('Other cost', 'වෙනත් වියදම'),
  bikeSaved: bi('Bike updated successfully', 'බයික් සාර්ථකව සුරකින ලදී'),
  bikeAdded: bi('Bike added to stock', 'බයික් තොගයට එකතු විය'),
  bikeSaveFailed: bi('Could not save bike', 'බයික් සුරැකිය නොහැක'),
  bikeMarkedSold: bi('marked as sold', 'විකිණූ ලෙස සලකුණු'),

  // Guarantees
  guarantees: bi('Guarantees', 'ඇපකර'),
  guaranteesSubtitle: bi(
    'Items held as collateral for loans',
    'ණය සඳහා තබාගත් ඇපකර'
  ),
  addGuaranteeTitle: bi('Add Guarantee', 'ඇපකර එකතු කරන්න'),
  addGuaranteeSubtitle: bi(
    'Record an item held as collateral',
    'ඇපකර අයිතමයක් ඇතුළත් කරන්න'
  ),
  storageLocation: bi('Storage location', 'ගබඩා ස්ථානය'),
  receivedDate: bi('Received date', 'ලැබුණු දිනය'),
  guaranteeType: bi('Guarantee type', 'ඇපකර වර්ගය'),
  vehicleBook: bi('Vehicle book', 'වාහන පොත'),
  gold: bi('Gold', 'රත්රන්'),
  electronics: bi('Electronics', 'ඉලෙක්ට්‍රොනික'),
  otherValuable: bi('Other valuable item', 'වෙනත් වටිනා අයිතම'),
  estimatedValue: bi('Estimated value (optional)', 'ඇස්තමේන්තු වටිනාකම'),
  totalHeld: bi('Total Held', 'මුළු තබාගත්'),
  noGuaranteesFound: bi(
    'No guarantees found matching your criteria.',
    'ඇපකර හමු නොවීය.'
  ),
  guaranteeSaved: bi('Guarantee saved successfully', 'ඇපකර සාර්ථකව සුරකින ලදී'),
  guaranteeSaveFailed: bi('Could not save guarantee', 'ඇපකර සුරැකිය නොහැක'),
  guaranteeNotFound: bi('Guarantee not found', 'ඇපකර හමු නොවීය'),
  markReturned: bi('Mark as returned', 'ආපසු දුන් ලෙස සලකුණු'),
  returnedTo: bi('Returned to', 'ආපසු දුන්නේ'),

  // Customers
  customers: bi('Customers', 'ගනුදෙනුකරුවන්'),
  addCustomer: bi('Add Customer', 'ගනුදෙනුකරු එකතු කරන්න'),
  totalCustomers: bi('Total Customers', 'මුළු ගනුදෙනුකරු'),
  activeLoans: bi('Active Loans', 'සක්‍රිය ණය'),
  searchCustomers: bi(
    'Search by name, NIC, or phone...',
    'නම, හැඳුනුම්පත, දුරකථන...'
  ),
  noCustomersYet: bi(
    'No customers yet. Add your first customer to get started.',
    'ගනුදෙනුකරු නැත. පළමු ගනුදෙනුකරු එකතු කරන්න.'
  ),
  customerSaved: bi('Customer saved successfully', 'ගනුදෙනුකරු සාර්ථකයි'),
  customerUpdated: bi('Customer updated successfully', 'ගනුදෙනුකරු යාවත්කාලීන විය'),
  customerNotFound: bi('Customer not found', 'ගනුදෙනුකරු හමු නොවීය'),
  fullName: bi('Full Name', 'සම්පූර්ණ නම'),
  nicNumber: bi('NIC Number', 'හැඳුනුම්පත් අංකය'),
  phoneNumber: bi('Phone Number', 'දුරකථන අංකය'),

  // Dashboard
  dashboard: bi('Dashboard', 'උපකරණ පුවරුව'),
  goodMorning: bi('Good morning', 'සුභ උදෑසනක්'),
  quickActions: bi('Quick actions', 'ඉක්මන් ක්‍රියා'),
  today: bi('Today', 'අද'),
  collections: bi('Collections', 'එකතු කිරීම්'),
  paymentsReceived: bi('Payments Received', 'ලැබුණු ගෙවීම්'),
  overdueFollowups: bi('Overdue Follow-ups', 'ප්‍රමාද අනුගමන'),
  moneySnapshot: bi('Money Snapshot', 'මුදල් සාරාංශය'),
  cashOnHand: bi('Cash on Hand', 'අතේ මුදල'),
  thisMonthNet: bi('This Month Net', 'මෙම මාස නිෂ්පත්තිය'),
  overdueQueue: bi('Overdue Queue', 'ප්‍රමාද පෝලිම'),
  noOverdueLoans: bi('No overdue loans. Great job!', 'ප්‍රමාද ණය නැත!'),
  stockStatus: bi('Stock Status', 'තොග තත්ත්වය'),
  soldThisMonth: bi('Sold This Month', 'මෙම මාසයේ විකිණූ'),
  recentActivity: bi('Recent Activity', 'මෑත ක්‍රියාකාරකම්'),
  noRecentActivity: bi('No recent activity yet.', 'මෑත ක්‍රියාකාරකම් නැත.'),

  // Login
  signIn: bi('Sign in', 'පිවිසෙන්න'),
  signInToAccount: bi('Sign in to your account', 'ඔබේ ගිණුමට පිවිසෙන්න'),
  welcomeBack: bi(
    'Welcome back! Please enter your details.',
    'ආයුබෝවන්! ඔබේ විස්තර ඇතුළත් කරන්න.'
  ),
  emailAddress: bi('Email address', 'ඊමේල් ලිපිනය'),
  password: bi('Password', 'මුරපදය'),
  rememberMe: bi('Remember me', 'මාව මතක තබාගන්න'),
  forgotPassword: bi('Forgot password?', 'මුරපදය අමතකද?'),
  needAccess: bi('Need access? Ask your manager.', 'ප්‍රවේශය අවශ්‍යද? කළමනාකරු අසන්න.'),
  bikeSalesFinance: bi('Bike Sales & Finance', 'බයික් විකිණීම් සහ මුල්‍ය'),

  // Status enums
  statusActive: bi('Active', 'සක්‍රිය'),
  statusOverdue: bi('Overdue', 'ප්‍රමාද'),
  statusCompleted: bi('Completed', 'අවසන්'),
  statusConfirmed: bi('Confirmed', 'තහවුරු'),
  statusVoided: bi('Voided', 'අවලංගු'),
  statusHeld: bi('Held', 'තබාගත්'),
  statusInStock: bi('In stock', 'තොගයේ'),
  statusSold: bi('Sold', 'විකිණූ'),
  statusReserved: bi('Reserved', 'වෙන්කළ'),
  statusReturned: bi('Returned', 'ආපසු දුන්'),
  statusPaid: bi('Paid', 'ගෙවූ'),
  statusPending: bi('Pending', 'බලාපොරොත්තු'),
  statusCancelled: bi('Cancelled', 'අවලංගු'),
  statusCash: bi('Cash', 'මුදල්'),
  statusCheque: bi('Cheque', 'චෙක්'),
  statusBankTransfer: bi('Bank Transfer', 'බැංකු මාරුව'),
  statusOther: bi('Other', 'වෙනත්'),

  // Loan types
  typeCash: bi('Cash', 'මුදල්'),
  typeCashLoan: bi('Cash loan', 'මුදල් ණය'),
  typeBikeInstallment: bi('Bike installment', 'බයික් වාරික'),
  typeBike: bi('Bike', 'බයික්'),

  // Table columns
  colDate: bi('Date', 'දිනය'),
  colReceiptNo: bi('Receipt No', 'රිසිට් අංකය'),
  colCash: bi('Cash', 'මුදල්'),
  colDiscount: bi('Discount', 'වට්ටම'),
  colCodeModel: bi('Code / model', 'කේතය / මාදිලිය'),
  colLinkedTo: bi('Linked To', 'සම්බන්ධ'),
  colLocation: bi('Location', 'ස්ථානය'),
  colReceived: bi('Received', 'ලැබුණු'),
  colPrice: bi('Price', 'මිල'),
  colYearColor: bi('Year / Color', 'වර්ෂය / වර්ණය'),
  colChassisEngine: bi('Chassis / Engine', 'රථ / එන්ජින්'),
  colActiveLoans: bi('Active Loans', 'සක්‍රිය ණය'),
  colOutstanding: bi('Outstanding', 'ඉතිරි'),
  colNic: bi('NIC', 'හැඳුනුම්පත'),

  // Customer search / list extras
  noCustomersAvailable: bi('No customers available', 'ගනුදෙනුකරු නැත'),
  noCustomersAvailableHint: bi(
    'Create a customer and an active loan first, or reset demo data from the header.',
    'පළමුව ගනුදෙනුකරු සහ සක්‍රිය ණයක් සාදන්න, හෝ ශීර්ෂයෙන් ඩෙමෝ යළි සකසන්න.'
  ),
  noCustomersMatchSearch: bi(
    'No customers match your search.',
    'සෙවීමට ගැලපෙන ගනුදෙනුකරු නැත.'
  ),
  noCustomersFilterMatch: bi(
    'No customers found matching your filters.',
    'පෙරහනට ගැලපෙන ගනුදෙනුකරු නැත.'
  ),
  customerSelectionDisabled: bi(
    'Customer selection is disabled.',
    'ගනුදෙනුකරු තේරීම අක්‍රියයි.'
  ),
  selectedCustomerLabel: bi('Selected customer', 'තෝරාගත් ගනුදෙනුකරු'),
  changeCustomer: bi('Change customer', 'ගනුදෙනුකරු වෙනස් කරන්න'),
  customerCode: bi('Customer code', 'ගනුදෙනුකරු කේතය'),
  searchCustomerPlaceholder: bi(
    'Search customer by name, NIC, phone…',
    'නම, හැඳුනුම්පත, දුරකථනය...'
  ),
  editCustomer: bi('Edit Customer', 'ගනුදෙනුකරු සංස්කරණය'),
  editCustomerSubtitle: bi(
    'Update customer profile details.',
    'ගනුදෙනුකරු පැතිකඩ යාවත්කාලීන කරන්න.'
  ),
  addCustomerSubtitle: bi(
    'Create a new customer profile.',
    'නව ගනුදෙනුකරු පැතිකඩක් සාදන්න.'
  ),
  saveCustomer: bi('Save Customer', 'ගනුදෙනුකරු සුරකින්න'),
  updateCustomer: bi('Update Customer', 'ගනුදෙනුකරු යාවත්කාලීන කරන්න'),
  backToCustomers: bi('Back to Customers', 'ගනුදෙනුකරු වෙත ආපසු'),
  totalOutstanding: bi('Total Outstanding', 'මුළු ඉතිරි'),
  statusInactive: bi('Inactive', 'අක්‍රිය'),

  // Payment form extras
  discountGivenOptional: bi('Discount given (optional)', 'දුන් වට්ටම (අවශ්‍ය නම්)'),
  cashReceivedRequired: bi('Cash received *', 'ලැබුණු මුදල *'),
  loanBalanceReducesHint: bi(
    'Loan balance reduces by total applied. Cash collection and dashboard totals use cash received only.',
    'ණය ශේෂය මුළු ගණනෙන් අඩු වේ. මුදල් එකතුව සහ උපකරණ පුවරුව ලැබුණු මුදල් පමණි.'
  ),
  confirmPaymentBtn: bi('Confirm Payment', 'ගෙවීම තහවුරු කරන්න'),

  // Bike form / detail
  identification: bi('Identification', 'හඳුනාගැනීම'),
  financials: bi('Financials', 'මුල්‍ය'),
  editBikeSubtitle: bi(
    'Update information for this inventory unit',
    'මෙම තොග ඒකකයේ තොරතුරු යාවත්කාලීන කරන්න'
  ),
  addBikeSubtitle: bi(
    'Enter details for the new motorcycle',
    'නව යතුරුපැදියේ විස්තර ඇතුළත් කරන්න'
  ),
  savingBike: bi('Saving bike…', 'බයික් සුරකිමින්…'),
  saveChanges: bi('Save changes', 'වෙනස්කම් සුරකින්න'),
  addToStock: bi('Add to stock', 'තොගයට එකතු කරන්න'),
  modelChassisRequired: bi(
    'Model and chassis number are required',
    'මාදිලිය සහ රථ අංකය අවශ්‍යයි'
  ),
  repairCostOptional: bi('Repair cost (optional)', 'අලුත්වැඩියා (අවශ්‍ය නම්)'),
  otherCostOptional: bi('Other cost (optional)', 'වෙනත් (අවශ්‍ය නම්)'),
  tabOverview: bi('Overview', 'දළ විශ්ලේෂණය'),
  tabHistory: bi('History', 'ඉතිහාසය'),
  tabLinkedLoans: bi('Linked Loans', 'සම්බන්ධ ණය'),
  bikeDetails: bi('Bike details', 'බයික් විස්තර'),
  registrationLabel: bi('Registration', 'ලියාපදිංචි'),
  chassisLabel: bi('Chassis', 'රථ'),
  engineLabel: bi('Engine', 'එන්ජින්'),
  yearLabel: bi('Year', 'වර්ෂය'),
  colorLabel: bi('Color', 'වර්ණය'),
  listPrice: bi('List price', 'ලැයිස්තු මිල'),
  soldPriceLabel: bi('Sold price', 'විකිණූ මිල'),
  boughtPriceLabel: bi('Bought price', 'මිලදී ගත් මිල'),
  repairAndOther: bi('Repair + other', 'අලුත්වැඩියා + වෙනත්'),
  profitLabel: bi('Profit', 'ලාභය'),
  soldDateLabel: bi('Sold date', 'විකිණූ දිනය'),
  purchaseDateLabel: bi('Purchase date', 'මිලදී ගත් දිනය'),
  soldViaLoan: bi('Sold via loan', 'ණය හරහා විකිණූ'),
  principalFinanced: bi('Principal financed', 'මුල්‍ය කළ මුදල'),
  addedToStockHistory: bi('Added to stock', 'තොගයට එකතු'),
  markedAsSoldHistory: bi('Marked as sold', 'විකිණූ ලෙස සලකුණු'),
  noInstallmentLoanLinked: bi(
    'No installment loan linked to this bike yet.',
    'මෙම බයික් සම්බන්ධ වාරික ණයක් නැත.'
  ),
  markSoldConfirmTitle: bi('Mark as sold?', 'විකිණූ ලෙස සලකුණු කරන්නද?'),
  markSoldHint: bi(
    'Record the actual sale price. Optionally link a bike-installment loan.',
    'සැබෑ විකිණීම් මිල ඇතුළත් කරන්න. අවශ්‍ය නම් බයික් වාරික ණයක් සම්බන්ධ කරන්න.'
  ),
  enterValidSoldPrice: bi('Enter a valid sold price', 'වලංගු විකිණීම් මිල ඇතුළත් කරන්න'),
  linkLoanOptional: bi('Link loan (optional)', 'ණය සම්බන්ධ (අවශ්‍ය නම්)'),
  noLoanLink: bi('No loan link (cash / external)', 'ණය සම්බන්ධ නැත'),
  confirmSold: bi('Confirm sold', 'විකිණූ ලෙස තහවුරු'),
  couldNotUpdateBike: bi('Could not update bike', 'බයික් යාවත්කාලීන කළ නොහැක'),
  allStatus: bi('All Status', 'සියලු තත්ත්ව'),

  // Guarantees extras
  vehicleBooksKpi: bi('Vehicle Books', 'වාහන පොත්'),
  bikesHeld: bi('Bikes held', 'තබාගත් බයික්'),
  searchGuaranteesPlaceholder: bi(
    'Search description, customer, loan...',
    'විස්තර, ගනුදෙනුකරු, ණය...'
  ),
  addGuaranteeBtn: bi('Add guarantee', 'ඇපකර එකතු කරන්න'),
  backToGuarantees: bi('Back to guarantees', 'ඇපකර වෙත ආපසු'),
  reference: bi('Reference', 'යොමුව'),
  ownerOnDocument: bi('Owner on document', 'ලේඛනයේ අයිතිකරු'),
  linkedCustomerLoan: bi('Linked customer & loan', 'සම්බන්ධ ගනුදෙනුකරු සහ ණය'),
  financePrincipal: bi('Finance / principal', 'මුල්‍ය / මුල්‍ය'),
  confirmReturn: bi('Confirm return', 'ආපසු දීම තහවුරු'),
  enterReturnedTo: bi('Enter who received the item.', 'අයිතමය ලැබූ අය ඇතුළත් කරන්න.'),
  returnedLabel: bi('Returned', 'ආපසු දුන්'),
  returnedDate: bi('Date', 'දිනය'),
  selectActiveLoan: bi('-- Select an active loan --', '-- සක්‍රිය ණය තෝරන්න --'),
  selectCustomerFirst: bi(
    '-- Select a customer first --',
    '-- පළමුව ගනුදෙනුකරු තෝරන්න --'
  ),
  photosOptional: bi('Photos (optional)', 'ඡායාරූප (අවශ්‍ය නම්)'),
  uploadPlaceholder: bi('Upload placeholder', 'උඩුගත ස්ථාන තැන'),
  attachmentsLaterDemo: bi(
    'Local demo only — attachments later',
    'දේශීය ඩෙමෝ — ඇමුණුම් පසුව'
  ),
  additionalNotes: bi('Additional notes', 'අමතර සටහන්'),
  summaryTitle: bi('Summary', 'සාරාංශය'),
  confirmAndSave: bi('Confirm & Save', 'තහවුරු කර සුරකින්න'),
  savingGeneric: bi('Saving...', 'සුරකිමින්...'),

  // Create loan extras
  calculation: bi('Calculation', 'ගණනය'),
  currentPrincipal: bi('Current principal', 'වර්තමාන මුල්‍ය'),
  monthlyInterestDueLabel: bi('Monthly interest due', 'මාසික පොලිය ගෙවිය යුතු'),
  principalBalance: bi('Principal balance', 'මුල්‍ය ශේෂය'),
  totalInterest: bi('Total interest', 'මුළු පොලිය'),
  lateFeePerMonthOverdue: bi(
    'Late fee / month if overdue',
    'ප්‍රමාද නම් මාසික ගාස්තු'
  ),
  sellingPriceLabel: bi('Selling price', 'විකිණීම් මිල'),
  removeItem: bi('Remove', 'ඉවත් කරන්න'),
  guaranteeItemNumber: bi('Item', 'අයිතම'),
  selectedBikeLabel: bi('Selected bike', 'තෝරාගත් බයික්'),
  noGuaranteeItemsHint: bi(
    'No items yet — use "Add another guarantee" to start.',
    'අයිතම නැත — ආරම්භ කිරීමට "තව ඇපකරයක්" භාවිතා කරන්න.'
  ),
  vehicleRefLabel: bi(
    'Vehicle number / item reference',
    'වාහන අංකය / අයිතම යොමුව'
  ),
  ownerOnDocLabel: bi('Owner name on document', 'ලේඛනයේ අයිතිකරුගේ නම'),

  // Dashboard extras
  collectionsTarget: bi('Collections / Target', 'එකතු / ඉලක්කය'),
  vsLastMonth: bi('vs last month', 'පසුගිය මාසයට වඩා'),
  daysOverdue: bi('days overdue', 'දින ප්‍රමාද'),
  addBikeLink: bi('Add Bike', 'බයික් එකතු'),
} as const;

export type LabelKey = keyof typeof t;

const BILINGUAL_RE = /^(.+?)\s*\(([^)]+)\)\s*$/;

/** Resolve a bilingual string for the current display mode. */
export function resolveLabel(text: string, mode: DisplayMode): string {
  const match = text.match(BILINGUAL_RE);
  if (!match) return text;
  if (mode === 'both') return text;
  if (mode === 'en') return match[1].trim();
  return match[2].trim();
}

export function getLabel(key: LabelKey, mode: DisplayMode = 'both'): string {
  return resolveLabel(t[key], mode);
}

/** Map internal allocation row type (English) to bilingual display label. */
const ALLOCATION_TYPE_KEYS: Record<string, LabelKey> = {
  Interest: 'allocInterest',
  Principal: 'allocPrincipal',
  'Late fee': 'allocLateFee',
  Installment: 'allocInstallment',
  Advance: 'allocAdvance',
};

export function displayAllocationType(
  internalType: string,
  mode: DisplayMode = 'both'
): string {
  const key = ALLOCATION_TYPE_KEYS[internalType];
  return key ? getLabel(key, mode) : internalType;
}

const BADGE_KEYS: Record<string, LabelKey> = {
  Paid: 'allocPaid',
  Partial: 'allocPartial',
  Remaining: 'allocRemaining',
};

export function displayAllocationBadge(
  badge: string,
  mode: DisplayMode = 'both'
): string {
  const key = BADGE_KEYS[badge];
  return key ? getLabel(key, mode) : badge;
}

/** Map formatEnum keys to label keys for status display. */
export const ENUM_LABEL_KEYS: Record<string, LabelKey> = {
  VEHICLE_BOOK: 'vehicleBook',
  MONTHLY: 'monthlyInstallment',
  CASH: 'statusCash',
  SOLD: 'statusSold',
  IN_STOCK: 'statusInStock',
  CONFIRMED: 'statusConfirmed',
  ACTIVE: 'statusActive',
  OVERDUE: 'statusOverdue',
  COMPLETED: 'statusCompleted',
  VOIDED: 'statusVoided',
  HELD: 'statusHeld',
  RESERVED: 'statusReserved',
  RELEASED: 'statusReturned',
  returned: 'statusReturned',
  PAID: 'statusPaid',
  PENDING: 'statusPending',
  CANCELLED: 'statusCancelled',
  CASH_LOAN: 'typeCashLoan',
  BIKE_INSTALLMENT: 'typeBikeInstallment',
  INTEREST_ONLY_REDUCING_PRINCIPAL: 'monthlyInterestReducing',
  FIXED_TERM_INSTALLMENT: 'fixedTermInstallment',
  BIKE: 'addBike',
  SETTLED: 'statusCompleted',
  CHEQUE: 'statusCheque',
  BANK_TRANSFER: 'statusBankTransfer',
  OTHER: 'statusOther',
};
