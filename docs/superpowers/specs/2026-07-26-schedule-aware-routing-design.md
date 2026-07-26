# Schedule-aware routing (wait times + transfer walking) — Design

## Problem

The current shortest-path computation treats every graph edge as a fixed
travel duration (the minimum observed across all trips on that stop pair),
with no notion of waiting for the next train. A computed route therefore
assumes the traveller can board instantly at every stop, including after a
transfer, which is unrealistic. Walking time between platforms at the same
station complex is already modeled (via GTFS `transfers.txt` edges), but
waiting time for the next departure is entirely absent.

## Scope

Applies **only** to the address-to-address routing flow
(`AddressForm` → `useAddressRoute` → `RouteInfoPanel`/`AddressRouteLayer`).
The map-click path exploration flow (`PathLayer`, `StationsLayer`) is
explicitly out of scope and keeps its current time-agnostic behavior.

## Constraint driving the design

The source GTFS feed (`data/gtfs/stop_times.txt`) has ~9.3M rows covering a
full month of scheduled service across ~436k trips. GoodPath is a static,
client-only SPA (Vite build + static `gtfs.json`, no backend) — shipping
per-trip timetables to the browser is infeasible at this scale. Real
departure-time lookups are out of scope; the design instead precomputes
**average line frequency by time-of-day bucket** at build time, and uses
that to estimate wait time at run time.

## 1. Build pipeline — frequency computation

Add `calendar.txt` ingestion to `scripts/gtfs/pipeline.mjs` (small file,
~1000 rows) to know which days of the week each `service_id` runs.
`calendar_dates.txt` (date-specific exceptions) is intentionally not read —
approximation accepted; see "Known simplifications" below.

In `scripts/gtfs/transform.mjs`, reuse the existing `stopTimesByTrip`
grouping (already built and sorted by `stop_sequence` for the graph-edge
step) to get each trip's first `departure_time`, used as that trip's
representative start time for bucketing.

Time buckets (based on the trip's start time, mod 24h):
- **peak**: 07:00–09:00 and 17:00–19:00 (240 min/day)
- **night**: 21:00–06:00, wraps midnight (540 min/day)
- **offpeak**: everything else (660 min/day)

Day types: **weekday** (service runs Mon–Fri) / **weekend** (runs Sat or
Sun). A service can count toward both if it runs on both weekday and
weekend days.

For each `route_id` × dayType × bucket: count distinct trips whose
representative start time falls in that bucket (and whose service applies
to that dayType), then `frequencyMinutes = bucketDurationMinutes / count`.
If a bucket has zero observed trips, fall back to a fixed default
(20 minutes) rather than making the line unreachable in that bucket —
marked with a `ponytail:` comment naming the ceiling (sparse-data buckets
get a guessed frequency, not a real one; revisit if this proves inaccurate).

Output shape — each entry in `data.lines` gains:
```js
frequencies: {
  weekday: { peak: number, offpeak: number, night: number },
  weekend: { peak: number, offpeak: number, night: number },
}
```
All values in minutes. Negligible size addition (number of routes × 6
numbers). The `TRANSFER_ROUTE_ID` sentinel line has no `frequencies` entry —
transfer edges never trigger a boarding wait themselves (see §2).

## 2. Domain — time-dependent shortest path

`src/domain/gtfs/shortestPath.ts` is reworked so the search state is
**(stopId, currentRouteId | null)** instead of just `stopId`. This is
necessary to know whether an edge continues the current ride (free) or
starts a new one (pays a boarding wait).

New signature (replacing the current `computeShortestPaths`):

```ts
computeShortestPaths(
  graph: TransportGraph,
  fromStopId: string,
  startTimeSeconds: number,   // seconds since local midnight of the travel date
  schedule: { linesById: Map<string, Line>, dayType: 'weekday' | 'weekend' },
  constraints: PathConstraints = {},
): PathResult
```

Where `PathResult`'s `durations` map is keyed by `${stopId}|${routeId ?? 'START'}`
and represents cumulative elapsed seconds since `startTimeSeconds` (i.e. it
doubles as the simulated clock). `buildPath`/`computeShortestPathWithWaypoints`
are adapted to this keying (extracting the stopId component when producing the
ordered path).

Edge relaxation rule, for an edge `{to, duration, routeId}` taken from state
`(stop, currentRouteId)`:
- if `routeId === currentRouteId`: cost = `duration` (continuing the ride).
- else (new boarding — includes the very first edge of the search, where
  `currentRouteId` starts as `null`): cost = `boardingWait + duration`, where
  `boardingWait = frequencyMinutes(routeId, dayType, bucket(currentClock)) * 60 / 2`,
  looked up from `schedule.linesById`. `bucket()` uses the **simulated
  clock at the moment of boarding** (start time + cumulative elapsed time so
  far), so a long trip crossing from peak into off-peak sees the wait
  estimate change accordingly.
- `TRANSFER_ROUTE_ID` edges are walking, not a ride: relaxing one always
  resets the outgoing state's `currentRouteId` to `null` (no wait charged
  for the walk itself, but the next real boarding after it always pays a
  wait, since you just arrived on foot).

