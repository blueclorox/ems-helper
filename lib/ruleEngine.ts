// lib/ruleEngine.ts

import type { Purpose } from "../types/ems";
import { countryRules } from "../data/rules";
import { countries } from "../data/countries";

// 화면에서 사용하는 결과 유형
export type ActionType = "required" | "check" | "info";

export interface RuleInput {
  countryCode: string;
  purpose: Purpose;
  invoiceAttached: boolean;
  pidChecked: boolean;
  amount: string;
  currency: "KRW" | "USD" | "EUR";
  b2cStatus: "unknown" | "B2C" | "B2B";
}

export interface RuleAction {
  title: string;
  description: string;
  type: ActionType;
}

// 고정 환율
const EXCHANGE_RATES = {
  USD_TO_KRW: 1325,
  EUR_TO_KRW: 1485,
  USD_TO_EUR: 0.89,
};

// 상품 가액을 유로로 환산
function convertToEUR(
  value: number,
  currency: RuleInput["currency"],
): number {
  switch (currency) {
    case "KRW":
      return value / EXCHANGE_RATES.EUR_TO_KRW;

    case "USD":
      return value * EXCHANGE_RATES.USD_TO_EUR;

    case "EUR":
      return value;
  }
}

// 금액 표시
function formatAmount(
  value: number,
  currency: RuleInput["currency"],
): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

