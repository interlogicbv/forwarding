import assert from "node:assert/strict";
import test from "node:test";
import {
  cargoTotal,
  dateKey,
  filterShipments,
  formatCurrency,
  formatDate,
  formatNumber,
  formatTime,
  formatTimeWindow,
  groupShipments,
  hasPartialCargo,
  todayKey,
} from "./forwarding.ts";

const row = {
  id: "shipment-1",
  salesOrder: 12345,
  reference: "REF-10",
  loadingMeter: 3.5,
  weight: 800,
  distance: 500,
  price: 1000,
  loadingDate: "2026-10-29T00:00:00.000Z",
  loadingTime: "08:00:00",
  loadingTimeTill: "12:00:00",
  loadingName: "Origin Warehouse",
  loadingCity: "Rotterdam",
  loadingZip: "3011",
  loadingCountry: "NL",
  unloadingDate: "2026-10-30T00:00:00.000Z",
  unloadingTime: "09:00:00",
  unloadingTimeTill: "15:00:00",
  unloadingName: "Delivery Depot",
  unloadingCity: "Hamburg",
  unloadingZip: "20095",
  unloadingCountry: "DE",
};

test("grouping keeps leg price once while preserving every real cargo line", () => {
  const source = [row, { ...row, loadingMeter: 2, weight: 200 }];
  const shipments = groupShipments(source);

  assert.equal(shipments.length, 1);
  assert.equal(shipments[0].price, 1000);
  assert.equal(shipments[0].cargo.length, 2);
  assert.equal(cargoTotal(shipments[0], "loadingMeter"), 5.5);
  assert.equal(cargoTotal(shipments[0], "weight"), 1000);
  assert.equal(source[0].loadingMeter, 3.5);
});

test("missing cargo measurements stay unknown; a measured zero stays zero", () => {
  const [empty] = groupShipments([
    { ...row, loadingMeter: null, weight: null },
  ]);
  assert.deepEqual(empty.cargo, []);
  assert.equal(cargoTotal(empty, "weight"), null);

  const [partial] = groupShipments([
    { ...row, loadingMeter: 0, weight: null },
    { ...row, loadingMeter: null, weight: 200 },
    { ...row, loadingMeter: null, weight: null },
  ]);
  assert.equal(partial.cargo.length, 3);
  assert.equal(cargoTotal(partial, "loadingMeter"), 0);
  assert.equal(cargoTotal(partial, "weight"), 200);
});

test("partial cargo totals flag missing measurements without calling wholly unknown totals partial", () => {
  const [complete] = groupShipments([
    row,
    { ...row, loadingMeter: 2, weight: 200 },
  ]);
  assert.equal(hasPartialCargo(complete, "loadingMeter"), false);
  assert.equal(hasPartialCargo(complete, "weight"), false);

  const [partial] = groupShipments([
    row,
    { ...row, loadingMeter: null, weight: 200 },
  ]);
  assert.equal(hasPartialCargo(partial, "loadingMeter"), true);
  assert.equal(hasPartialCargo(partial, "weight"), false);

  const [emptyLine] = groupShipments([
    row,
    { ...row, loadingMeter: null, weight: null },
  ]);
  assert.equal(emptyLine.cargo.length, 2);
  assert.equal(hasPartialCargo(emptyLine, "loadingMeter"), true);
  assert.equal(hasPartialCargo(emptyLine, "weight"), true);

  const [unknown] = groupShipments([
    { ...row, loadingMeter: null, weight: null },
  ]);
  assert.equal(hasPartialCargo(unknown, "loadingMeter"), false);
  assert.equal(hasPartialCargo(unknown, "weight"), false);

  const [zeroAndInvalid] = groupShipments([
    { ...row, loadingMeter: 0, weight: 0 },
    { ...row, loadingMeter: Number.NaN, weight: Number.POSITIVE_INFINITY },
  ]);
  assert.equal(hasPartialCargo(zeroAndInvalid, "loadingMeter"), true);
  assert.equal(hasPartialCargo(zeroAndInvalid, "weight"), true);
  assert.equal(cargoTotal(zeroAndInvalid, "loadingMeter"), 0);
  assert.equal(cargoTotal(zeroAndInvalid, "weight"), 0);
});

test("shipment filters combine destination, loading day, and searchable fields", () => {
  const shipments = groupShipments([
    row,
    {
      ...row,
      id: "shipment-2",
      loadingDate: "2026-10-30",
      unloadingCountry: "FR",
    },
    { ...row, id: "shipment-3", loadingDate: null, unloadingCountry: "BE" },
  ]);

  assert.deepEqual(
    filterShipments(
      shipments,
      { search: "  hambURG  ", country: "de", loading: "today" },
      "2026-10-29",
    ).map((shipment) => shipment.id),
    ["shipment-1"],
  );
  assert.deepEqual(
    filterShipments(
      shipments,
      { search: "", country: "all", loading: "upcoming" },
      "2026-10-29",
    ).map((shipment) => shipment.id),
    ["shipment-2"],
  );
  for (const search of [
    "12345",
    "origin warehouse",
    "20095",
    "REF-10",
    "nl",
    "delivery depot",
  ]) {
    assert.equal(
      filterShipments(
        [shipments[0]],
        { search, country: "", loading: "all" },
        "2026-10-29",
      ).length,
      1,
    );
  }
  assert.equal(
    filterShipments(
      shipments,
      { search: "missing", country: "all", loading: "all" },
      "2026-10-29",
    ).length,
    0,
  );
});

test("dates use UTC and English formatting while operational today uses Amsterdam", () => {
  assert.equal(formatDate(row.loadingDate), "29 Oct 2026");
  assert.equal(dateKey("2026-10-29T23:00:00-02:00"), "2026-10-30");
  assert.equal(dateKey(null), "");
  assert.equal(dateKey("invalid"), "");
  assert.equal(formatDate("invalid"), "—");
  assert.equal(formatDate(null), "—");

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((entry) => entry.type === type).value;
  assert.equal(todayKey(), `${part("year")}-${part("month")}-${part("day")}`);
});

test("SQL TIME values and partial windows do not invent a missing time", () => {
  assert.equal(formatTime("1970-01-01T08:30:00.000Z"), "08:30");
  assert.equal(formatTime("08:30:00.0000000"), "08:30");
  assert.equal(formatTime("08:30"), "08:30");
  assert.equal(formatTime("25:00"), "—");
  assert.equal(formatTime(null), "—");
  assert.equal(formatTimeWindow("08:00", "16:00"), "08:00 – 16:00");
  assert.equal(formatTimeWindow("08:00", null), "From 08:00");
  assert.equal(formatTimeWindow(null, "16:00"), "Until 16:00");
  assert.equal(formatTimeWindow(null, null), "Time not specified");
});

test("numeric formatting distinguishes unknown values from zero", () => {
  assert.equal(formatCurrency(1234.5), "€1,234.50");
  assert.equal(formatCurrency(0), "€0.00");
  assert.equal(formatCurrency(null), "—");
  assert.equal(formatCurrency(Number.NaN), "—");
  assert.equal(formatNumber(1234.567, 1), "1,234.6");
  assert.equal(formatNumber(null), "—");
  assert.equal(formatNumber(Number.POSITIVE_INFINITY), "—");
});
