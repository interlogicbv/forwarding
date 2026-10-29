export type ShipmentRow = {
  id: string;
  salesOrder: number;
  reference: string | null;
  loadingMeter: number | null;
  weight: number | null;
  distance: number | null;
  price: number | null;
  loadingDate: string | null;
  loadingTime: string | null;
  loadingTimeTill: string | null;
  loadingName: string | null;
  loadingCity: string | null;
  loadingZip: string | null;
  loadingCountry: string | null;
  unloadingDate: string | null;
  unloadingTime: string | null;
  unloadingTimeTill: string | null;
  unloadingName: string | null;
  unloadingCity: string | null;
  unloadingZip: string | null;
  unloadingCountry: string | null;
};

export type Shipment = ShipmentRow & {
  cargo: {
    loadingMeter: number | null;
    weight: number | null;
  }[];
};

export type CarrierTrip = {
  ldm: number | null;
  income: number | null;
  costs: number | null;
  result: number | null;
  date: string | null;
  carrier: string | null;
  loadZip: string | null;
  loadCountry: string | null;
  loadCity: string | null;
  unloadZip: string | null;
  unloadCountry: string | null;
  unloadCity: string | null;
  email: string | null;
  phone: string | null;
};

export type ShipmentFilters = {
  search: string;
  country: string;
  loading: "all" | "today" | "upcoming";
};

/** Cargo joins produce several rows for a leg; retain leg-level price once. */
export function groupShipments(rows: ShipmentRow[]): Shipment[] {
  const grouped = new Map<string, Shipment>();

  for (const row of rows) {
    let shipment = grouped.get(row.id);

    if (!shipment) {
      shipment = { ...row, cargo: [] };
      grouped.set(row.id, shipment);
    }

    shipment.cargo.push({
      loadingMeter: row.loadingMeter,
      weight: row.weight,
    });
  }

  return Array.from(grouped.values(), (shipment) => {
    // Preserve unmeasured lines beside measured lines so totals remain honest.
    // A wholly empty left join still represents a shipment without cargo data.
    if (
      shipment.cargo.every(
        (cargo) => cargo.loadingMeter === null && cargo.weight === null,
      )
    ) {
      shipment.cargo = [];
    }
    return shipment;
  });
}

export function cargoTotal(
  shipment: Shipment,
  key: "loadingMeter" | "weight",
): number | null {
  const measurements = shipment.cargo
    .map((cargo) => cargo[key])
    .filter(
      (value): value is number => value !== null && Number.isFinite(value),
    );

  return measurements.length
    ? measurements.reduce((total, value) => total + value, 0)
    : null;
}

/** Some measurements are known, but at least one cargo line is unmeasured. */
export function hasPartialCargo(
  shipment: Shipment,
  key: "loadingMeter" | "weight",
): boolean {
  return (
    shipment.cargo.some((cargo) => Number.isFinite(cargo[key])) &&
    shipment.cargo.some((cargo) => !Number.isFinite(cargo[key]))
  );
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
});

export function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dateFormatter.format(date);
}

export function formatTime(value: string | null): string {
  if (!value) return "—";

  // SQL Server TIME values can arrive as a date anchored at midnight UTC.
  if (value.includes("T")) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "—"
      : date.toISOString().slice(11, 16);
  }

  const match = value.match(
    /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?$/,
  );
  return match ? `${match[1]}:${match[2]}` : "—";
}

export function formatCurrency(value: number | null): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : currencyFormatter.format(value);
}

export function formatNumber(value: number | null, decimals = 1): string {
  return value === null || !Number.isFinite(value)
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: decimals,
      }).format(value);
}

export function formatTimeWindow(
  from: string | null,
  till: string | null,
): string {
  const start = formatTime(from);
  const end = formatTime(till);
  if (start !== "—" && end !== "—") return `${start} – ${end}`;
  if (start !== "—") return `From ${start}`;
  if (end !== "—") return `Until ${end}`;
  return "Time not specified";
}

export function dateKey(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** The operational day follows the desk's Amsterdam timezone. */
export function todayKey(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) =>
    parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function filterShipments(
  shipments: Shipment[],
  filters: ShipmentFilters,
  today: string,
): Shipment[] {
  const search = filters.search.trim().toLocaleLowerCase("en-GB");
  const country = filters.country.trim().toUpperCase();

  return shipments.filter((shipment) => {
    if (
      country &&
      country !== "ALL" &&
      shipment.unloadingCountry?.trim().toUpperCase() !== country
    ) {
      return false;
    }

    const loadingDay = dateKey(shipment.loadingDate);
    if (filters.loading === "today" && loadingDay !== today) return false;
    if (
      filters.loading === "upcoming" &&
      (!loadingDay || loadingDay <= today)
    ) {
      return false;
    }

    if (!search) return true;

    return [
      shipment.reference,
      shipment.salesOrder,
      shipment.loadingName,
      shipment.loadingCity,
      shipment.loadingZip,
      shipment.loadingCountry,
      shipment.unloadingName,
      shipment.unloadingCity,
      shipment.unloadingZip,
      shipment.unloadingCountry,
    ].some((value) =>
      String(value ?? "")
        .toLocaleLowerCase("en-GB")
        .includes(search),
    );
  });
}