`computeShortestPathWithWaypoints` chains per-leg searches as today; each
leg's search starts fresh with `currentRouteId = null` (same simplification
as a transfer) — a required waypoint always "resets" boarding state even if
the incoming and outgoing legs happen to share a route. Accepted
imprecision, rare in practice.

`PathConstraints` (forbidden stations/lines/edges) apply unchanged, checked
before the boarding/continuation cost is computed.

## 3. Hooks / UI

- `AddressForm` gains an optional `<input type="datetime-local">` for
  departure time (native element, no new dependency). Empty = "now".
- `useAddressRoute` resolves the chosen time (or `Date.now()`) into
  `startTimeSeconds` + `dayType`, and threads them through `useShortestPath`
  into `computeShortestPathWithWaypoints`.
- `useShortestPath`'s signature grows a `startTimeSeconds`/`schedule` param,
  mirroring the domain function above.
- `RouteInfoPanel` shows each leg's own duration (already computed by the
  algorithm as part of the cumulative-time bookkeeping) alongside its
  existing "Ligne X : A → B" / "Changement à X" text, so wait time and
  walking time are visible per step, not just folded into the total.
- No new `RouteStatus` values needed: `'no-path'` still means "the graph
  itself has no route between these stops under the given constraints".
  Because sparse-frequency buckets fall back to a default rather than
  blocking a line outright (see simplification below), a schedule-driven
  "nothing runs at this hour" case is not distinguished from a plain
  disconnection — both surface as `'no-path'`.

## Known simplifications (ponytail ceilings, not bugs)

- `calendar_dates.txt` exceptions (holidays, one-off service changes) are
  ignored; frequencies are the calendar-only weekly average.
- Sparse buckets fall back to a flat 20-minute default frequency instead of
  making a line unreachable at that time.
- Waypoint-forced leg boundaries always reset boarding state, even when the
  same line continues across the boundary.
- Frequencies are per-line averages, not per-stop or per-direction — a line
  with very uneven headway across its branches gets one blended number.

None of these block correctness of the core feature (realistic wait-time
and transfer-walk-time-aware routing); they trade a small amount of
precision for staying fully static/client-side with no backend.

## Testing

- `scripts/gtfs/transform.test.mjs`: frequency computation from a small
  synthetic calendar/trips/stop_times fixture (known trip counts per
  bucket → known frequency minutes; verify the sparse-bucket fallback).
- `src/domain/gtfs/shortestPath.test.ts`: new cases — continuing a ride
  pays no boarding wait; changing lines pays `frequency/2`; a transfer edge
  always forces a wait on the next boarding; the simulated clock crossing a
  bucket boundary changes the wait charged for a later boarding.
- `src/hooks/gtfs/useAddressRoute.test.tsx`: departure time (or its
  "now" default) is correctly threaded through to the path computation.
- `src/components/Address/AddressForm.test.tsx` /
  `RouteInfoPanel.test.tsx`: new datetime field and per-leg duration
  display.
