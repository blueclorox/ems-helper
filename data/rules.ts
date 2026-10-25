// data/rules.ts

import type { CheckType } from "../types/ems";

// 규칙을 적용할 조건
export type RuleCondition =
  | "always"
  | "goods"
  | "invoiceMissing"
  | "pidUnchecked";

// 국가별 확인 규칙 하나의 형태
export interface RuleDefinition {
  type: CheckType;
  title: string;
  message: string;
  condition: RuleCondition;
}

// 국가별 규칙 묶음
export interface CountryRule {
  countryCode: string;
  rules: RuleDefinition[];
}

// 국가별 EMS 접수 규칙
// 현재 내용은 구조 테스트용 예시이며 실제 접수 기준이 아님.
export const countryRules: CountryRule[] = [
  {
    countryCode: "DE",
    rules: [
      {
        type: "customs",
        title: "통관 정보 확인",
        message: "수출 및 현지 통관에 필요한 정보를 확인하세요.",
        condition: "always",
      },
      {
        type: "invoice",
        title: "인보이스 확인",
        message: "인보이스 첨부 여부와 기재 내용을 확인하세요.",
        condition: "invoiceMissing",
      },
      {
        type: "pid",
        title: "PID 적용 대상 확인",
        message: "해당 우편물의 PID 적용 대상 여부를 확인하세요.",
        condition: "pidUnchecked",
      },
    ],
  },
  {
    countryCode: "US",
    rules: [
      {
        type: "customs",
        title: "통관 정보 확인",
        message: "상품 내용, 가액 및 수취인 정보를 확인하세요.",
        condition: "always",
      },
      {
        type: "invoice",
        title: "인보이스 확인",
        message: "인보이스 첨부 여부와 기재 내용을 확인하세요.",
        condition: "invoiceMissing",
      },
      {
        type: "pid",
        title: "PID 적용 대상 확인",
        message: "해당 우편물의 PID 적용 대상 여부를 확인하세요.",
        condition: "pidUnchecked",
      },
    ],
  },
  {
    countryCode: "FR",
    rules: [
      {
        type: "customs",
        title: "통관 정보 확인",
        message: "수출 및 현지 통관에 필요한 정보를 확인하세요.",
        condition: "always",
      },
      {
        type: "invoice",
        title: "인보이스 확인",
        message: "인보이스 첨부 여부와 기재 내용을 확인하세요.",
        condition: "invoiceMissing",
      },
      {
        type: "pid",
        title: "PID 적용 대상 확인",
        message: "해당 우편물의 PID 적용 대상 여부를 확인하세요.",
        condition: "pidUnchecked",
      },
    ],
  },
  {
    countryCode: "JP",
    rules: [
      {
        type: "customs",
        title: "통관 정보 확인",
        message: "발송 품목과 신고 정보를 확인하세요.",
        condition: "always",
      },
      {
        type: "invoice",
        title: "인보이스 확인",
        message: "인보이스 첨부 여부와 기재 내용을 확인하세요.",
        condition: "invoiceMissing",
      },
    ],
  },
  {
    countryCode: "GB",
    rules: [
      {
        type: "customs",
        title: "통관 정보 확인",
        message: "수출 및 현지 통관에 필요한 정보를 확인하세요.",
        condition: "always",
      },
      {
        type: "invoice",
        title: "인보이스 확인",
        message: "인보이스 첨부 여부와 기재 내용을 확인하세요.",
        condition: "invoiceMissing",
      },
    ],
  },
];