import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getPool } from "@/lib/db";
import { query1, query2, selectedRouteQuery } from "@/lib/queries";

type SelectedRoute = {
  loadZip: string | null;
  loadCountry: string | null;
  unloadZip: string | null;
  unloadCountry: string | null;
};

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function zipPattern(value: string): string {
  // Treat SQL LIKE special characters as literal postcode characters.
  return (
    value
      .trim()
      .replace(/\[/g, "[[]")
      .replace(/%/g, "[%]")
      .replace(/_/g, "[_]") + "%"
  );
}

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? "";

  if (type !== "1" && type !== "2") {
    return NextResponse.json({ error: "Invalid query type." }, { status: 400 });
  }

  if (type === "2" && !GUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "Invalid shipment ID." },
      { status: 400 },
    );
  }

  try {
    const pool = await getPool();

    // Query 1: open shipments, with one row per cargo line.
    if (type === "1") {
      const result = await pool.request().query(query1);

      return NextResponse.json(
        {
          data: result.recordset,
          count: result.recordset.length,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        },
      );
    }

    // Query 2: resolve the selected leg before looking up matching routes.
    const routeResult = await pool
      .request()
      .input("id", sql.UniqueIdentifier, id)
      .query<SelectedRoute>(selectedRouteQuery);

    const route = routeResult.recordset[0];

    if (!route) {
      return NextResponse.json(
        {
          error:
            "This shipment is no longer available. Refresh the shipment list.",
        },
        { status: 404 },
      );
    }

    if (
      !route.loadZip?.trim() ||
      !route.loadCountry?.trim() ||
      !route.unloadZip?.trim() ||
      !route.unloadCountry?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "This shipment is missing route details needed to find carrier history.",
        },
        { status: 422 },
      );
    }

    // Match carrier records by origin and destination postcode and country.
    const result = await pool
      .request()
      .input("loadZip", sql.VarChar(64), zipPattern(route.loadZip))
      .input("loadCountry", sql.VarChar(10), route.loadCountry)
      .input("unloadZip", sql.VarChar(64), zipPattern(route.unloadZip))
      .input("unloadCountry", sql.VarChar(10), route.unloadCountry)
      .query(query2);

    return NextResponse.json(
      {
        route,
        count: result.recordset.length,
        data: result.recordset,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Unable to retrieve shipment data:", error);

    return NextResponse.json(
      { error: "Unable to retrieve shipment data. Please try again." },
      { status: 500 },
    );
  }
}
