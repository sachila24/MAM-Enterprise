import {
  getLabel,
  resolveLabel,
  type DisplayMode,
  type LabelKey,
} from './simpleLabels';

let messageDisplayMode: DisplayMode = 'both';

export function setMessageDisplayMode(mode: DisplayMode): void {
  messageDisplayMode = mode;
}

/** Interpolate `{key}` placeholders in a label string. */
export function formatMessage(
  key: LabelKey,
  params?: Record<string, string | number>,
  mode: DisplayMode = 'both'
): string {
  let text = getLabel(key, mode);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

/** User-facing error or toast text (default bilingual). */
export function uiError(
  key: LabelKey,
  params?: Record<string, string | number>,
  mode: DisplayMode = messageDisplayMode
): string {
  return formatMessage(key, params, mode);
}

const AUDIT_ACTION_KEYS: Record<string, LabelKey> = {
  CREATE: 'activityActionCreate',
  PAYMENT: 'activityActionPayment',
  EARLY_SETTLEMENT: 'activityActionEarlySettlement',
  SEED: 'activityActionSeed',
};

const ACTIVITY_TYPE_KEYS: Record<string, LabelKey> = {
  loan: 'activityTypeLoan',
  payment: 'activityTypePayment',
  bike: 'activityTypeBike',
  customer: 'activityTypeCustomer',
  guarantee: 'activityTypeGuarantee',
  system: 'activityTypeSystem',
};

/** Display label for audit log action codes. */
export function formatActivityAction(
  action: string,
  mode: DisplayMode = 'both'
): string {
  const key = AUDIT_ACTION_KEYS[action.toUpperCase()];
  return key ? getLabel(key, mode) : action;
}

/** Display label for activity entity type. */
export function formatActivityType(
  type: string,
  mode: DisplayMode = 'both'
): string {
  const key = ACTIVITY_TYPE_KEYS[type.toLowerCase()];
  return key ? getLabel(key, mode) : type;
}

/** Resolve stored summary (already bilingual when written via buildAuditSummary). */
export function formatActivitySummary(
  summary: string,
  mode: DisplayMode = 'both'
): string {
  return resolveLabel(summary, mode);
}

/** Build bilingual audit summary at write time. */
export function buildAuditSummary(
  key: LabelKey,
  params?: Record<string, string | number>
): string {
  return formatMessage(key, params, 'both');
}

export type ReportCsvType =
  | 'dailyCollections'
  | 'monthlyCollections'
  | 'activeLoans'
  | 'overdueLoans'
  | 'completedLoans'
  | 'bikeStock'
  | 'guaranteesHeld'
  | 'expenses';

/** Bilingual CSV header row for report exports. */
export function getReportCsvHeaders(
  reportType: ReportCsvType,
  mode: DisplayMode = 'both'
): string[] {
  const h = (key: LabelKey) => getLabel(key, mode);

  switch (reportType) {
    case 'dailyCollections':
    case 'monthlyCollections':
      return [
        h('csvDate'),
        h('csvReceipt'),
        h('csvCustomer'),
        h('csvLoan'),
        h('csvAmount'),
        h('csvDiscount'),
        h('csvMethod'),
        h('csvStatus'),
      ];
    case 'activeLoans':
    case 'overdueLoans':
    case 'completedLoans':
      return [
        h('csvLoan'),
        h('csvCustomer'),
        h('csvType'),
        h('csvAmount'),
        h('csvBalance'),
        h('csvStatus'),
        h('csvDate'),
      ];
    case 'bikeStock':
      return [
        h('csvType'),
        h('colCodeModel'),
        h('colChassisEngine'),
        h('csvAmount'),
        h('csvStatus'),
      ];
    case 'guaranteesHeld':
      return [
        h('csvType'),
        h('csvDescription'),
        h('csvCustomer'),
        h('csvLoan'),
        h('storageLocation'),
        h('csvDate'),
        h('csvStatus'),
      ];
    case 'expenses':
      return [
        h('csvDate'),
        h('csvType'),
        h('csvDescription'),
        h('csvAmount'),
      ];
    default:
      return [];
  }
}

/** Join CSV headers for download. */
export function reportCsvHeaderLine(
  reportType: ReportCsvType,
  mode: DisplayMode = 'both'
): string {
  return getReportCsvHeaders(reportType, mode).join(',');
}
