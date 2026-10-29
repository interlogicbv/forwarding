"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  cargoTotal,
  dateKey,
  filterShipments,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTimeWindow,
  groupShipments,
  hasPartialCargo,
  todayKey,
  type CarrierTrip,
  type Shipment,
  type ShipmentFilters,
  type ShipmentRow,
} from "@/lib/forwarding";
import { Icon } from "./components/icons";
import { ShipmentDetail } from "./components/shipment-detail";

type HistoryState = {
  id: string | null;
  status: "loading" | "ready" | "error";
  data: CarrierTrip[];
  error: string;
};

function ShipmentCard({
  shipment,
  selected,
  today,
  onSelect,
}: {
  shipment: Shipment;
  selected: boolean;
  today: string;
  onSelect: () => void;
}) {
  const loadsToday = dateKey(shipment.loadingDate) === today;
  const partialMetres = hasPartialCargo(shipment, "loadingMeter");
  const partialWeight = hasPartialCargo(shipment, "weight");
  return (
    <button
      id={`shipment-${shipment.id}`}
      type="button"
      className={`bg-white p-3.5 border border-slate-200 rounded-[7px] w-full block text-left shrink-0 transition-colors duration-150 hover:bg-slate-50 hover:border-slate-300 aria-pressed:bg-brand-100 aria-pressed:border-brand-800 aria-pressed:shadow-[inset_3px_0_0_#12394f] max-mobile:p-[15px]${selected ? " [&_.country-code]:bg-slate-100 [&_.country-code]:border-slate-200 [&_.country-code]:text-slate-500" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="flex justify-between gap-2.5 items-center text-slate-600">
        <span className="text-[13px] leading-[1.4] font-semibold text-brand-800 wrap-anywhere max-mobile:text-[13px]">
          {shipment.reference || `SO ${shipment.salesOrder}`}
        </span>
        <Icon name="arrow-up-right" size={16} />
      </span>
      <span className="block text-[11px] text-slate-600 mt-[3px] max-mobile:text-xs">
        Sales order {shipment.salesOrder}
      </span>
      <span className="flex gap-2.5 mt-[15px] mb-[13px] mx-0">
        <span
          className="w-[9px] flex flex-col items-center pt-1 pb-3.5 px-0 [&>span]:w-[7px] [&>span]:h-[7px] [&>span]:border-[1.5px] [&>span]:border-slate-500 [&>span]:rounded-full [&>span]:shrink-0 [&>span:last-child]:bg-slate-500 [&>span:last-child]:rounded-[2px] [&>i]:w-[1px] [&>i]:bg-[repeating-linear-gradient(_to_bottom,_#cbd5e1_0_3px,_transparent_3px_6px_)] [&>i]:flex-1 [&>i]:min-h-5 [&>i]:my-1 [&>i]:mx-0"
          aria-hidden="true"
        >
          <span />
          <i />
          <span />
        </span>
        <span className="min-w-0 flex-1 flex flex-col gap-3 [&>span]:flex [&>span]:items-center [&>span]:flex-wrap [&>span]:gap-1.5 [&_strong]:text-[13px] [&_strong]:font-medium [&_strong]:leading-[1.3] [&_strong]:wrap-anywhere [&_small]:text-slate-600 [&_small]:text-[11px] [&_small]:basis-full [&_small]:-mt-1 max-mobile:[&_strong]:text-[13px]">
          <span>
            <strong>{shipment.loadingCity || "Unknown location"}</strong>
            <span className="country-code font-mono text-[10px] font-medium leading-[1.4] tracking-[0.2px] text-slate-600 bg-slate-100 border border-slate-200 rounded-[3px] align-middle inline-block shrink-0 py-[1px] px-1">
              {shipment.loadingCountry || "—"}
            </span>
            <small>{shipment.loadingZip || "Postcode unavailable"}</small>
          </span>
          <span>
            <strong>{shipment.unloadingCity || "Unknown location"}</strong>
            <span className="country-code font-mono text-[10px] font-medium leading-[1.4] tracking-[0.2px] text-slate-600 bg-slate-100 border border-slate-200 rounded-[3px] align-middle inline-block shrink-0 py-[1px] px-1">
              {shipment.unloadingCountry || "—"}
            </span>
            <small>{shipment.unloadingZip || "Postcode unavailable"}</small>
          </span>
        </span>
      </span>
      <span className="flex flex-wrap gap-y-[7px] gap-x-3 items-center text-[11px] text-slate-600 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-[5px] [&>strong]:ml-auto [&>strong]:text-slate-600 [&>strong]:font-semibold [&>strong]:text-[13px] max-mobile:text-xs">
        <span
          title={
            partialMetres
              ? "Known loading metres; some cargo lines have no measurement."
              : undefined
          }
        >
          <Icon name="box" size={13} />
          {formatNumber(cargoTotal(shipment, "loadingMeter"))}
          {partialMetres ? "+" : ""} ldm
          {partialMetres && (
            <span className="sr-only">, partial measurement</span>
          )}
        </span>
        <span
          title={
            partialWeight
              ? "Known weight; some cargo lines have no measurement."
              : undefined
          }
        >
          {formatNumber(cargoTotal(shipment, "weight"), 0)}
          {partialWeight ? "+" : ""} kg
          {partialWeight && (
            <span className="sr-only">, partial measurement</span>
          )}
        </span>
        <strong>{formatCurrency(shipment.price)}</strong>
      </span>
      <span className="mt-[11px] pt-2.5 border-t border-t-slate-100 flex justify-between items-center flex-wrap gap-1 text-[11px] text-slate-600 [&>span:first-child]:inline-flex [&>span:first-child]:items-center [&>span:first-child]:gap-[5px] [&_.loading-today]:text-[#7e6337] [&_.loading-today]:font-medium max-mobile:text-xs">
        <span className={loadsToday ? "loading-today" : ""}>
          <Icon name="calendar" size={13} />
          {loadsToday ? "Today" : formatDate(shipment.loadingDate)}
        </span>
        <span>
          {formatTimeWindow(shipment.loadingTime, shipment.loadingTimeTill)}
        </span>
      </span>
    </button>
  );
}

function ShipmentSkeleton() {
  return (
    <div
      className="min-h-[210px] border border-slate-100 rounded-[7px] flex flex-col gap-[23px] shrink-0 py-[17px] px-3.5 [&_.skeleton:first-child]:w-[60%] [&_.skeleton:nth-child(2)]:w-[85%] [&_.skeleton:nth-child(3)]:w-[70%] [&_.skeleton:last-child]:mt-auto [&_.skeleton:last-child]:w-[50%]"
      aria-hidden="true"
    >
      <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
      <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
      <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
      <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
    </div>
  );
}

export default function Home() {
  const [shipmentRows, setShipmentRows] = useState<ShipmentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const [filters, setFilters] = useState<ShipmentFilters>({
    search: "",
    country: "all",
    loading: "all",
  });
  const [mobileDetail, setMobileDetail] = useState(false);
  const mobileBackRef = useRef<HTMLButtonElement>(null);
  const [history, setHistory] = useState<HistoryState>({
    id: null,
    status: "loading",
    data: [],
    error: "",
  });

  useEffect(() => {
    const controller = new AbortController();
    async function loadShipments() {
      setLoading(true);
      setError("");
      setToday(todayKey());
      try {
        const response = await fetch("/api/queries?type=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error("We couldn't load your shipments. Please try again.");
        const result: { data: ShipmentRow[] } = await response.json();
        if (!Array.isArray(result.data))
          throw new Error(
            "The shipment data could not be read. Please try again.",
          );
        if (!controller.signal.aborted) {
          setShipmentRows(result.data);
          setUpdatedAt(
            new Intl.DateTimeFormat("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Amsterdam",
            }).format(new Date()),
          );
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadShipments();
    return () => controller.abort();
  }, [refresh]);

  const shipments = useMemo(() => groupShipments(shipmentRows), [shipmentRows]);
  const countries = useMemo(
    () =>
      Array.from(
        new Set(
          shipments
            .map((shipment) => shipment.unloadingCountry?.trim().toUpperCase())
            .filter((country): country is string => Boolean(country)),
        ),
      ).sort(),
    [shipments],
  );
  const visibleShipments = useMemo(
    () => filterShipments(shipments, filters, today),
    [shipments, filters, today],
  );
  const selectedShipment =
    visibleShipments.find((shipment) => shipment.id === selectedId) ??
    visibleShipments[0];
  const activeId = selectedShipment?.id ?? null;
  const isFiltered = Boolean(
    filters.search || filters.country !== "all" || filters.loading !== "all",
  );

  useEffect(() => {
    if (!activeId || loading || error) return;
    const controller = new AbortController();
    const shipmentId = activeId;
    async function loadHistory() {
      setHistory({ id: shipmentId, status: "loading", data: [], error: "" });
      try {
        const response = await fetch(
          `/api/queries?type=2&id=${encodeURIComponent(shipmentId)}`,
          { cache: "no-store", signal: controller.signal },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(
            result.error ||
              "We couldn't load the carrier history. Please try again.",
          );
        if (!Array.isArray(result.data))
          throw new Error(
            "The carrier history could not be read. Please try again.",
          );
        if (!controller.signal.aborted)
          setHistory({
            id: shipmentId,
            status: "ready",
            data: result.data,
            error: "",
          });
      } catch (err) {
        if (!controller.signal.aborted)
          setHistory({
            id: shipmentId,
            status: "error",
            data: [],
            error:
              err instanceof Error
                ? err.message
                : "Something went wrong. Please try again.",
          });
      }
    }
    void loadHistory();
    return () => controller.abort();
  }, [activeId, historyRefresh, refresh, loading, error]);

  function resetFilters() {
    setFilters({ search: "", country: "all", loading: "all" });
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <a
        className="fixed left-5 -top-20 z-50 bg-brand-950 text-white rounded-md py-3 px-4.5 focus:top-3"
        href="#shipments"
        onClick={() => {
          setMobileDetail(false);
          requestAnimationFrame(() =>
            document.getElementById("shipments")?.focus(),
          );
        }}
      >
        Skip to shipments
      </a>
      <main className="flex w-full min-h-0 max-w-[1920px] flex-1 flex-col overflow-hidden mx-auto pt-[27px] pb-0 px-9 max-desktop:pt-[25px] max-desktop:pb-0 max-desktop:px-[25px] max-tablet:pt-5.5 max-tablet:pb-0 max-tablet:px-5 max-mobile:pt-[23px] max-mobile:pb-0 max-mobile:px-3.5">
        <section
          className="flex shrink-0 items-center justify-between gap-5 mb-6 [&_h1]:text-[31px] [&_h1]:leading-[1.15] [&_h1]:font-semibold [&_h1]:tracking-[-1.25px] [&_h1]:m-0 [&_h1>span]:text-brand-600 max-tablet:[&_h1]:text-[28px] max-mobile:items-center max-mobile:mb-[21px] max-mobile:gap-3 max-mobile:[&_h1]:text-[26px] max-mobile:[&_.eyebrow]:text-[9px] max-mobile:[&_.eyebrow]:tracking-[1.3px]"
          aria-labelledby="page-title"
        >
          <div>
            <h1 id="page-title">
              Forwarding desk<span>.</span>
            </h1>
            <p className="mt-[9px] mb-0 text-slate-600 text-[13px] mx-0 max-mobile:max-w-[230px] max-mobile:text-xs max-mobile:leading-[1.7] max-mobile:mt-[7px]">
              Open shipments and carrier history.
            </p>
          </div>
          <div className="flex items-center gap-5.5 max-mobile:[&_.button]:text-xs max-mobile:[&_.button]:min-h-[33px] max-mobile:[&_.button]:py-2 max-mobile:[&_.button]:px-2.5">
            <span className="flex items-center gap-2 text-xs text-slate-600 [&_strong]:ml-[1px] [&_strong]:text-xs [&_strong]:font-semibold [&_strong]:text-brand-800 max-tablet:hidden">
              <Icon name="layers" size={15} />
              Plangroup <strong>FORWARDING</strong>
            </span>
            <button
              className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
              onClick={() => setRefresh((value) => value + 1)}
              disabled={loading}
            >
              <Icon
                name="refresh"
                size={15}
                className={loading ? "animate-[spin_1.4s_linear_infinite]" : ""}
              />
              {loading ? "Refreshing" : "Refresh"}
            </button>
          </div>
        </section>
        <div
          className={`grid min-h-0 flex-1 grid-cols-[340px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)] gap-[23px] overflow-hidden wide:grid-cols-[375px_minmax(0,1fr)] max-desktop:grid-cols-[310px_minmax(0,1fr)] max-desktop:gap-4.5 max-tablet:grid-cols-1${mobileDetail && selectedShipment ? " max-tablet:[&>aside]:hidden max-tablet:[&>section]:flex" : ""}`}
        >
          <aside
            id="shipments"
            className="min-h-0 bg-white border border-slate-200 rounded-[10px] flex flex-col overflow-hidden scroll-mt-[15px] max-tablet:max-h-none"
            aria-label="Open shipments"
            tabIndex={-1}
          >
            <div className="shrink-0 pt-5 pb-[15px] flex items-center justify-between text-slate-600 px-4.5 max-mobile:pt-4.5">
              <div className="flex items-center gap-[9px] [&_h2]:m-0 [&_h2]:text-sm [&_h2]:text-brand-950 [&_h2]:font-semibold [&_h2]:tracking-[-0.25px]">
                <h2>Open shipments</h2>
                <span className="bg-slate-100 border border-slate-200 text-slate-600 rounded-[5px] min-w-6 inline-flex items-center justify-center text-xs font-medium py-0.5 px-1.5">
                  {loading || error ? "—" : shipments.length}
                </span>
              </div>
              <Icon name="truck" size={19} />
            </div>
            <div className="shrink-0 py-0 px-[17px] max-mobile:[&_input]:text-xs">
              <div className="h-9 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md text-slate-600 py-0 px-2.5 focus-within:border-slate-400 focus-within:shadow-[0_0_0_2px_#64748b12] [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-brand-950 [&_input]:text-xs [&_input]:h-full max-mobile:h-10">
                <Icon name="search" size={16} />
                <input
                  aria-label="Search shipments"
                  placeholder="Search reference, city or postcode…"
                  value={filters.search}
                  onChange={(event) =>
                    setFilters({ ...filters, search: event.target.value })
                  }
                />
                {filters.search && (
                  <button
                    className="border-0 bg-transparent p-0.5 text-slate-600 flex"
                    type="button"
                    aria-label="Clear shipment search"
                    onClick={() => setFilters({ ...filters, search: "" })}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-[7px] mt-[9px] max-mobile:[&_select]:text-xs">
                <label className="focus-within:border-slate-400 focus-within:shadow-[0_0_0_2px_#64748b12] flex items-center gap-1.5 border border-slate-200 rounded-[5px] min-w-0 text-slate-600 h-[31px] py-0 px-2 [&_select]:appearance-none [&_select]:border-0 [&_select]:bg-transparent [&_select]:text-xs [&_select]:text-slate-600 [&_select]:w-full [&_select]:min-w-0 [&_select]:p-0 [&_select:focus-visible]:outline-offset-[1px] max-mobile:h-[35px]">
                  <Icon name="filter" size={13} />
                  <select
                    aria-label="Destination country"
                    value={filters.country}
                    onChange={(event) =>
                      setFilters({ ...filters, country: event.target.value })
                    }
                  >
                    <option value="all">All destinations</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                  <Icon name="chevron-down" size={12} />
                </label>
                <label className="focus-within:border-slate-400 focus-within:shadow-[0_0_0_2px_#64748b12] flex items-center gap-1.5 border border-slate-200 rounded-[5px] min-w-0 text-slate-600 h-[31px] py-0 px-2 [&_select]:appearance-none [&_select]:border-0 [&_select]:bg-transparent [&_select]:text-xs [&_select]:text-slate-600 [&_select]:w-full [&_select]:min-w-0 [&_select]:p-0 [&_select:focus-visible]:outline-offset-[1px] max-mobile:h-[35px]">
                  <Icon name="calendar" size={13} />
                  <select
                    aria-label="Loading date"
                    value={filters.loading}
                    onChange={(event) =>
                      setFilters({
                        ...filters,
                        loading: event.target
                          .value as ShipmentFilters["loading"],
                      })
                    }
                  >
                    <option value="all">All dates</option>
                    <option value="today">Loading today</option>
                    <option value="upcoming">Upcoming</option>
                  </select>
                  <Icon name="chevron-down" size={12} />
                </label>
              </div>
            </div>
            <div className="flex shrink-0 items-center justify-between pt-4 pb-[11px] text-[11px] text-slate-600 px-4.5 [&_button]:text-[11px] [&_button]:text-brand-800 [&_button]:p-0 [&_button]:bg-transparent [&_button]:border-0 [&_button]:underline [&_button]:underline-offset-[3px] max-mobile:text-xs">
              <span>
                {loading
                  ? "Loading your shipments…"
                  : error
                    ? "Connection unavailable"
                    : `${visibleShipments.length} ${visibleShipments.length === 1 ? "shipment" : "shipments"}${isFiltered ? ` of ${shipments.length}` : ""}`}
              </span>
              {isFiltered ? (
                <button onClick={resetFilters}>Reset filters</button>
              ) : (
                <span>Loading date ↑</span>
              )}
            </div>
            <div
              className="overflow-x-hidden overflow-y-auto overscroll-y-contain pt-0 pb-3.5 flex flex-col gap-[9px] flex-1 min-h-0 px-[11px] max-tablet:grid max-tablet:grid-cols-2 max-tablet:content-start max-mobile:flex max-mobile:gap-2.5 max-mobile:pt-0 max-mobile:pb-3.5 max-mobile:px-[11px]"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="sr-only" role="status">
                    Loading shipments
                  </span>
                  <ShipmentSkeleton />
                  <ShipmentSkeleton />
                  <ShipmentSkeleton />
                </>
              ) : error ? (
                <div
                  className="flex flex-col items-center justify-center text-center flex-1 py-[45px] px-5.5 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:mt-[15px] [&_h3]:mb-0 [&_h3]:text-slate-600 [&_h3]:mx-0 [&_p]:text-slate-600 [&_p]:text-xs [&_p]:leading-[1.8] [&_p]:max-w-[340px] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_.button]:mt-4.5 max-tablet:col-span-full max-tablet:min-h-[300px] [&>svg]:text-[#83644c]"
                  role="alert"
                >
                  <Icon name="alert" size={25} />
                  <h3>Connection interrupted</h3>
                  <p>{error}</p>
                  <button
                    className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
                    onClick={() => setRefresh((value) => value + 1)}
                  >
                    <Icon name="refresh" size={14} />
                    Try again
                  </button>
                </div>
              ) : !visibleShipments.length ? (
                <div className="flex flex-col items-center justify-center text-center flex-1 py-[45px] px-5.5 [&_h3]:text-[13px] [&_h3]:font-medium [&_h3]:mt-[15px] [&_h3]:mb-0 [&_h3]:text-slate-600 [&_h3]:mx-0 [&_p]:text-slate-600 [&_p]:text-xs [&_p]:leading-[1.8] [&_p]:max-w-[340px] [&_p]:mt-2 [&_p]:mb-0 [&_p]:mx-0 [&_.button]:mt-4.5 max-tablet:col-span-full max-tablet:min-h-[300px]">
                  <span className="h-[49px] w-[49px] grid place-items-center bg-slate-100 border border-slate-100 rounded-xl text-slate-600">
                    <Icon name={isFiltered ? "search" : "check"} size={25} />
                  </span>
                  <h3>
                    {isFiltered ? "No matching shipments" : "All clear for now"}
                  </h3>
                  <p>
                    {isFiltered
                      ? "Try another reference, city or destination."
                      : "There are no open shipments in planning group 8. Refresh to check for new work."}
                  </p>
                  {isFiltered && (
                    <button
                      className="button inline-flex items-center justify-center gap-[7px] min-h-9 border rounded-md font-medium text-xs leading-[1.3] whitespace-nowrap transition-colors duration-150 bg-white border-slate-200 shadow-[0_1px_2px_#06192704] py-[9px] px-[13px] [&>svg]:w-3.5 [&>svg]:h-3.5 enabled:hover:bg-slate-50 enabled:hover:border-slate-400"
                      onClick={resetFilters}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                visibleShipments.map((shipment) => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                    selected={shipment.id === activeId}
                    today={today}
                    onSelect={() => {
                      setSelectedId(shipment.id);
                      setMobileDetail(true);
                      requestAnimationFrame(() => {
                        if (window.matchMedia("(max-width: 899px)").matches)
                          mobileBackRef.current?.focus();
                      });
                    }}
                  />
                ))
              )}
            </div>
            <div className="shrink-0 border-t border-t-slate-200 flex items-center gap-[7px] text-[11px] text-slate-600 bg-slate-50 py-3 px-[17px]">
              <span
                className={`status-dot w-1.5 h-1.5 rounded-full bg-slate-500 inline-block shrink-0${error ? " [&&]:bg-[#c08b69]" : ""}`}
              />
              <span role="status">
                {loading
                  ? "Connecting to TMS"
                  : error
                    ? "Could not sync with TMS"
                    : updatedAt
                      ? `Last synced ${updatedAt} · Amsterdam`
                      : "Connected to TMS"}
              </span>
            </div>
          </aside>
          <section
            className="flex min-w-0 min-h-0 flex-col overflow-hidden pr-1 max-tablet:hidden max-tablet:p-0"
            aria-label="Selected shipment and carrier history"
          >
            <button
              ref={mobileBackRef}
              className="hidden shrink-0 max-tablet:flex max-tablet:items-center max-tablet:gap-[7px] max-tablet:border-0 max-tablet:bg-transparent max-tablet:text-slate-600 max-tablet:text-xs max-tablet:pt-0 max-tablet:pb-[15px] max-tablet:px-0"
              onClick={() => {
                setMobileDetail(false);
                requestAnimationFrame(() =>
                  (
                    document.getElementById(`shipment-${activeId}`) ??
                    document.getElementById("shipments")
                  )?.focus(),
                );
              }}
            >
              <Icon name="arrow-left" size={16} />
              Back to shipments
            </button>
            {loading ? (
              <div
                className="flex min-h-0 flex-1 flex-col gap-5.5 overflow-hidden [&_.route-card]:flex [&_.route-card]:flex-col [&_.route-card]:gap-5 [&_.route-card]:p-6 [&_.route-card]:min-h-0 [&_.route-card]:bg-white [&_.route-card]:border [&_.route-card]:border-slate-200 [&_.route-card]:rounded-[10px] [&_.skeleton:first-child]:w-[35%] [&_.skeleton:nth-child(2)]:mt-7.5 [&_.skeleton:nth-child(2)]:w-[80%] [&_.skeleton:nth-child(2)]:h-8 [&_.skeleton:nth-child(3)]:mt-5 [&_.skeleton:nth-child(3)]:w-[60%]"
                role="status"
              >
                <div className="route-card min-h-0 max-h-[45%] shrink-0 border border-slate-200 rounded-[10px] bg-white overflow-hidden">
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden p-6 bg-white border border-slate-200 rounded-[10px]">
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                  <span className="skeleton block rounded bg-[linear-gradient(100deg,_#f1f5f9_20%,_#f8fafc_40%,_#f1f5f9_60%)] bg-size-[200%_100%] animate-shimmer h-[15px]" />
                </div>
                <span className="sr-only">Loading shipment details</span>
              </div>
            ) : error || !selectedShipment ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain border border-dashed border-slate-200 rounded-[10px] bg-slate-100 flex flex-col items-center justify-center text-center py-12.5 px-[25px] [&_.eyebrow]:text-[10px] [&_.eyebrow]:text-slate-600 [&_h2]:text-[clamp(22px,_2.5vw,_34px)] [&_h2]:font-normal [&_h2]:leading-[1.3] [&_h2]:tracking-[-0.9px] [&_h2]:mt-1.5 [&_h2]:mb-0 [&_h2]:text-slate-600 [&_h2]:mx-0 [&>p:not(.eyebrow)]:text-slate-600 [&>p:not(.eyebrow)]:text-xs [&>p:not(.eyebrow)]:leading-[1.9] [&>p:not(.eyebrow)]:max-w-[300px] [&>p:not(.eyebrow)]:mt-[17px] [&>p:not(.eyebrow)]:mb-0 [&>p:not(.eyebrow)]:mx-0">
                <div
                  className="flex items-center mb-[35px] [&>span]:w-[59px] [&>span]:h-[59px] [&>span]:rounded-[13px] [&>span]:border [&>span]:border-slate-200 [&>span]:grid [&>span]:place-items-center [&>span]:bg-slate-50 [&>span]:text-slate-600 [&>span]:-rotate-7 [&>span]:shadow-[0_6px_14px_#47556905] [&>span:last-child]:rotate-7 [&>span:last-child]:bg-slate-100 [&>span:last-child]:text-slate-500 [&>i]:w-17.5 [&>i]:h-[1px] [&>i]:border-t [&>i]:border-dashed [&>i]:border-t-slate-300"
                  aria-hidden="true"
                >
                  <span>
                    <Icon name="box" size={25} />
                  </span>
                  <i />
                  <span>
                    <Icon name="truck" size={25} />
                  </span>
                </div>
                <p className="eyebrow text-[11px] tracking-[1.6px] uppercase font-semibold text-slate-600 mt-0 mb-2 mx-0">
                  MAKE YOUR NEXT CONNECTION
                </p>
                <h2>
                  A familiar route.
                  <br />
                  Your next opportunity.
                </h2>
                <p>
                  {error
                    ? "Your shipments and carrier history will appear here once the connection is restored."
                    : isFiltered
                      ? "Adjust your filters to find a shipment and explore the carriers who know the route."
                      : "Select an open shipment to see its route, cargo and matching carrier history."}
                </p>
                <div className="flex items-center gap-[7px] mt-12 text-[11px] text-slate-600">
                  <Icon name="route" size={15} />
                  <span>Route knowledge. Ready when you are.</span>
                </div>
              </div>
            ) : (
              <ShipmentDetail
                key={selectedShipment.id}
                shipment={selectedShipment}
                trips={history.id === activeId ? history.data : []}
                loading={
                  history.id !== activeId || history.status === "loading"
                }
                error={history.id === activeId ? history.error : ""}
                onRetry={() => setHistoryRefresh((value) => value + 1)}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
