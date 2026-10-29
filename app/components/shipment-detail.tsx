"use client";

import { useMemo, useState } from "react";
import {
  cargoTotal,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTimeWindow,
  hasPartialCargo,
  type CarrierTrip,
  type Shipment,
} from "@/lib/forwarding";
import { Icon } from "./icons";

type ShipmentDetailProps = {
  shipment: Shipment;
  trips: CarrierTrip[];
  loading: boolean;
  error: string;
  onRetry: () => void;
};

type SortOrder = "newest" | "oldest" | "cost" | "carrier";
const HISTORY_PAGE_SIZE = 20;

function address(
  name: string | null,
  zip: string | null,
  city: string | null,
  country: string | null,
) {
  return (
    [name, [zip, city].filter(Boolean).join(" "), country]
      .filter(Boolean)
      .join(", ") || "Address not available"
  );
}

function shipmentBrief(shipment: Shipment): string {
  return [
    `Shipment: ${shipment.reference || "No reference"}`,
    `Sales order: ${shipment.salesOrder}`,
    "",
    `Pickup: ${address(shipment.loadingName, shipment.loadingZip, shipment.loadingCity, shipment.loadingCountry)}`,
    `${formatDate(shipment.loadingDate)} | ${formatTimeWindow(shipment.loadingTime, shipment.loadingTimeTill)}`,
    "",
    `Delivery: ${address(shipment.unloadingName, shipment.unloadingZip, shipment.unloadingCity, shipment.unloadingCountry)}`,
    `${formatDate(shipment.unloadingDate)} | ${formatTimeWindow(shipment.unloadingTime, shipment.unloadingTimeTill)}`,
    "",
    `Loading metres: ${formatNumber(cargoTotal(shipment, "loadingMeter"))} LDM${hasPartialCargo(shipment, "loadingMeter") ? " (partial)" : ""}`,
    `Weight: ${formatNumber(cargoTotal(shipment, "weight"), 0)} kg${hasPartialCargo(shipment, "weight") ? " (partial)" : ""}`,
    `Distance: ${formatNumber(shipment.distance, 0)} km`,
  ].join("\n");
}

function initials(name: string | null): string {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function compareNullable(
  a: number | null,
  b: number | null,
  direction = 1,
): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * direction;
}

function dateValue(date: string | null): number | null {
  const value = date ? new Date(date).getTime() : Number.NaN;
  return Number.isFinite(value) ? value : null;
}