export function evaluateRules(input: RuleInput): RuleAction[] {
  const actions: RuleAction[] = [];

  const value = Number(input.amount);

  const hasAmount =
    input.amount.trim() !== "" &&
    Number.isFinite(value) &&
    value >= 0;

  // 선택한 국가 찾기
  const country = countries.find(
    (item) => item.code === input.countryCode,
  );

  // 등록된 국가가 없는 경우
  if (!country) {
    return [
      {
        title: "등록되지 않은 국가",
        description:
          "국가 목록에서 해당 국가를 찾을 수 없습니다. 국가 약호를 확인하세요.",
        type: "required",
      },
    ];
  }

  const isEU = country.region === "EU";

  // --------------------------------------------------
  // 1단계: EU 국가의 B2C 여부 확인
  // --------------------------------------------------

  if (isEU && input.b2cStatus === "unknown") {
    return [
      {
        title: "EU 회원국입니다. B2C 여부를 확인하세요.",
        description:
          "고객에게 B2C 발송인지 확인하세요. 확인하기 전에는 PID 적용 여부를 판정할 수 없습니다.",
        type: "check",
      },
    ];
  }

  // --------------------------------------------------
  // 2단계: B2C 여부 및 상품 가액 확인
  // --------------------------------------------------

  const isPIDCandidate =
    isEU && input.b2cStatus === "B2C";

  let amountInEUR: number | null = null;

  if (isPIDCandidate) {
    if (!hasAmount) {
      return [
        {
          title: "상품 가액 입력 필요",
          description:
            "PID 적용 여부를 판단하려면 상품 가액을 입력하세요.",
          type: "check",
        },
      ];
    }

    amountInEUR = convertToEUR(value, input.currency);

    // 150유로 초과: 기존 접수 절차 적용
    if (amountInEUR > 150) {
      actions.push({
        title: "PID 특별 판정 대상 아님",
        description:
          `상품가액이 €150을 초과합니다. 유로 환산액은 €${amountInEUR.toFixed(2)}입니다. 기존 접수 절차에 따라 확인하세요.`,
        type: "info",
      });
    } else {
      // 150유로 이하: 지정 국가 여부 확인
      const designatedCountries = ["DE", "NL", "SE"];

      const isDesignatedCountry =
        designatedCountries.includes(input.countryCode);

      // PID 미입력은 접수 불가
      if (!input.pidChecked) {
        actions.push({
          title: "접수 불가: PID 입력 필요",
          description:
            "고객에게 PID 입력을 요청한 후 재접수하도록 안내하세요.",
          type: "required",
        });
      } else {
        // PID 입력 완료
        const needsPremium =
          !isDesignatedCountry ||
          (
            input.countryCode === "DE" &&
            amountInEUR >= 45
          );

        if (needsPremium) {
          let reason = "";

          if (!isDesignatedCountry) {
            reason =
              "독일·네덜란드·스웨덴 외의 EU 국가입니다.";
          } else if (input.countryCode === "DE") {
            reason =
              "독일행 상품가액이 €45 이상입니다.";
          }

          actions.push({
            title: "프리미엄으로 접수",
            description:
              `${reason} PID 입력이 완료되었으므로 프리미엄으로 접수하세요.`,
            type: "required",
          });
        } else {
          actions.push({
            title: "PID 확인 완료: 접수 가능",
            description:
              "지정 국가이며 PID 입력이 완료되었습니다. 기존 접수 요건도 확인하세요.",
            type: "info",
          });
        }
      }
    }
  }

  // --------------------------------------------------
  // 3단계: 기존 국가별 규칙 적용
  // --------------------------------------------------

  const countryRule = countryRules.find(
    (item) => item.countryCode === input.countryCode,
  );

  if (!countryRule) {
    actions.push({
      title: "국가별 세부 규칙 확인 필요",
      description:
        "이 국가의 세부 규칙이 등록되지 않았습니다. 기존 접수 기준을 확인하세요.",
      type: "check",
    });
  } else {
    for (const rule of countryRule.rules) {
      // PID는 위에서 새 판정 흐름으로 처리
      if (rule.type === "pid") {
        continue;
      }

      // 인보이스는 국가 데이터의 needInvoice로 판정
      if (
        rule.type === "invoice" ||
        rule.condition === "invoiceMissing"
      ) {
        continue;
      }

      let shouldApply = false;

      switch (rule.condition) {
        case "always":
          shouldApply = true;
          break;

        case "goods":
          shouldApply = input.purpose === "상품 Merchandise";
          break;

        case "pidUnchecked":
          shouldApply = false;
          break;
      }

      if (!shouldApply) {
        continue;
      }

      actions.push({
        title: rule.title,
        description: rule.message,
        type: rule.type === "warning" ? "required" : "check",
      });
    }
  }

  // --------------------------------------------------
  // 4단계: 국가별 인보이스 조건
  // --------------------------------------------------

  switch (country.needInvoice) {
    case "all":
      if (!input.invoiceAttached) {
        actions.push({
          title: "인보이스 부착 필요",
          description:
            "등록된 기준에 따르면 발송 목적과 관계없이 인보이스 부착이 필요합니다.",
          type: "required",
        });
      }
      break;

    case "merchandise":
      if (
        input.purpose === "상품 Merchandise" &&
        !input.invoiceAttached
      ) {
        actions.push({
          title: "인보이스 부착 필요",
          description:
            "등록된 기준에 따르면 상품 발송 시 인보이스 부착이 필요합니다.",
          type: "required",
        });
      }
      break;

    case "none":
      break;

    case "unknown":
      actions.push({
        title: "인보이스 요건 확인 필요",
        description:
          "이 국가의 인보이스 조건이 아직 확인되지 않았습니다. 접수 기준을 확인하세요.",
        type: "check",
      });
      break;
  }

  // --------------------------------------------------
  // 5단계: 미국 자필 동의서
  // --------------------------------------------------

  if (input.countryCode === "US") {
    const copies = input.purpose === "선물 Gift" ? 2 : 1;

    actions.push({
      title: "자필 동의서 작성",
      description:
        `발송 목적이 '${input.purpose}'이므로 자필 동의서 ${copies}매를 작성하세요.`,
      type: "required",
    });
  }

  // --------------------------------------------------
  // 6단계: 상품 가액 표시
  // --------------------------------------------------

  if (hasAmount) {
    actions.push({
      title: "입력 가액 확인",
      description:
        `입력한 상품 가액은 ${formatAmount(value, input.currency)}입니다.`,
      type: "info",
    });
  } else {
    actions.push({
      title: "상품 가액 입력",
      description:
        "정확한 판정을 위해 상품 가액을 입력하세요.",
      type: "info",
    });
  }

  return actions;
}