
"use client";

import { useEffect, useMemo, useState } from "react";

import {
  evaluateRules,
  type RuleAction,
} from "../lib/ruleEngine";

import { countries } from "../data/countries";

import type {
  Currency,
  Purpose,
} from "../types/ems";

const currencies: Currency[] = ["KRW", "USD", "EUR"];

function formatAmount(value: number, currency: Currency) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(value);
}

type B2CStatus = "unknown" | "B2C" | "B2B";

export default function Home() {
  const [country, setCountry] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [purpose, setPurpose] = useState<Purpose>("");
  const [invoiceAttached, setInvoiceAttached] = useState(false);
  const [pidChecked, setPidChecked] = useState(false);
  const [b2cStatus, setB2cStatus] = useState<B2CStatus>("unknown");

  // 안내문구 생성기 상태
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageStage, setMessageStage] = useState<"edit" | "result">("edit");
  const [selectedNoticeIds, setSelectedNoticeIds] = useState<string[]>([]);
  const [generatedMessage, setGeneratedMessage] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  const openingNotice = `안녕하세요 고객님 우체국입니다
금일 EMS 신청건 9시 반 - 10시 반 사이 방문드려 픽업 예정입니다`;

  const closingNotice = `내용품에 항공 금제품목(배터리, 향수, 스프레이, 스피커, 칼, 화기 등)이 포함되어 있으면 반송될 수 있으며, 반송 시 반송료가 청구될 수 있습니다.

감사합니다.`;

  const baseNotice = [openingNotice, closingNotice].join("\n\n");

  const additionalNotices = [
    {
      id: "absence",
      label: "부재중 추가안내",
      text: "부재하실 경우 문 앞에 소포를 두시고, 공동현관 비밀번호가 있다면 답신으로 알려주시면 감사드리겠습니다.",
    },
    {
      id: "card",
      label: "카드등록이 안되어있다면",
      text: `카드 등록이 안되어있어
결제하실 카드 번호
카드 유효기간
이 번호로 보내주시면 픽업 가능합니다.`,
    },
    {
      id: "usa",
      label: "미국행이라면",
      text: "미국행 우편물의 경우 자필동의서 작성을 필수로 요구해, 부재중이실 경우 픽업이 불가능합니다.",
    },
    {
      id: "pid-general",
      label: "PID 미확인",
      text: "유럽연합 150유로 이하 B2C 소포의 경우 PID 등록 여부 확인을 해야하며, EMS 프리미엄 접수 대상이니 꼭 등록 여부를 회신 부탁드립니다.",
    },
    {
      id: "pid-specific",
      label: "PID 미확인(독일, 네덜란드, 스웨덴)",
      text: "유럽연합 150유로 이하 B2C 소포의 경우 PID 등록 여부 확인을 해야하오니 꼭 등록 여부를 회신 부탁드립니다.",
    },
  ];

  function closeMessageGenerator() {
    setMessageModalOpen(false);
    setMessageStage("edit");
    setCopyStatus("");
  }

  function generateNotice() {
    const selectedTexts = additionalNotices
      .filter((notice) => selectedNoticeIds.includes(notice.id))
      .map((notice) => notice.text);

    setGeneratedMessage(
      [openingNotice, ...selectedTexts, closingNotice]
        .filter(Boolean)
        .join("\n\n")
    );
    setMessageStage("result");
    setCopyStatus("");
  }

  async function copyGeneratedMessage() {
    try {
      await navigator.clipboard.writeText(generatedMessage);
      setCopyStatus("복사했습니다.");
    } catch {
      setCopyStatus(
        "자동 복사에 실패했습니다. 문구를 길게 눌러 복사해 주세요."
      );
    }
  }

  const selectedCountry = countries.find(
    (item) => item.code === country
  );

  const isEU = selectedCountry?.region === "EU";

  const showInvoiceCheck =
    selectedCountry != null &&
    selectedCountry.needInvoice !== "none" &&
    selectedCountry.needInvoice !== "unknown";

  const showPIDCheck = isEU && b2cStatus === "B2C";

  // 임시 고정 환율
  const exchangeRates = {
    USD_TO_KRW: 1325,
    EUR_TO_KRW: 1485,
    USD_TO_EUR: 0.89,
  };

  useEffect(() => {
    setInvoiceAttached(false);
    setPidChecked(false);
    setB2cStatus("unknown");
  }, [country]);

  // 입력 금액을 KRW, USD, EUR로 환산
  const convertedAmounts = useMemo(() => {
    if (amount.trim() === "") {
      return null;
    }

    const value = Number(amount);

    if (!Number.isFinite(value) || value < 0) {
      return null;
    }

    switch (currency) {
      case "KRW":
        return {
          KRW: value,
          USD: value / exchangeRates.USD_TO_KRW,
          EUR: value / exchangeRates.EUR_TO_KRW,
        };

      case "USD":
        return {
          KRW: value * exchangeRates.USD_TO_KRW,
          USD: value,
          EUR: value * exchangeRates.USD_TO_EUR,
        };

      case "EUR":
        return {
          KRW: value * exchangeRates.EUR_TO_KRW,
          USD: value / exchangeRates.USD_TO_EUR,
          EUR: value,
        };
    }
  }, [amount, currency]);

  const result: RuleAction[] = useMemo(() => {
    return evaluateRules({
      countryCode: country,
      purpose,
      invoiceAttached,
      pidChecked,
      amount,
      currency,
      b2cStatus,
    });
  }, [
    country,
    purpose,
    invoiceAttached,
    pidChecked,
    amount,
    currency,
    b2cStatus,
  ]);

  return (
    <main className="min-h-screen w-full overflow-x-clip bg-slate-100 text-slate-900">
      {/* 상단 제목 */}
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-5">
          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-sky-400 sm:tracking-[0.2em]">
              마포 우체국 소포실
            </div>
            <h1 className="mt-1 text-xl font-bold sm:text-2xl">
              EMS 접수 도우미
            </h1>
          </div>

          <div className="max-w-full shrink-0 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
            DEV by Richard Kim
          </div>
        </div>
      </header>

      {/* 접수 정보 및 체크리스트 */}
      <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-4 px-3 py-4 sm:gap-6 sm:px-8 sm:py-10 lg:grid-cols-[1fr_0.9fr]">
        {/* 접수 정보 */}
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold">접수 정보</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              발송 정보를 입력하면 확인할 항목을 안내합니다.
            </p>
          </div>

          <div className="min-w-0 space-y-6">
            {/* 도착국 */}
            <div className="min-w-0">
              <label
                htmlFor="country"
                className="mb-2 block text-sm font-semibold"
              >
                도착국명 약호
              </label>

              <input
                id="country"
                type="text"
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value.toUpperCase().slice(0, 2));
                }}
                list="country-options"
                maxLength={2}
                placeholder="예: DE, US, JP"
                autoComplete="off"
                className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3.5 text-base uppercase outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:px-4"
              />

              <datalist id="country-options">
                {countries.map((item) => (
                  <option
                    key={item.code}
                    value={item.code}
                    label={item.name}
                  />
                ))}
              </datalist>

              {selectedCountry ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="break-words text-sm font-medium text-slate-700">
                    {selectedCountry.name} ({selectedCountry.code})
                  </span>

                  {selectedCountry.region === "EU" && (
                    <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-bold text-blue-800">
                      EU 회원국
                    </span>
                  )}
                </div>
              ) : country.length > 0 ? (
                <p className="mt-2 text-sm text-red-600">
                  등록된 국가 약호가 없습니다.
                </p>
              ) : null}
            </div>

            {/* 상품 가액 */}
            <div className="min-w-0">
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-semibold"
              >
                상품 가액
              </label>

              <div className="flex min-w-0 gap-2">
                <input
                  id="amount"
                  type="number"
                  min="0"
                  step="any"
                  inputMode="decimal"
                  placeholder="금액 입력"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-0 min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-3.5 text-base outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100 sm:px-4"
                />

                <select
                  aria-label="상품 가액 통화"
                  value={currency}
                  onChange={(e) =>
                    setCurrency(e.target.value as Currency)
                  }
                  className="w-24 shrink-0 rounded-xl border border-slate-300 bg-white px-2 py-3.5 text-base outline-none focus:border-sky-500 sm:w-28 sm:px-3"
                >
                  {currencies.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 발송 목적 */}
            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-semibold">
                발송 목적
              </legend>

              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: "견본 Sample", label: "견본", hint: "Sample" },
                  { value: "선물 Gift", label: "선물", hint: "Gift" },
                  {
                    value: "상품 Merchandise",
                    label: "상품",
                    hint: "Merchandise",
                  },
                ] as { value: Purpose; label: string; hint: string }[]).map(
                  (item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setPurpose(item.value)}
                      aria-pressed={purpose === item.value}
                      className={`flex min-w-0 min-h-16 flex-col items-center justify-center rounded-xl border px-1 py-3 transition sm:px-2 ${
                        purpose === item.value
                          ? "border-sky-600 bg-sky-50 text-sky-700 ring-1 ring-sky-600"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-sm font-bold">
                        {item.label}
                      </span>
                      <span className="mt-0.5 max-w-full break-words text-center text-[10px] text-slate-400 sm:text-[11px]">
                        {item.hint}
                      </span>
                    </button>
                  )
                )}
              </div>
            </fieldset>

            {/* EU B2C 확인 */}
            {selectedCountry?.region === "EU" && (
              <section className="min-w-0 rounded-xl border border-blue-200 bg-blue-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-blue-900">
                  B2C 여부 확인 대상
                </h3>

                <p className="mt-2 text-sm leading-6 text-blue-800">
                  고객에게 발송 형태가 B2C인지 확인하세요.
                  확인 전에는 PID 적용 여부를 최종 판정할 수 없습니다.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setB2cStatus("B2C")}
                    aria-pressed={b2cStatus === "B2C"}
                    className={`min-w-0 rounded-lg border px-2 py-3 text-sm font-semibold sm:px-3 ${
                      b2cStatus === "B2C"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-blue-200 bg-white text-blue-800"
                    }`}
                  >
                    B2C 확인
                  </button>

                  <button
                    type="button"
                    onClick={() => setB2cStatus("B2B")}
                    aria-pressed={b2cStatus === "B2B"}
                    className={`min-w-0 rounded-lg border px-2 py-3 text-sm font-semibold sm:px-3 ${
                      b2cStatus === "B2B"
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-blue-200 bg-white text-blue-800"
                    }`}
                  >
                    B2C 아님
                  </button>
                </div>

                <p className="mt-3 text-xs text-blue-700">
                  현재 확인 상태:{" "}
                  {b2cStatus === "unknown" ? "미확인" : b2cStatus}
                </p>
              </section>
            )}

            {/* 환산 금액 */}
            <div className="grid min-w-0 grid-cols-1 gap-2 min-[380px]:grid-cols-3">
              {(["KRW", "USD", "EUR"] as Currency[]).map((item) => (
                <div
                  key={item}
                  className={`min-w-0 rounded-xl border p-3 ${
                    currency === item
                      ? "border-sky-300 bg-sky-50"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <p className="break-words text-xs font-semibold text-slate-500">
                    {item === "KRW"
                      ? "한국 원화"
                      : item === "USD"
                        ? "미국 달러"
                        : "유로"}
                  </p>

                  <p className="mt-1 break-all text-sm font-bold text-slate-900 sm:break-words sm:text-base">
                    {convertedAmounts
                      ? formatAmount(convertedAmounts[item], item)
                      : "-"}
                  </p>
                </div>
              ))}
            </div>

            <p className="break-words rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
              임시 고정 환율 · USD/KRW 1,325원 · EUR/KRW 1,485원 ·
              USD/EUR 0.89
            </p>

            {/* 확인 항목 */}
            {(showInvoiceCheck || showPIDCheck) && (
              <section className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <h3 className="text-sm font-bold text-slate-800">
                  확인 항목
                </h3>

                {showInvoiceCheck && (
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:bg-sky-50/50">
                    <input
                      type="checkbox"
                      checked={invoiceAttached}
                      onChange={(e) => setInvoiceAttached(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">
                        인보이스 부착 확인 완료
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        해당 국가의 인보이스 요건을 확인한 뒤 체크하세요.
                      </span>
                    </span>
                  </label>
                )}

                {showPIDCheck && (
                  <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-sky-300 hover:bg-sky-50/50">
                    <input
                      type="checkbox"
                      checked={pidChecked}
                      onChange={(e) => setPidChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">
                        PID 입력 여부 확인 완료
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                        고객의 PID 입력이 완료되었는지 확인하세요.
                      </span>
                    </span>
                  </label>
                )}
              </section>
            )}

            {/* 초기화 */}
            <button
              type="button"
              onClick={() => {
                setAmount("");
                setCurrency("EUR");
                setCountry("");
                setPurpose("");
                setInvoiceAttached(false);
                setPidChecked(false);
                setB2cStatus("unknown");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              입력 초기화
            </button>
          </div>
        </section>

        {/* 확인할 조치 */}
        <section className="min-w-0 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="mb-5 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider text-sky-700">
                CHECKLIST
              </div>

              <h2 className="mt-1 text-lg font-bold">확인할 조치</h2>

              <p className="mt-1 break-words text-sm text-slate-500">
                {selectedCountry?.name} ({country}) · {purpose}
              </p>
            </div>

            <span
              className={`max-w-[45%] shrink-0 break-words rounded-lg px-2 py-1.5 text-center text-xs font-bold sm:px-3 ${
                result.some((item) => item.type === "required")
                  ? "bg-red-50 text-red-700"
                  : result.some((item) => item.type === "check")
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {result.some((item) => item.type === "required")
                ? "필수 조치"
                : result.some((item) => item.type === "check")
                  ? "확인 필요"
                  : "참고 사항"}
            </span>
          </div>

          <div className="min-w-0 space-y-3">
            {result.map((item, index) => {
              const styles = {
                required: "border-red-200 bg-red-50",
                check: "border-amber-200 bg-amber-50",
                info: "border-slate-200 bg-slate-50",
              };

              const badges = {
                required: "필수",
                check: "확인",
                info: "참고",
              };

              const badgeStyles = {
                required: "bg-red-100 text-red-700",
                check: "bg-amber-100 text-amber-800",
                info: "bg-slate-200 text-slate-700",
              };

              return (
                <article
                  key={`${item.title}-${index}`}
                  className={`min-w-0 rounded-xl border p-3 sm:p-4 ${styles[item.type]}`}
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-xs font-bold ${badgeStyles[item.type]}`}
                    >
                      {badges[item.type]}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-sm font-bold leading-5 text-slate-900">
                        {item.title}
                      </h3>

                      <p className="mt-1 whitespace-pre-line break-words text-sm leading-6 text-slate-600">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {/* 안내문구 생성기 버튼 */}
      <div className="mx-auto w-full max-w-5xl px-3 pb-4 sm:px-8">
        <button
          type="button"
          onClick={() => {
            setMessageModalOpen(true);
            setMessageStage("edit");
            setCopyStatus("");
          }}
          className="w-full rounded-xl bg-sky-700 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
        >
          ✉ 안내문구 생성기
        </button>
      </div>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-8 text-center text-xs text-slate-400">
        EMS Helper · 개인 업무 보조용 프로토타입
      </footer>

      {/* 안내문구 생성기 모달 */}
      {messageModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-2 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeMessageGenerator();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="message-generator-title"
            className="my-auto max-h-[calc(100dvh-1rem)] w-full min-w-0 max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[90vh]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-5">
              <h2
                id="message-generator-title"
                className="min-w-0 text-lg font-bold"
              >
                {messageStage === "edit"
                  ? "안내문구 생성기"
                  : "생성된 안내문구"}
              </h2>

              <button
                type="button"
                onClick={closeMessageGenerator}
                aria-label="닫기"
                className="shrink-0 rounded-lg px-3 py-2 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            {messageStage === "edit" ? (
              <div className="space-y-5 p-4 sm:p-5">
                <div>
                  <h3 className="mb-2 text-sm font-bold text-slate-800">
                    기본 안내문구
                  </h3>

                  <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-3 font-sans text-sm leading-6 text-slate-700 sm:p-4">
                    {baseNotice}
                  </pre>
                </div>

                <fieldset className="min-w-0">
                  <legend className="mb-3 text-sm font-bold text-slate-800">
                    추가 안내사항
                  </legend>

                  <div className="space-y-2">
                    {additionalNotices.map((notice) => (
                      <label
                        key={notice.id}
                        className="flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-sky-300 hover:bg-sky-50/50"
                      >
                        <input
                          type="checkbox"
                          checked={selectedNoticeIds.includes(notice.id)}
                          onChange={(event) => {
                            setSelectedNoticeIds((current) =>
                              event.target.checked
                                ? [...current, notice.id]
                                : current.filter((id) => id !== notice.id)
                            );
                          }}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-sky-600"
                        />

                        <span className="min-w-0 break-words text-sm font-medium leading-5 text-slate-800">
                          {notice.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <button
                  type="button"
                  onClick={generateNotice}
                  className="w-full rounded-xl bg-sky-700 px-4 py-3.5 text-sm font-bold text-white transition hover:bg-sky-800"
                >
                  안내문구 생성
                </button>
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-5">
                <textarea
                  aria-label="생성된 안내문구"
                  readOnly
                  value={generatedMessage}
                  rows={Math.min(
                    18,
                    Math.max(8, generatedMessage.split("\n").length + 2)
                  )}
                  className="block w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-slate-50 p-3 text-sm leading-6 text-slate-800 outline-none sm:p-4"
                />

                <p
                  aria-live="polite"
                  className="min-h-5 break-words text-sm text-emerald-700"
                >
                  {copyStatus}
                </p>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={copyGeneratedMessage}
                    className="min-w-0 rounded-xl bg-sky-700 px-3 py-3 font-bold text-white transition hover:bg-sky-800 sm:px-4"
                  >
                    복사하기
                  </button>

                  <button
                    type="button"
                    onClick={closeMessageGenerator}
                    className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 font-bold text-slate-700 transition hover:bg-slate-50 sm:px-4"
                  >
                    닫기
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setMessageStage("edit")}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  선택 항목 수정하기
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
