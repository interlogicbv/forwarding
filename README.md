# Forward — Forwarding desk

An internal workspace for planning group 8. View open shipments, search routes, and find carrier records matching the pickup and delivery postcode prefixes and countries.

## Run locally

Install dependencies with `npm ci`. Create a local `.env` with the existing TMS SQL Server connection settings:

- `TMS_DB_SERVER`
- `TMS_DB_PORT` (defaults to 1433)
- `TMS_DB_NAME`
- `TMS_DB_USER`
- `TMS_DB_PASSWORD`

Run `npm run dev` and open http://localhost:3000. Run `npm run build` followed by `npm start` for the production version. The existing Geist font setup needs network access to Google Fonts during the build.

## Working with the desk

- Search open shipments by reference, sales order, company, city, postcode or country.
- Filter by destination and loading date. “Today” follows Europe/Amsterdam.
- Select a shipment to view its route, time windows, cargo and carrier history.
- Search carrier records and sort by date, cost or carrier name.
- Copy shipment details or open a carrier email/phone link. Carrier enquiries omit the internal sales price; email links prepare a draft in your mail client.
- Refresh to reload shipments and their history from the TMS.

Shipment values are counted once per leg, while cargo lines are grouped underneath. Missing measurements display as unknown. A `+` marks a partial cargo total. History counts refer to matching records, since address and carrier joins can return several records for a trip. Historical financial amounts belong to the recorded trip and are not a quote for the selected shipment.

## Checks

- `npm test` — grouping, totals, filters and date/number formatting (Node.js 22.18+ or 24+).
- `npm run lint` — ESLint.
- `npm run build` — production build and TypeScript checks.

The SQL Server driver stays external to the Next.js server bundle so its native Node.js dependencies work on Windows. Database queries remain in `lib/queries.ts`; the API is read-only.
