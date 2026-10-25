// types/ems.ts

// 지원하는 통화
export type Currency = "KRW" | "USD" | "EUR";

// 발송 목적
export type Purpose = "견본 Sample" | "선물 Gift" | "상품 Merchandise" | "";

// 인보이스 필요 구분
export type InvoiceRequirement =
  | "all"
  | "merchandise"
  | "none"
  | "unknown";

// 국가 정보
export interface Country {
  code: string;
  name: string;
  englishName: string;
  rateRegion: string;
  region?: string;
  needInvoice: InvoiceRequirement;
}

// 접수 시 확인할 항목의 종류
export type CheckType =
  | "customs"
  | "invoice"
  | "pid"
  | "premium"
  | "warning"
  | "info";

// 판정 결과에 표시할 확인 항목
export interface CheckItem {
  type: CheckType;
  title: string;
  message: string;
}

// 접수 판정 결과
export interface RuleResult {
  countryCode: string;
  checks: CheckItem[];
}