function Stop({
  shipment,
  delivery = false,
}: {
  shipment: Shipment;
  delivery?: boolean;
}) {
  const name = delivery ? shipment.unloadingName : shipment.loadingName;
  const city = delivery ? shipment.unloadingCity : shipment.loadingCity;
  const zip = delivery ? shipment.unloadingZip : shipment.loadingZip;
  const country = delivery
    ? shipment.unloadingCountry
    : shipment.loadingCountry;
  const date = delivery ? shipment.unloadingDate : shipment.loadingDate;
  const from = delivery ? shipment.unloadingTime : shipment.loadingTime;
  const till = delivery ? shipment.unloadingTimeTill : shipment.loadingTimeTill;

  return (
    <div
      className={`min-w-0${delivery ? " [&_.stop-dot]:rounded-[1px] [&_.stop-dot]:bg-slate-500" : ""}`}
    >
      <div className="text-[11px] uppercase font-medium tracking-[0.8px] flex items-center gap-1.5 text-slate-500">
        <span className="stop-dot w-1.5 h-1.5 border-[1.5px] border-slate-500 rounded-full" />
        {delivery ? "Delivery" : "Pickup"}
      </div>
      <h3 className="text-[22px] font-medium tracking-[-0.65px] mt-2 mb-[5px] leading-[1.3] wrap-anywhere mx-0 [&_.country-code]:ml-2 [&_.country-code]:text-[11px] [&_.country-code]:tracking-normal [&_.country-code]:-translate-y-0.5 [&_.country-code]:py-0.5 [&_.country-code]:px-1 max-desktop:text-xl max-tablet:text-[23px] max-mobile:text-xl max-mobile:leading-[1.4] max-mobile:[&_.country-code]:text-[10px] max-mobile:[&_.country-code]:ml-[5px]">
        {city || "City not available"}
        {country && (
          <span className="country-code font-mono text-[10px] font-medium leading-[1.4] tracking-[0.2px] text-slate-600 bg-slate-100 border border-slate-200 rounded-[3px] align-middle inline-block shrink-0 py-[1px] px-1">
            {country}
          </span>
        )}
      </h3>
      <p className="text-xs font-medium text-slate-600 mt-0 mb-1 wrap-anywhere mx-0 max-mobile:text-xs">
        {name || "Company not available"}
      </p>
      <p className="text-slate-600 text-[11px] m-0 wrap-anywhere leading-[1.5] max-mobile:text-[11px]">
        {[zip, city, country].filter(Boolean).join(" · ") ||
          "Address not available"}
      </p>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 leading-[1.5] mt-[13px] font-medium [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-slate-600 max-mobile:text-[11px]">
        <Icon name="calendar" />
        <span>{formatDate(date)}</span>
      </div>
      <p className="flex items-center gap-1.5 text-[11px] text-slate-600 leading-[1.5] mt-1 mb-0 mx-0 [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-slate-600 max-mobile:text-[10px]">
        <Icon name="clock" />
        {formatTimeWindow(from, till)}
      </p>
    </div>
  );
}

export function ShipmentDetail({
  shipment,
  trips,
  loading,
  error,
  onRetry,
}: ShipmentDetailProps) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOrder>("newest");
  const [page, setPage] = useState(1);
  const [copyState, setCopyState] = useState<{
    id: string;
    status: "copying" | "copied" | "error";
  } | null>(null);
  const currentCopyState =
    copyState?.id === shipment.id ? copyState.status : null;
  const brief = useMemo(() => shipmentBrief(shipment), [shipment]);
  const partialLdm = hasPartialCargo(shipment, "loadingMeter");
  const partialWeight = hasPartialCargo(shipment, "weight");

  const records = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("en-GB");

    return trips
      .map((trip, index) => ({ trip, index }))
      .filter(({ trip }) => {
        if (!term) return true;
        return [
          trip.carrier,
          trip.loadCity,
          trip.unloadCity,
          trip.loadZip,
          trip.unloadZip,
          trip.loadCountry,
          trip.unloadCountry,
          trip.email,
          trip.phone,
        ].some((value) => value?.toLocaleLowerCase("en-GB").includes(term));
      })
      .sort((a, b) => {
        if (sort === "carrier") {
          return (
            (a.trip.carrier || "\uffff").localeCompare(
              b.trip.carrier || "\uffff",
              "en-GB",
            ) || a.index - b.index
          );
        }
        if (sort === "cost") {
          return (
            compareNullable(a.trip.costs, b.trip.costs) || a.index - b.index
          );
        }
        return (
          compareNullable(
            dateValue(a.trip.date),
            dateValue(b.trip.date),
            sort === "newest" ? -1 : 1,
          ) || a.index - b.index
        );
      });
  }, [trips, search, sort]);

  const pageCount = Math.max(1, Math.ceil(records.length / HISTORY_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * HISTORY_PAGE_SIZE;
  const visibleRecords = records.slice(
    pageStart,
    pageStart + HISTORY_PAGE_SIZE,
  );

  async function copyBrief() {
    setCopyState({ id: shipment.id, status: "copying" });
    try {
      await navigator.clipboard.writeText(brief);
      setCopyState({ id: shipment.id, status: "copied" });
    } catch {
      setCopyState({ id: shipment.id, status: "error" });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5.5 overflow-hidden">
      <section
        className="route-card min-h-0 max-h-[45%] shrink-0 border border-slate-200 rounded-[10px] bg-white overflow-x-hidden overflow-y-auto overscroll-y-contain"
        tabIndex={0}
        aria-labelledby="shipment-detail-heading"
      >
        <div className="flex justify-between items-start gap-5 pt-[21px] pb-0 px-6 max-desktop:px-4.5 max-tablet:px-5.5 max-mobile:pt-4.5 max-mobile:pb-0 max-mobile:gap-[9px] max-mobile:px-[17px]">
          <div className="min-w-0 [&_.eyebrow]:text-slate-600 [&_.eyebrow]:text-[10px] [&_.eyebrow]:tracking-[1.3px] [&_.eyebrow]:mb-1.5">
            <div className="eyebrow text-[11px] tracking-[1.6px] uppercase font-semibold text-slate-600 mt-0 mb-2 mx-0">
              Shipment details
            </div>
            <div className="flex items-center gap-[11px] flex-wrap [&_h2]:text-[19px] [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.5px] [&_h2]:font-semibold [&_h2]:m-0 [&_h2]:wrap-anywhere max-mobile:gap-1.5 max-mobile:[&_h2]:text-[17px]">
              <h2 id="shipment-detail-heading">
                {shipment.reference || `Shipment ${shipment.salesOrder}`}
              </h2>
              <span className="inline-flex items-center gap-[5px] rounded bg-brand-50 text-brand-800 text-[10px] font-medium py-[3px] px-[7px] [&_.status-dot]:w-1 [&_.status-dot]:h-1 [&_.status-dot]:bg-brand-600">
                <span className="status-dot w-1.5 h-1.5 rounded-full bg-slate-500 inline-block shrink-0" />
                Open
              </span>
            </div>
            <p className="text-slate-600 text-[11px] mt-[5px] mb-0 mx-0 [&_span]:text-slate-600">
              Sales order <span>{shipment.salesOrder}</span>
            </p>
          </div>
          <div className="relative [&_.button]:mt-2 [&_.button]:text-xs [&_.button]:min-h-8 [&_.button]:py-[7px] [&_.button]:px-2.5 max-mobile:[&_.button]:text-[11px] max-mobile:[&_.button]:py-[7px] max-mobile:[&_.button]:px-2 max-mobile:[&_.button_svg]:w-3 max-mobile:[&_.button_svg]:h-3">
            <button
              className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
              type="button"
              onClick={copyBrief}
              disabled={currentCopyState === "copying"}
            >
              <Icon name={currentCopyState === "copied" ? "check" : "copy"} />
              {currentCopyState === "copied"
                ? "Copied"
                : currentCopyState === "copying"
                  ? "Copying…"
                  : "Copy shipment"}
            </button>
            <span
              className="absolute right-0 top-[45px] w-[210px] text-slate-600 text-[11px] text-right z-1 max-mobile:top-12 max-mobile:text-[10px] max-mobile:w-[150px]"
              role="status"
              aria-live="polite"
            >
              {currentCopyState === "copied" &&
                "Shipment details copied to clipboard."}
              {currentCopyState === "error" &&
                "Could not copy. Please copy the shipment details manually."}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_64px_minmax(0,1fr)] mt-[25px] mb-[23px] mx-6 max-desktop:grid-cols-[minmax(0,1fr)_32px_minmax(0,1fr)] max-desktop:mx-4.5 max-tablet:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] max-tablet:mx-5.5 max-mobile:mt-[25px] max-mobile:mb-5.5 max-mobile:grid-cols-[minmax(0,1fr)_28px_minmax(0,1fr)] max-mobile:gap-[7px] max-mobile:mx-[17px]">
          <Stop shipment={shipment} />
          <div
            className="self-start mt-[37px] justify-self-center w-8 h-7 grid place-items-center text-slate-600 bg-slate-50 border border-slate-100 rounded-[5px] [&_svg]:w-4 [&_svg]:h-4 max-desktop:w-6 max-desktop:h-6 max-mobile:mt-8 max-mobile:w-5.5 max-mobile:h-5.5 max-mobile:[&_svg]:w-[13px] max-mobile:[&_svg]:h-[13px]"
            aria-hidden="true"
          >
            <Icon name="arrow-right" />
          </div>
          <Stop shipment={shipment} delivery />
        </div>

        <dl className="grid grid-cols-4 m-0 bg-slate-50 border-t border-t-slate-100 border-b border-b-slate-100 gap-4 py-[15px] px-6 max-desktop:gap-[9px] max-desktop:px-4.5 max-tablet:gap-5 max-tablet:px-5.5 max-mobile:grid-cols-2 max-mobile:gap-4 max-mobile:py-4 max-mobile:px-[17px]">
          <div className="min-w-0 pr-2.5 border-r border-r-slate-200 last:border-0 last:p-0 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[5px] [&_dt]:text-[11px] [&_dt]:text-slate-600 [&_dt_svg]:h-3 [&_dt_svg]:w-3 [&_dd]:mt-1.5 [&_dd]:mb-0 [&_dd]:text-base [&_dd]:font-medium [&_dd]:tracking-[-0.3px] [&_dd]:text-slate-600 [&_dd]:tabular-nums [&_dd]:wrap-anywhere [&_dd]:mx-0 [&_dd_span]:ml-1 [&_dd_span]:font-normal [&_dd_span]:text-[11px] [&_dd_span]:text-slate-600 max-desktop:[&_dt]:text-[10px] max-desktop:[&_dt]:gap-1 max-desktop:[&_dd]:text-sm max-tablet:[&_dd]:text-lg max-tablet:[&_dt]:text-[11px] max-mobile:[&:nth-child(2)]:border-r-0 max-mobile:[&_dt]:text-[11px] max-mobile:[&_dd]:text-lg">
            <dt>
              <Icon name="box" />
              Loading metres
            </dt>
            <dd
              title={
                partialLdm
                  ? "Known loading metres; some cargo lines have no measurement."
                  : undefined
              }
            >
              {formatNumber(cargoTotal(shipment, "loadingMeter"))}
              {partialLdm && "+"}
              <span>LDM</span>
              {partialLdm && (
                <span className="sr-only">
                  Known loading metres; some cargo lines have no measurement.
                </span>
              )}
            </dd>
          </div>
          <div className="min-w-0 pr-2.5 border-r border-r-slate-200 last:border-0 last:p-0 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[5px] [&_dt]:text-[11px] [&_dt]:text-slate-600 [&_dt_svg]:h-3 [&_dt_svg]:w-3 [&_dd]:mt-1.5 [&_dd]:mb-0 [&_dd]:text-base [&_dd]:font-medium [&_dd]:tracking-[-0.3px] [&_dd]:text-slate-600 [&_dd]:tabular-nums [&_dd]:wrap-anywhere [&_dd]:mx-0 [&_dd_span]:ml-1 [&_dd_span]:font-normal [&_dd_span]:text-[11px] [&_dd_span]:text-slate-600 max-desktop:[&_dt]:text-[10px] max-desktop:[&_dt]:gap-1 max-desktop:[&_dd]:text-sm max-tablet:[&_dd]:text-lg max-tablet:[&_dt]:text-[11px] max-mobile:[&:nth-child(2)]:border-r-0 max-mobile:[&_dt]:text-[11px] max-mobile:[&_dd]:text-lg">
            <dt>
              <Icon name="weight" />
              {partialWeight ? "Known weight" : "Total weight"}
            </dt>
            <dd
              title={
                partialWeight
                  ? "Known weight; some cargo lines have no measurement."
                  : undefined
              }
            >
              {formatNumber(cargoTotal(shipment, "weight"), 0)}
              {partialWeight && "+"}
              <span>kg</span>
              {partialWeight && (
                <span className="sr-only">
                  Known weight; some cargo lines have no measurement.
                </span>
              )}
            </dd>
          </div>
          <div className="min-w-0 pr-2.5 border-r border-r-slate-200 last:border-0 last:p-0 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[5px] [&_dt]:text-[11px] [&_dt]:text-slate-600 [&_dt_svg]:h-3 [&_dt_svg]:w-3 [&_dd]:mt-1.5 [&_dd]:mb-0 [&_dd]:text-base [&_dd]:font-medium [&_dd]:tracking-[-0.3px] [&_dd]:text-slate-600 [&_dd]:tabular-nums [&_dd]:wrap-anywhere [&_dd]:mx-0 [&_dd_span]:ml-1 [&_dd_span]:font-normal [&_dd_span]:text-[11px] [&_dd_span]:text-slate-600 max-desktop:[&_dt]:text-[10px] max-desktop:[&_dt]:gap-1 max-desktop:[&_dd]:text-sm max-tablet:[&_dd]:text-lg max-tablet:[&_dt]:text-[11px] max-mobile:[&:nth-child(2)]:border-r-0 max-mobile:[&_dt]:text-[11px] max-mobile:[&_dd]:text-lg">
            <dt>
              <Icon name="route" />
              Distance
            </dt>
            <dd>
              {formatNumber(shipment.distance, 0)}
              <span>km</span>
            </dd>
          </div>
          <div className="min-w-0 pr-2.5 border-r border-r-slate-200 last:border-0 last:p-0 [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[5px] [&_dt]:text-[11px] [&_dt]:text-slate-600 [&_dt_svg]:h-3 [&_dt_svg]:w-3 [&_dd]:mt-1.5 [&_dd]:mb-0 [&_dd]:text-base [&_dd]:font-medium [&_dd]:tracking-[-0.3px] [&_dd]:text-brand-800 [&_dd]:tabular-nums [&_dd]:wrap-anywhere [&_dd]:mx-0 [&_dd_span]:ml-1 [&_dd_span]:font-normal [&_dd_span]:text-[11px] [&_dd_span]:text-slate-600 max-desktop:[&_dt]:text-[10px] max-desktop:[&_dt]:gap-1 max-desktop:[&_dd]:text-sm max-tablet:[&_dd]:text-lg max-tablet:[&_dt]:text-[11px] max-mobile:[&:nth-child(2)]:border-r-0 max-mobile:[&_dt]:text-[11px] max-mobile:[&_dd]:text-lg">
            <dt>Sales price</dt>
            <dd>{formatCurrency(shipment.price)}</dd>
          </div>
        </dl>
      </section>

      <section
        className="flex min-h-0 flex-1 flex-col bg-white border border-slate-200 rounded-[10px] overflow-hidden"
        aria-labelledby="carrier-history-heading"
        aria-busy={loading}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 pt-5 pb-[17px] px-5.5 [&_p]:text-xs [&_p]:leading-[1.5] [&_p]:text-slate-600 [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:mx-0 max-desktop:px-4.5 max-mobile:pt-[19px] max-mobile:pb-[15px] max-mobile:px-[17px] max-mobile:[&_p]:text-[11px]">
          <div>
            <div className="[&_h2]:m-0 [&_h2]:text-sm [&_h2]:text-brand-950 [&_h2]:font-semibold [&_h2]:tracking-[-0.25px] flex items-center gap-2">
              <h2 id="carrier-history-heading">Carrier history</h2>
              {!loading && !error && (
                <span className="bg-slate-100 border border-slate-200 text-slate-600 rounded-[5px] min-w-6 inline-flex items-center justify-center text-xs font-medium py-0.5 px-1.5">
                  {trips.length}
                </span>
              )}
            </div>
            <p>Matching pickup and delivery postcodes and countries.</p>
          </div>
          <span className="text-[10px] text-slate-600 flex items-center gap-[5px] whitespace-nowrap [&_svg]:w-3 [&_svg]:h-3 max-desktop:hidden">
            <Icon name="clock" />
            Historical records
          </span>
        </div>

        {loading ? (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pt-0 pb-2 px-5.5" role="status">
            <span className="sr-only">Finding carrier history…</span>
            {[0, 1, 2].map((index) => (
              <div
                className="[&>span]:block [&>span]:rounded [&>span]:bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] [&>span]:bg-size-[200%_100%] [&>span]:animate-shimmer [&>span]:h-[15px] grid grid-cols-[2fr_1fr_1fr] gap-[25px] border-t border-t-slate-100 py-6 px-0"
                key={index}
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : error ? (
          <div
            className="[&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:mt-[15px] [&_h3]:text-slate-600 [&_h3]:m-0 [&_p]:text-slate-600 [&_p]:text-xs [&_p]:leading-[1.8] [&_p]:max-w-none [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_.button]:mt-4.5 flex min-h-0 flex-1 items-start gap-[13px] overflow-y-auto overscroll-y-contain bg-slate-50 text-[#7b6748] border-t border-t-slate-100 py-[27px] px-5.5 [&>svg]:shrink-0 [&>svg]:h-5 [&>svg]:w-5"
            role="alert"
          >
            <Icon name="alert" />
            <div>
              <h3>Carrier history could not be loaded</h3>
              <p>{error}</p>
              <button
                className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
                type="button"
                onClick={onRetry}
              >
                <Icon name="refresh" />
                Try again
              </button>
            </div>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain text-center flex-1 py-[45px] px-5.5 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:mt-[15px] [&_h3]:mb-0 [&_h3]:text-slate-600 [&_h3]:mx-0 [&_p]:text-slate-600 [&_p]:text-xs [&_p]:leading-[1.8] [&_p]:max-w-[340px] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_.button]:mt-4.5">
            <div className="h-[49px] w-[49px] grid place-items-center bg-slate-100 border border-slate-100 rounded-xl text-slate-600">
              <Icon name="route" />
            </div>
            <h3>No carrier history on this route</h3>
            <p>
              No records match this shipment’s pickup and delivery postcodes and
              countries.
            </p>
          </div>
        ) : (
          <>
            <div className="flex shrink-0 justify-between items-center gap-4.5 pt-0 pb-4 px-5.5 max-mobile:pt-0 max-mobile:pb-[15px] max-mobile:gap-2 max-mobile:px-[17px]">
              <div className="h-8 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600 flex-1 max-w-[295px] py-0 px-2.5 focus-within:border-slate-400 focus-within:shadow-[0_0_0_2px_#64748b12] [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-brand-950 [&_input]:text-xs [&_input]:h-full [&>svg]:h-[13px] [&>svg]:w-[13px] max-mobile:min-w-0 max-mobile:pl-2 max-mobile:gap-[5px] max-mobile:h-9 max-mobile:[&_input]:text-xs">
                <Icon name="search" />
                <input
                  type="search"
                  aria-label="Search carrier history"
                  placeholder="Search carriers or locations…"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <label className="inline-flex items-center gap-[7px] text-slate-600 [&_select]:appearance-none [&_select]:text-xs [&_select]:bg-transparent [&_select]:border-0 [&_select]:pr-0 [&_select]:pl-[5px] [&_select]:text-slate-600 [&_select]:max-w-[140px] [&_select]:py-[5px] [&>svg]:h-[11px] [&>svg]:w-[11px] max-mobile:[&_select]:text-[11px] max-mobile:[&_select]:max-w-[100px]">
                <span className="sr-only">Sort carrier history</span>
                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as SortOrder);
                    setPage(1);
                  }}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="cost">Lowest cost</option>
                  <option value="carrier">Carrier A–Z</option>
                </select>
                <Icon name="chevron-down" />
              </label>
            </div>

            {records.length === 0 ? (
              <div className="flex min-h-0 flex-col items-center overflow-y-auto overscroll-y-contain text-center flex-1 py-[45px] px-5.5 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:mt-[15px] [&_h3]:mb-0 [&_h3]:text-slate-600 [&_h3]:mx-0 [&_p]:text-slate-600 [&_p]:text-xs [&_p]:leading-[1.8] [&_p]:max-w-[340px] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_.button]:mt-4.5">
                <Icon name="search" />
                <h3>No matching records</h3>
                <p>Try another carrier, location or postcode.</p>
                <button
                  className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div
                className="min-h-0 flex-1 overflow-auto overscroll-contain border-t border-t-slate-100"
                tabIndex={0}
                role="region"
                aria-label="Carrier history results"
              >
                <table className="border-collapse w-full min-w-[740px] text-left [&_thead]:bg-slate-50 [&_th]:sticky [&_th]:top-0 [&_th]:z-1 [&_th]:bg-slate-50 [&_th]:text-[10px] [&_th]:font-medium [&_th]:text-slate-600 [&_th]:uppercase [&_th]:tracking-[0.6px] [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-b-slate-100 [&_th]:p-[11px] [&_th:first-child]:pl-5.5 [&_td:first-child]:pl-5.5 [&_th:last-child]:pr-5.5 [&_td:last-child]:pr-5.5 [&_td]:border-b [&_td]:border-b-slate-100 [&_td]:text-xs [&_td]:align-middle [&_td]:text-slate-600 [&_td]:py-[17px] [&_td]:px-[11px] [&_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-slate-50 [&_.numeric]:text-right [&_.numeric]:whitespace-nowrap [&_.numeric]:tabular-nums [&_.history-cost]:font-semibold [&_.history-cost]:text-slate-600 [&_.result-positive]:text-[#2e7048] [&_.result-positive]:font-medium [&_.result-negative]:text-[#965948] [&_.result-negative]:font-medium wide:[&_td]:text-xs wide:[&_td]:py-5">
                  <thead>
                    <tr>
                      <th scope="col">Carrier</th>
                      <th scope="col">Date / LDM</th>
                      <th scope="col" className="numeric">
                        Revenue
                      </th>
                      <th scope="col" className="numeric">
                        Cost
                      </th>
                      <th scope="col" className="numeric">
                        Result
                      </th>
                      <th scope="col">Contact</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecords.map(({ trip, index }) => (
                      <tr key={index}>
                        <td>
                          <div className="flex items-start gap-[9px]">
                            <span
                              className="grid place-items-center shrink-0 w-7 h-7 text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-100 rounded-md"
                              aria-hidden="true"
                            >
                              {initials(trip.carrier)}
                            </span>
                            <div className="flex flex-col min-w-[110px] max-w-[230px]">
                              <span className="text-brand-800 font-medium text-xs leading-[1.5] wrap-anywhere wide:text-xs">
                                {trip.carrier || "Unknown carrier"}
                              </span>
                              <span className="text-slate-600 text-[10px] leading-[1.5] mt-1 wrap-anywhere">
                                {trip.loadCity || "Unknown"}
                                <span aria-label="to"> → </span>
                                {trip.unloadCity || "Unknown"}
                              </span>
                              <span className="text-[10px] text-slate-600 leading-[1.5] mt-0.5 wrap-anywhere">
                                {[trip.loadCountry, trip.loadZip]
                                  .filter(Boolean)
                                  .join(" ")}
                                <span> → </span>
                                {[trip.unloadCountry, trip.unloadZip]
                                  .filter(Boolean)
                                  .join(" ")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="block whitespace-nowrap text-[11px]">
                            {formatDate(trip.date)}
                          </span>
                          <span className="block whitespace-nowrap text-[10px] text-slate-600 mt-[5px]">
                            {formatNumber(trip.ldm)} LDM
                          </span>
                        </td>
                        <td className="numeric">
                          {formatCurrency(trip.income)}
                        </td>
                        <td className="numeric history-cost">
                          {formatCurrency(trip.costs)}
                        </td>
                        <td
                          className={`numeric ${trip.result !== null && trip.result > 0 ? "result-positive" : trip.result !== null && trip.result < 0 ? "result-negative" : ""}`}
                        >
                          {trip.result !== null && trip.result > 0 ? "+" : ""}
                          {formatCurrency(trip.result)}
                        </td>
                        <td>
                          <div className="flex flex-col gap-1.5 text-[11px] [&_a]:flex [&_a]:items-center [&_a]:gap-[5px] [&_a]:text-slate-500 [&_a_span]:max-w-[165px] [&_a_span]:overflow-hidden [&_a_span]:text-ellipsis [&_a_span]:whitespace-nowrap [&_a:hover]:text-slate-600 [&_a:hover]:underline [&_a:hover]:underline-offset-[3px] [&_svg]:w-[11px] [&_svg]:h-[11px] wide:text-xs">
                            {trip.email && (
                              <a
                                title={trip.email}
                                href={`mailto:${encodeURIComponent(trip.email.trim())}?subject=${encodeURIComponent(`Shipment enquiry · ${shipment.reference || shipment.salesOrder}`)}&body=${encodeURIComponent(`Hello,\n\nDo you have capacity for the following shipment?\n\n${brief}\n\nPlease let us know your availability and rate.\n\nThank you.`)}`}
                              >
                                <Icon name="mail" />
                                <span>{trip.email}</span>
                              </a>
                            )}
                            {trip.phone && (
                              <a
                                title={trip.phone}
                                href={`tel:${trip.phone.replace(/[^\d+*#;,]/g, "")}`}
                              >
                                <Icon name="phone" />
                                <span>{trip.phone}</span>
                              </a>
                            )}
                            {!trip.email && !trip.phone && (
                              <span className="text-slate-600 text-[11px]">
                                No contact details
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex shrink-0 items-center justify-between gap-[15px] border-t border-t-slate-100 bg-slate-50 text-[10px] leading-[1.5] text-slate-600 py-[11px] px-5.5 [&>span:first-child]:shrink-0 [&>span:last-child]:flex [&>span:last-child]:items-center [&>span:last-child]:gap-[5px] [&>span:last-child]:text-right [&_svg]:w-[11px] [&_svg]:h-[11px] max-mobile:flex-row max-mobile:flex-wrap max-mobile:gap-[5px] max-mobile:text-[11px] max-mobile:py-3 max-mobile:px-[17px] max-mobile:[&>span:last-child]:text-left max-mobile:[&>span:last-child]:items-start max-mobile:[&_svg]:mt-[1px]">
              <span role="status" aria-live="polite">
                {records.length
                  ? `${pageStart + 1}–${pageStart + visibleRecords.length}`
                  : "0"}{" "}
                of {records.length}{" "}
                {records.length === 1 ? "record" : "records"}
              </span>
              <nav
                className="inline-flex items-center gap-[9px] text-[11px] text-slate-500 whitespace-nowrap [&_.icon-button_svg]:w-[13px] [&_.icon-button_svg]:h-[13px] max-mobile:[&_.icon-button]:w-8.5 max-mobile:[&_.icon-button]:h-8.5"
                aria-label="Carrier history pages"
              >
                <button
                  type="button"
                  className="icon-button w-[29px] h-[29px] inline-grid place-items-center border border-slate-200 bg-white rounded-[5px] text-slate-500 enabled:hover:bg-slate-100 enabled:hover:border-slate-400 disabled:cursor-default disabled:opacity-35"
                  aria-label="Previous page of carrier history"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <Icon name="arrow-left" />
                </button>
                <span>
                  Page {currentPage} of {pageCount}
                </span>
                <button
                  type="button"
                  className="icon-button w-[29px] h-[29px] inline-grid place-items-center border border-slate-200 bg-white rounded-[5px] text-slate-500 enabled:hover:bg-slate-100 enabled:hover:border-slate-400 disabled:cursor-default disabled:opacity-35"
                  aria-label="Next page of carrier history"
                  disabled={currentPage >= pageCount}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <Icon name="arrow-right" />
                </button>
              </nav>
            </div>
            <div className="flex shrink-0 items-start gap-1.5 bg-slate-50 border-t border-t-slate-100 text-slate-500 text-[10px] leading-[1.6] py-[11px] px-5.5 [&_svg]:w-3 [&_svg]:h-3 [&_svg]:mt-0.5 max-mobile:px-[17px]">
              <Icon name="info" />
              <span>
                Historical amounts refer to the recorded trip. Cargo and
                conditions may differ.
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
