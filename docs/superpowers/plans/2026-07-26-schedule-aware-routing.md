# Schedule-Aware Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make address-to-address route computation account for estimated train wait times (from build-time-precomputed line frequencies) and let wait time influence which path is chosen, using a simulated clock that advances through the journey.

**Architecture:** Build pipeline (`scripts/gtfs/*.mjs`) gains `calendar.txt` ingestion and per-route × dayType × time-bucket frequency precomputation, stored on each `Line`. The domain shortest-path algorithm (`src/domain/gtfs/shortestPath.ts`) becomes a time-dependent Dijkstra whose search state is `(stopId, currentRouteId | null)`, charging a boarding wait (half the line's frequency at the simulated clock time) whenever the route changes. `AddressForm` gains an optional departure-time input threaded down through `useAddressRoute` → `useShortestPath` → the domain algorithm. Only the address-form flow is affected; `PathLayer` (map-click flow) keeps working unchanged except for a mechanical parameter addition, defaulting to "now".

**Tech Stack:** Node (`.mjs`, csv-parse) for the build pipeline; TypeScript/React/Vitest for the app.

## Global Constraints

- No backend: all schedule-awareness is precomputed at build time into `gtfs.json`, per `docs/superpowers/specs/2026-07-26-schedule-aware-routing-design.md`.
- `calendar_dates.txt` is intentionally not read (accepted simplification).
- Time buckets: peak 07:00–09:00 & 17:00–19:00 (240 min/day), night 21:00–06:00 wraps midnight (540 min/day), offpeak everything else (660 min/day).
- Sparse buckets (zero observed trips) fall back to a flat 20-minute frequency.
- `computeShortestPaths`/`computeShortestPathWithWaypoints` signatures change to take `startTimeSeconds` and `schedule: {linesById, dayType}`, per the spec.
- Scope: only `AddressForm` → `useAddressRoute` → `RouteInfoPanel`/`AddressRouteLayer`. `PathLayer`/`StationsLayer` stay time-agnostic in their UI (no time input), even though they reuse the same (now schedule-aware) algorithm defaulted to "now".

---

## Task 1: Extract `parseGtfsTime` into a shared module

**Files:**
- Create: `scripts/gtfs/time.mjs`
- Create: `scripts/gtfs/time.test.mjs`
- Modify: `scripts/gtfs/transform.mjs:1-4` (remove local `parseGtfsTime`, import from `./time.mjs`)

**Interfaces:**
- Produces: `parseGtfsTime(time: string): number` — GTFS `"HH:MM:SS"` (hours may exceed 23) → seconds since local midnight.

- [ ] **Step 1: Write the failing test**

```js
// scripts/gtfs/time.test.mjs
import {describe, expect, it} from "vitest";
import {parseGtfsTime} from "./time.mjs";

describe('parseGtfsTime', () => {
    it('parses HH:MM:SS into seconds since midnight', () => {
        expect(parseGtfsTime('08:05:30')).toBe(8 * 3600 + 5 * 60 + 30);
    });

    it('handles GTFS hours past 23 (past-midnight service)', () => {
        expect(parseGtfsTime('25:00:00')).toBe(25 * 3600);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/gtfs/time.test.mjs`
Expected: FAIL — `time.mjs` does not exist.

- [ ] **Step 3: Create `time.mjs` and update `transform.mjs` to import it**

```js
// scripts/gtfs/time.mjs
export const parseGtfsTime = (time) => {
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}
```

In `scripts/gtfs/transform.mjs`, replace lines 1-4 (the local `parseGtfsTime` definition) with:

```js
import {parseGtfsTime} from "./time.mjs";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run scripts/gtfs/time.test.mjs scripts/gtfs/transform.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/gtfs/time.mjs scripts/gtfs/time.test.mjs scripts/gtfs/transform.mjs
git commit -m "refactor(gtfs): extract parseGtfsTime into a shared module"
```

---

## Task 2: Time-of-day bucket helpers (build + runtime, kept in sync)

**Files:**
- Create: `scripts/gtfs/timeBuckets.mjs`
- Create: `src/domain/gtfs/timeBuckets.ts`
- Create: `scripts/gtfs/timeBuckets.test.mjs` (cross-checks both implementations stay in sync, same pattern as the existing `TRANSFER_ROUTE_ID` sync test)

**Interfaces:**
- Produces (both files, mirrored): `PEAK_RANGES: [number, number][]`, `NIGHT_START: number`, `NIGHT_END: number`, `timeBucketFor(secondsOfDay: number): 'peak' | 'offpeak' | 'night'` (input is normalized mod 86400 internally, so callers may pass values beyond one day).
- Produces (TS only): `export type TimeBucket = 'peak' | 'offpeak' | 'night';`

- [ ] **Step 1: Write the failing sync test**

```js
// scripts/gtfs/timeBuckets.test.mjs
import {describe, expect, it} from "vitest";
import * as mjsBuckets from "./timeBuckets.mjs";
import * as tsBuckets from "../../src/domain/gtfs/timeBuckets.ts";

describe('timeBuckets mjs/ts sync', () => {
    it('keeps the same boundary constants in both implementations', () => {
        expect(mjsBuckets.PEAK_RANGES).toEqual(tsBuckets.PEAK_RANGES);
        expect(mjsBuckets.NIGHT_START).toBe(tsBuckets.NIGHT_START);
        expect(mjsBuckets.NIGHT_END).toBe(tsBuckets.NIGHT_END);
    });

    it.each([
        0, 6 * 3600 - 1, 6 * 3600, 7 * 3600, 8 * 3600, 9 * 3600 - 1, 9 * 3600,
        17 * 3600, 19 * 3600 - 1, 19 * 3600, 21 * 3600 - 1, 21 * 3600, 23 * 3600,
    ])('agrees on the bucket for %i seconds', (seconds) => {
        expect(mjsBuckets.timeBucketFor(seconds)).toBe(tsBuckets.timeBucketFor(seconds));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/gtfs/timeBuckets.test.mjs`
Expected: FAIL — neither module exists.

- [ ] **Step 3: Create both bucket modules**

```js
// scripts/gtfs/timeBuckets.mjs
// Kept in sync with src/domain/gtfs/timeBuckets.ts (checked by timeBuckets.test.mjs).
export const PEAK_RANGES = [[7 * 3600, 9 * 3600], [17 * 3600, 19 * 3600]];
export const NIGHT_START = 21 * 3600;
export const NIGHT_END = 6 * 3600;

export const timeBucketFor = (secondsOfDay) => {
    const t = ((secondsOfDay % 86400) + 86400) % 86400;

    if (PEAK_RANGES.some(([start, end]) => t >= start && t < end)) {
        return 'peak';
    }
    if (t >= NIGHT_START || t < NIGHT_END) {
        return 'night';
    }
    return 'offpeak';
}
```

```ts
// src/domain/gtfs/timeBuckets.ts
// Kept in sync with scripts/gtfs/timeBuckets.mjs (checked by
// scripts/gtfs/timeBuckets.test.mjs).
export type TimeBucket = 'peak' | 'offpeak' | 'night';

export const PEAK_RANGES: [number, number][] = [[7 * 3600, 9 * 3600], [17 * 3600, 19 * 3600]];
export const NIGHT_START = 21 * 3600;
export const NIGHT_END = 6 * 3600;

export const timeBucketFor = (secondsOfDay: number): TimeBucket => {
    const t = ((secondsOfDay % 86400) + 86400) % 86400;

    if (PEAK_RANGES.some(([start, end]) => t >= start && t < end)) {
        return 'peak';
    }
    if (t >= NIGHT_START || t < NIGHT_END) {
        return 'night';
    }
    return 'offpeak';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/gtfs/timeBuckets.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/gtfs/timeBuckets.mjs src/domain/gtfs/timeBuckets.ts scripts/gtfs/timeBuckets.test.mjs
git commit -m "feat(gtfs): add time-of-day bucket helpers for build and runtime"
```

---

## Task 3: `calendar.txt` filter and pipeline ingestion

**Files:**
- Modify: `scripts/gtfs/filters.mjs` (add `isKeptCalendar`)
- Modify: `scripts/gtfs/filters.test.mjs` (add tests for it)
- Modify: `scripts/gtfs/pipeline.mjs`

**Interfaces:**
- Produces: `isKeptCalendar(record, serviceIdSet): record | null` — keeps a `calendar.txt` row only if its `service_id` is referenced by a kept trip.
- Produces: `pipeline.mjs`'s `main()` now reads `calendar.txt` and passes `calendar` as the 7th positional argument to `createJson` (before `filePath`).

- [ ] **Step 1: Write the failing test**

Add to `scripts/gtfs/filters.test.mjs`:

```js
describe('isKeptCalendar', () => {
    it('keeps a calendar row referenced by a kept trip', () => {
        const record = {service_id: 'S1'};
        expect(isKeptCalendar(record, new Set(['S1']))).toBe(record);
    });

    it('rejects a calendar row referenced by no kept trip', () => {
        expect(isKeptCalendar({service_id: 'S2'}, new Set(['S1']))).toBeNull();
    });
});
```

Update the import line at the top of `scripts/gtfs/filters.test.mjs`:

```js
import {isKeptCalendar, isKeptRoute, isKeptShape, isKeptStop, isKeptStopTime, isKeptTransfer, isKeptTrip} from "./filters.mjs";
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/gtfs/filters.test.mjs`
Expected: FAIL — `isKeptCalendar` is not exported.

- [ ] **Step 3: Add `isKeptCalendar` to `filters.mjs`**

Append to `scripts/gtfs/filters.mjs`:

```js

export const isKeptCalendar = (record, serviceIdSet) => {
    return serviceIdSet.has(record.service_id) ? record : null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/gtfs/filters.test.mjs`
Expected: PASS

- [ ] **Step 5: Wire `calendar.txt` into `pipeline.mjs`**

In `scripts/gtfs/pipeline.mjs`, update the import (line 3) to:

```js
import {isKeptCalendar, isKeptRoute, isKeptShape, isKeptStop, isKeptStopTime, isKeptTransfer, isKeptTrip} from "./filters.mjs";
```

Add a path constant after line 10 (`transfersPath`):

```js
const calendarPath = path.resolve(import.meta.dirname, '../../data/gtfs/calendar.txt');
```

After line 18 (`const tripShapeIdSet = ...`), add:

```js
const tripServiceIdSet = new Set(trips.map(trip => trip.service_id));
const calendarFilter = (record) => isKeptCalendar(record, tripServiceIdSet);
const calendar = await readGtfsCsv(calendarPath, calendarFilter);
```

Update the `createJson` call (lines 35-43) to pass `calendar` before `jsonPath`:

```js
    createJson(
        routes,
        shapes,
        stops,
        stopTimes,
        trips,
        transfers,
        calendar,
        jsonPath
    );
```

- [ ] **Step 6: Run the full test suite to check nothing else broke**

Run: `npm test -- --run`
Expected: PASS (pipeline.mjs's `main()` has no direct test, but nothing downstream should break yet since `createJson`/`buildData` haven't changed their signature in this task)

- [ ] **Step 7: Commit**

```bash
git add scripts/gtfs/filters.mjs scripts/gtfs/filters.test.mjs scripts/gtfs/pipeline.mjs
git commit -m "feat(gtfs): ingest calendar.txt in the build pipeline"
```

---

## Task 4: Per-line frequency computation

**Files:**
- Create: `scripts/gtfs/frequencies.mjs`
- Create: `scripts/gtfs/frequencies.test.mjs`

**Interfaces:**
- Consumes: `parseGtfsTime` from `./time.mjs` (Task 1), `timeBucketFor` from `./timeBuckets.mjs` (Task 2).
- Produces: `computeLineFrequencies(routes, trips, calendar, stopTimesByTrip): Map<string, {weekday: {peak: number, offpeak: number, night: number}, weekend: {peak: number, offpeak: number, night: number}}>` — one entry per `route.route_id`, values in minutes. `stopTimesByTrip` is `Record<tripId, Array<{stop_sequence, departure_time, ...}>>`, already sorted by `stop_sequence` (same shape `transform.mjs` builds internally).

- [ ] **Step 1: Write the failing tests**

```js
// scripts/gtfs/frequencies.test.mjs
import {describe, expect, it} from "vitest";
import {computeLineFrequencies} from "./frequencies.mjs";

const routes = [{route_id: 'R1'}];

const weekdayCalendar = [
    {service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
];

const stopTimesByTrip = {
    T1: [{stop_sequence: '1', departure_time: '08:00:00'}],
    T2: [{stop_sequence: '1', departure_time: '08:30:00'}],
};

describe('computeLineFrequencies', () => {
    it('derives peak frequency from the number of trips starting in that bucket', () => {
        const trips = [
            {trip_id: 'T1', route_id: 'R1', service_id: 'S1'},
            {trip_id: 'T2', route_id: 'R1', service_id: 'S1'},
        ];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, stopTimesByTrip);

        // 2 trips in the 240 min/day peak window -> 240 / 2 = 120 min headway
        expect(frequencies.get('R1').weekday.peak).toBe(120);
    });

    it('falls back to the default 20-minute frequency for a bucket with no trips', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {T1: stopTimesByTrip.T1});

        expect(frequencies.get('R1').weekday.offpeak).toBe(20);
        expect(frequencies.get('R1').weekday.night).toBe(20);
    });

    it('only counts a trip toward the day types its service actually runs', () => {
        const trips = [{trip_id: 'T1', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {T1: stopTimesByTrip.T1});

        expect(frequencies.get('R1').weekend.peak).toBe(20);
    });

    it('gives every route a frequencies entry, even with zero trips', () => {
        const frequencies = computeLineFrequencies(routes, [], [], {});

        expect(frequencies.get('R1')).toEqual({
            weekday: {peak: 20, offpeak: 20, night: 20},
            weekend: {peak: 20, offpeak: 20, night: 20},
        });
    });

    it('ignores a trip with no matching stop_times entry', () => {
        const trips = [{trip_id: 'TMissing', route_id: 'R1', service_id: 'S1'}];

        const frequencies = computeLineFrequencies(routes, trips, weekdayCalendar, {});

        expect(frequencies.get('R1').weekday.peak).toBe(20);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run scripts/gtfs/frequencies.test.mjs`
Expected: FAIL — `frequencies.mjs` does not exist.

- [ ] **Step 3: Implement `computeLineFrequencies`**

```js
// scripts/gtfs/frequencies.mjs
import {parseGtfsTime} from "./time.mjs";
import {timeBucketFor} from "./timeBuckets.mjs";

const BUCKET_DURATION_MINUTES = {peak: 240, offpeak: 660, night: 540};
// ponytail: buckets with no observed trip get a guessed 20-minute headway
// instead of making the line unreachable at that time; revisit if this
// proves inaccurate for sparsely-served lines.
const DEFAULT_FREQUENCY_MINUTES = 20;
const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const WEEKEND_DAYS = ['saturday', 'sunday'];

const dayTypesForService = (calendarRow) => {
    const dayTypes = [];
    if (WEEKDAYS.some(day => calendarRow[day] === '1')) {
        dayTypes.push('weekday');
    }
    if (WEEKEND_DAYS.some(day => calendarRow[day] === '1')) {
        dayTypes.push('weekend');
    }
    return dayTypes;
}

const emptyCounts = () => ({
    weekday: {peak: 0, offpeak: 0, night: 0},
    weekend: {peak: 0, offpeak: 0, night: 0},
});

/**
 * Average line frequency (minutes between trains) per day type and
 * time-of-day bucket, derived from each trip's first stop_time as its
 * representative departure. See DEFAULT_FREQUENCY_MINUTES for the
 * sparse-bucket fallback.
 */
export const computeLineFrequencies = (routes, trips, calendar, stopTimesByTrip) => {
    const dayTypesByServiceId = new Map(calendar.map(row => [row.service_id, dayTypesForService(row)]));
    const tripCountsByRoute = new Map();

    trips.forEach(trip => {
        const points = stopTimesByTrip[trip.trip_id];
        if (!points || points.length === 0) {
            return;
        }

        const startSeconds = parseGtfsTime(points[0].departure_time);
        const bucket = timeBucketFor(startSeconds);
        const dayTypes = dayTypesByServiceId.get(trip.service_id) ?? [];

        if (!tripCountsByRoute.has(trip.route_id)) {
            tripCountsByRoute.set(trip.route_id, emptyCounts());
        }
        const counts = tripCountsByRoute.get(trip.route_id);

        dayTypes.forEach(dayType => {
            counts[dayType][bucket]++;
        });
    });

    const frequenciesByRoute = new Map();

    routes.forEach(route => {
        const counts = tripCountsByRoute.get(route.route_id);

        const frequenciesForDayType = (dayType) => ({
            peak: counts?.[dayType].peak ? BUCKET_DURATION_MINUTES.peak / counts[dayType].peak : DEFAULT_FREQUENCY_MINUTES,
            offpeak: counts?.[dayType].offpeak ? BUCKET_DURATION_MINUTES.offpeak / counts[dayType].offpeak : DEFAULT_FREQUENCY_MINUTES,
            night: counts?.[dayType].night ? BUCKET_DURATION_MINUTES.night / counts[dayType].night : DEFAULT_FREQUENCY_MINUTES,
        });

        frequenciesByRoute.set(route.route_id, {
            weekday: frequenciesForDayType('weekday'),
            weekend: frequenciesForDayType('weekend'),
        });
    });

    return frequenciesByRoute;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/gtfs/frequencies.test.mjs`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/gtfs/frequencies.mjs scripts/gtfs/frequencies.test.mjs
git commit -m "feat(gtfs): compute per-line frequency by day type and time bucket"
```

---

## Task 5: `Line.frequencies` type

**Files:**
- Modify: `src/types/gtfs/gtfsLine.ts`

**Interfaces:**
- Produces: `export type DayFrequencies = {peak: number, offpeak: number, night: number}`, `export type LineFrequencies = {weekday: DayFrequencies, weekend: DayFrequencies}`, `Line.frequencies: LineFrequencies`.

- [ ] **Step 1: Update the type file**

Replace the full contents of `src/types/gtfs/gtfsLine.ts`:

```ts
export type DayFrequencies = {
    peak: number,
    offpeak: number,
    night: number,
}

export type LineFrequencies = {
    weekday: DayFrequencies,
    weekend: DayFrequencies,
}

export type Line = {
    id: string,
    shortName: string,
    longName: string,
    color: string,
    textColor: string,
    type: number,
    frequencies: LineFrequencies,
}
```

- [ ] **Step 2: Run typecheck to confirm the new required field surfaces consumers to fix**

Run: `npx tsc --noEmit`
Expected: FAIL — every object literal typed as `Line` (test fixtures, `transform.mjs` output consumers) is now missing `frequencies`. This is expected; later tasks fix each site.

- [ ] **Step 3: Commit**

```bash
git add src/types/gtfs/gtfsLine.ts
git commit -m "feat(gtfs): add per-line frequencies to the Line type"
```

---

## Task 6: Wire frequencies into `buildData` / `createJson` / `pipeline.mjs`

**Files:**
- Modify: `scripts/gtfs/transform.mjs`
- Modify: `scripts/gtfs/transform.test.mjs`
- Modify: `scripts/gtfs/io.mjs`
- Modify: `scripts/gtfs/io.test.mjs`
- Modify: `scripts/gtfs/pipeline.mjs` (already reads `calendar` from Task 3; just needs to keep passing it through — already done)

**Interfaces:**
- Consumes: `computeLineFrequencies` from `./frequencies.mjs` (Task 4).
- Produces: `buildData(routes, shapes, stops, stopTimes, trips, transfers = [], calendar = [])` — each `data.lines[i]` gains `frequencies`. `createJson(routes, shapes, stops, stopTimes, trips, transfers, calendar, filePath)`.

- [ ] **Step 1: Write the failing test**

Add to `scripts/gtfs/transform.test.mjs` (needs a `calendar` fixture and a new `it`):

```js
const calendar = [
    {service_id: 'S1', monday: '1', tuesday: '1', wednesday: '1', thursday: '1', friday: '1', saturday: '0', sunday: '0'},
];

const tripsWithService = [
    {trip_id: 'T1', route_id: 'R1', shape_id: 'S1', service_id: 'S1'},
    {trip_id: 'T2', route_id: 'R1', shape_id: 'S1', service_id: 'S1'},
];
```

Add this `it` inside the `describe('buildData', ...)` block:

```js
    it('attaches computed frequencies to each line', () => {
        const stopTimesWithMorningTrips = [
            {trip_id: 'T1', stop_id: 'A', stop_sequence: '1', arrival_time: '08:00:00', departure_time: '08:00:00'},
            {trip_id: 'T1', stop_id: 'B', stop_sequence: '2', arrival_time: '08:05:00', departure_time: '08:05:00'},
            {trip_id: 'T2', stop_id: 'A', stop_sequence: '1', arrival_time: '08:30:00', departure_time: '08:30:00'},
            {trip_id: 'T2', stop_id: 'B', stop_sequence: '2', arrival_time: '08:33:00', departure_time: '08:33:00'},
        ];

        const data = buildData(routes, [], [], stopTimesWithMorningTrips, tripsWithService, [], calendar);

        expect(data.lines[0].frequencies).toEqual({
            weekday: {peak: 120, offpeak: 20, night: 20},
            weekend: {peak: 20, offpeak: 20, night: 20},
        });
    });
```

Note: the existing `it('maps routes to lines', ...)` test's expectation will now fail because `data.lines[0]` gains a `frequencies` field it doesn't assert. Update that test's expectation to:

```js
    it('maps routes to lines', () => {
        const data = buildData(routes, [], [], [], []);

        expect(data.lines).toEqual([
            {id: 'R1', shortName: '1', longName: 'Line 1', color: 'FFFFFF', textColor: '000000', type: 1, frequencies: {
                weekday: {peak: 20, offpeak: 20, night: 20},
                weekend: {peak: 20, offpeak: 20, night: 20},
            }},
        ]);
    });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run scripts/gtfs/transform.test.mjs`
Expected: FAIL — `buildData` doesn't compute or attach `frequencies` yet.

- [ ] **Step 3: Update `transform.mjs`**

Replace the full contents of `scripts/gtfs/transform.mjs`:

```js
import {parseGtfsTime} from "./time.mjs";
import {computeLineFrequencies} from "./frequencies.mjs";

const groupBy = (records, key) => records.reduce((acc, record) => {
    acc[record[key]] ??= [];
    acc[record[key]].push(record);
    return acc;
}, {});

// Marks a graph edge as an interchange (walk between platforms/lines at the
// same station complex) rather than a ride on a GTFS route.
// Kept in sync with src/domain/gtfs/transferRouteId.ts.
const TRANSFER_ROUTE_ID = 'TRANSFER';

const addOrUpdateEdge = (graph, from, to, duration, routeId) => {
    graph[from] ??= [];
    const edge = graph[from].find(edge => edge.to === to);
    if (edge) {
        edge.duration = Math.min(edge.duration, duration);
    } else {
        graph[from].push({to, duration, routeId});
    }
}

/**
 * Turns the filtered GTFS records (routes, shapes, stops, stop_times, trips,
 * transfers, calendar) into the app's `gtfs.json` shape: lines (each with a
 * precomputed frequency table), shapes grouped and ordered by sequence, an
 * adjacency-list `graph` of stop-to-stop travel times (ride edges from
 * stop_times plus walking interchange edges from transfers), and stations.
 */
export const buildData = (
    routes,
    shapes,
    stops,
    stopTimes,
    trips,
    transfers = [],
    calendar = []
) => {
    const data = {
        graph: {},
        stations: [],
        shapes: [],
        lines: [],
    };

    const tripRouteById = Object.fromEntries(trips.map(trip => [trip.trip_id, trip.route_id]));

    const stopTimesByTrip = groupBy(stopTimes, 'trip_id');
    Object.values(stopTimesByTrip).forEach(points =>
        points.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence))
    );

    const frequenciesByRoute = computeLineFrequencies(routes, trips, calendar, stopTimesByTrip);

    routes.forEach(route => {
        data.lines.push({
            id: route.route_id,
            shortName: route.route_short_name,
            longName: route.route_long_name,
            color: route.route_color,
            textColor: route.route_text_color,
            type: parseInt(route.route_type),
            frequencies: frequenciesByRoute.get(route.route_id),
        });
    });

    data.shapes = shapes.reduce((acc, shape) => {
        acc[shape.shape_id] ??= [];
        acc[shape.shape_id].push({
            shapeLat: parseFloat(shape.shape_pt_lat),
            shapeLon: parseFloat(shape.shape_pt_lon),
            shapeSequence: parseInt(shape.shape_pt_sequence, 10),
        });

        return acc;
    }, {});

    Object.values(data.shapes).forEach(points =>
        points.sort((a, b) => a.shapeSequence - b.shapeSequence)
    );

    Object.entries(stopTimesByTrip).forEach(([tripId, points]) => {
        const routeId = tripRouteById[tripId];

        for (let i = 0; i < points.length - 1; i++) {
            const from = points[i].stop_id;
            const to = points[i + 1].stop_id;
            const duration = parseGtfsTime(points[i + 1].arrival_time) - parseGtfsTime(points[i].departure_time);

            addOrUpdateEdge(data.graph, from, to, duration, routeId);
        }
    });

    transfers.forEach(transfer => {
        const duration = parseInt(transfer.min_transfer_time, 10);

        addOrUpdateEdge(data.graph, transfer.from_stop_id, transfer.to_stop_id, duration, TRANSFER_ROUTE_ID);
        addOrUpdateEdge(data.graph, transfer.to_stop_id, transfer.from_stop_id, duration, TRANSFER_ROUTE_ID);
    });

    stops.forEach(stop => {
        data.stations.push({
            id: stop.stop_id,
            name: stop.stop_name,
            stopLat: parseFloat(stop.stop_lat),
            stopLon: parseFloat(stop.stop_lon),
            zoneId: stop.zone_id,
        });
    });

    return data;
}
```

(Only structural change vs. the original: `stopTimesByTrip`/`tripRouteById` computation moved earlier so `frequenciesByRoute` can be computed before the `routes.forEach` that builds `data.lines`; `parseGtfsTime` now imported; `frequencies` added to each pushed line.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run scripts/gtfs/transform.test.mjs`
Expected: PASS

- [ ] **Step 5: Update `io.mjs` and its test**

Replace `scripts/gtfs/io.mjs`'s `createJson` (lines 33-50) with:

```js
export const createJson = (
    routes,
    shapes,
    stops,
    stopTimes,
    trips,
    transfers,
    calendar,
    filePath
) => {
    fs.writeFileSync(filePath, JSON.stringify(buildData(
        routes,
        shapes,
        stops,
        stopTimes,
        trips,
        transfers,
        calendar
    )));
}
```

In `scripts/gtfs/io.test.mjs`, update the `createJson` test (lines 50-61):

```js
describe('createJson', () => {
    it('writes buildData output as JSON to the given path', () => {
        const filePath = path.join(os.tmpdir(), `gtfs-test-${Date.now()}-${Math.random()}.json`);
        tmpFiles.push(filePath);

        const routes = [{route_id: 'R1', route_short_name: '1', route_long_name: 'Line 1', route_color: 'FFF', route_text_color: '000', route_type: '1'}];
        createJson(routes, [], [], [], [], [], [], filePath);

        const written = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(written.lines).toEqual([
            {id: 'R1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1, frequencies: {
                weekday: {peak: 20, offpeak: 20, night: 20},
                weekend: {peak: 20, offpeak: 20, night: 20},
            }},
        ]);
    });
});
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run scripts/gtfs/io.test.mjs`
Expected: PASS

- [ ] **Step 7: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add scripts/gtfs/transform.mjs scripts/gtfs/transform.test.mjs scripts/gtfs/io.mjs scripts/gtfs/io.test.mjs
git commit -m "feat(gtfs): attach precomputed frequencies to each line in gtfs.json"
```

---

## Task 7: `DayType` domain helper

**Files:**
- Create: `src/domain/gtfs/dayType.ts`
- Create: `src/domain/gtfs/dayType.test.ts`

**Interfaces:**
- Produces: `export type DayType = 'weekday' | 'weekend'`, `dayTypeForDate(date: Date): DayType`.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/gtfs/dayType.test.ts
import {describe, expect, it} from "vitest";
import {dayTypeForDate} from "./dayType.ts";

describe('dayTypeForDate', () => {
    it('treats Saturday as weekend', () => {
        expect(dayTypeForDate(new Date('2026-07-25T12:00:00'))).toBe('weekend');
    });

    it('treats Sunday as weekend', () => {
        expect(dayTypeForDate(new Date('2026-07-26T12:00:00'))).toBe('weekend');
    });

    it('treats a Wednesday as weekday', () => {
        expect(dayTypeForDate(new Date('2026-07-22T12:00:00'))).toBe('weekday');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/gtfs/dayType.test.ts`
Expected: FAIL — `dayType.ts` does not exist.

- [ ] **Step 3: Implement it**

```ts
// src/domain/gtfs/dayType.ts
export type DayType = 'weekday' | 'weekend';

/** Saturday and Sunday count as 'weekend'; every other day is 'weekday'. */
export const dayTypeForDate = (date: Date): DayType => {
    const day = date.getDay();
    return day === 0 || day === 6 ? 'weekend' : 'weekday';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/gtfs/dayType.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/gtfs/dayType.ts src/domain/gtfs/dayType.test.ts
git commit -m "feat(gtfs): add dayTypeForDate helper"
```

---

## Task 8: Boarding-wait estimator

**Files:**
- Create: `src/domain/gtfs/boardingWait.ts`
- Create: `src/domain/gtfs/boardingWait.test.ts`

**Interfaces:**
- Consumes: `Line` from `../../types/gtfs/gtfsLine.ts` (Task 5), `DayType` from `./dayType.ts` (Task 7), `timeBucketFor` from `./timeBuckets.ts` (Task 2).
- Produces: `computeBoardingWaitSeconds(line: Line | undefined, dayType: DayType, clockSeconds: number): number`.

- [ ] **Step 1: Write the failing test**

```ts
// src/domain/gtfs/boardingWait.test.ts
import {describe, expect, it} from "vitest";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const line: Line = {
    id: 'L1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: 4, offpeak: 10, night: 20},
        weekend: {peak: 8, offpeak: 12, night: 30},
    },
};

describe('computeBoardingWaitSeconds', () => {
    it('charges half the frequency for the current bucket, in seconds', () => {
        expect(computeBoardingWaitSeconds(line, 'weekday', 8 * 3600)).toBe(4 * 60 / 2);
    });

    it('picks the bucket from the given clock time', () => {
        expect(computeBoardingWaitSeconds(line, 'weekday', 12 * 3600)).toBe(10 * 60 / 2);
    });

    it('picks the frequency for the given day type', () => {
        expect(computeBoardingWaitSeconds(line, 'weekend', 8 * 3600)).toBe(8 * 60 / 2);
    });

    it('falls back to a 20-minute frequency when no line is given', () => {
        expect(computeBoardingWaitSeconds(undefined, 'weekday', 8 * 3600)).toBe(20 * 60 / 2);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/gtfs/boardingWait.test.ts`
Expected: FAIL — `boardingWait.ts` does not exist.

- [ ] **Step 3: Implement it**

```ts
// src/domain/gtfs/boardingWait.ts
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";
import {timeBucketFor} from "./timeBuckets.ts";

const FALLBACK_FREQUENCY_MINUTES = 20;

/**
 * Estimated wait, in seconds, to board `line` at `dayType`/`clockSeconds`
 * (half the average headway for that time-of-day bucket). `clockSeconds`
 * may exceed one day; `timeBucketFor` normalizes it.
 */
export const computeBoardingWaitSeconds = (line: Line | undefined, dayType: DayType, clockSeconds: number): number => {
    const bucket = timeBucketFor(clockSeconds);
    const frequencyMinutes = line?.frequencies[dayType][bucket] ?? FALLBACK_FREQUENCY_MINUTES;
    return (frequencyMinutes * 60) / 2;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/gtfs/boardingWait.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/gtfs/boardingWait.ts src/domain/gtfs/boardingWait.test.ts
git commit -m "feat(gtfs): add boarding wait estimator"
```

---

## Task 9: Time-dependent Dijkstra rewrite of `shortestPath.ts`

**Files:**
- Modify: `src/domain/gtfs/shortestPath.ts`
- Modify: `src/domain/gtfs/shortestPath.test.ts`

**Interfaces:**
- Consumes: `TRANSFER_ROUTE_ID` from `./transferRouteId.ts`, `computeBoardingWaitSeconds` from `./boardingWait.ts` (Task 8), `DayType` from `./dayType.ts` (Task 7), `Line` from `../../types/gtfs/gtfsLine.ts`.
- Produces:
  - `export type Schedule = {linesById: Map<string, Line>, dayType: DayType}`
  - `export const stateKey = (stopId: string, routeId: string | null) => string` and `export const stopIdOf = (state: string) => string`
  - `computeShortestPaths(graph, fromStopId, startTimeSeconds: number, schedule: Schedule, constraints = {}): PathResult` — `PathResult.durations`/`.previous` now keyed by state strings (`stateKey`), not plain stopIds.
  - `buildPath(previous: Map<string,string>, endState: string): string[]` — `endState` is now a state string, not a plain stopId.
  - `export type WaypointPathResult = {path: string[], duration: number, arrivals: number[]}` — `arrivals[i]` is the cumulative elapsed seconds (since `startTimeSeconds`) at `path[i]`; `arrivals[0]` is always `0`.
  - `computeShortestPathWithWaypoints(graph, fromStopId, toStopId, startTimeSeconds: number, schedule: Schedule, requiredStations = [], constraints = {}): WaypointPathResult | null`

- [ ] **Step 1: Rewrite `shortestPath.test.ts` with the new signatures and time-dependent cases**

Replace the full contents of `src/domain/gtfs/shortestPath.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {buildPath, computeShortestPathWithWaypoints, computeShortestPaths, stateKey} from "./shortestPath.ts";
import type {Schedule} from "./shortestPath.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";

const lineWithFrequency = (id: string, peakMinutes: number, offpeakMinutes: number): Line => ({
    id, shortName: id, longName: id, color: 'FFF', textColor: '000', type: 1,
    frequencies: {
        weekday: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
        weekend: {peak: peakMinutes, offpeak: offpeakMinutes, night: offpeakMinutes},
    },
});

const L1 = lineWithFrequency('L1', 10, 10);
const L2 = lineWithFrequency('L2', 10, 10);

const scheduleWith = (...lines: Line[]): Schedule => ({
    linesById: new Map(lines.map(line => [line.id, line])),
    dayType: 'weekday',
});

const PEAK_START = 8 * 3600;

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'D', duration: 20, routeId: 'L2'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
};

const waypointGraph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 5, routeId: 'L1'}, {to: 'F', duration: 1, routeId: 'L1'}],
    C: [{to: 'D', duration: 5, routeId: 'L1'}],
    D: [{to: 'E', duration: 3, routeId: 'L1'}],
    F: [{to: 'E', duration: 1, routeId: 'L1'}],
};

describe('computeShortestPaths', () => {
    it('finds the shortest cumulative duration to a reachable stop, including boarding waits', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        // A->B->C->D on L1 the whole way: one boarding wait (5min = 300s) + 20s ride.
        // A->B->D via L2 at B: two boarding waits (L1 then L2) + 30s ride = 600+30=630 vs 300+20=320.
        expect(durations.get(stateKey('D', 'L1'))).toBe(300 + 20);
    });

    it('does not include unreachable stops', () => {
        const {durations} = computeShortestPaths(graph, 'D', PEAK_START, scheduleWith(L1, L2));

        expect(durations.has(stateKey('A', null))).toBe(false);
    });

    it('charges no boarding wait when continuing on the same route', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        const boardingOnly = durations.get(stateKey('B', 'L1'))!;
        const continuing = durations.get(stateKey('C', 'L1'))!;

        // B->C costs exactly its 5s duration on top of the boarding-only state.
        expect(continuing - boardingOnly).toBe(5);
    });

    it('charges a fresh boarding wait when changing lines', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        // A -> B (board L1, wait 300s + 10s ride) -> D (board L2, wait 300s + 20s ride)
        expect(durations.get(stateKey('D', 'L2'))).toBe(300 + 10 + 300 + 20);
    });

    it('uses the simulated clock (start + elapsed) to pick the bucket at boarding time', () => {
        const nightLine = lineWithFrequency('L1', 10, 40); // peak=10min, offpeak=40min
        const schedule = scheduleWith(nightLine);
        const lateGraph: TransportGraph = {A: [{to: 'B', duration: 0, routeId: 'L1'}]};

        // Boarding at PEAK_START itself: bucket is peak -> wait = 10*60/2 = 300
        const {durations: peakBoarding} = computeShortestPaths(lateGraph, 'A', PEAK_START, schedule);
        expect(peakBoarding.get(stateKey('B', 'L1'))).toBe(300);

        // Boarding at 10:00 (offpeak): wait = 40*60/2 = 1200
        const {durations: offpeakBoarding} = computeShortestPaths(lateGraph, 'A', 10 * 3600, schedule);
        expect(offpeakBoarding.get(stateKey('B', 'L1'))).toBe(1200);
    });

    it('resets the boarding state after a transfer edge, forcing a wait on the next ride', () => {
        const transferGraph: TransportGraph = {
            A: [{to: 'B', duration: 10, routeId: 'L1'}],
            B: [{to: 'C', duration: 60, routeId: 'TRANSFER'}],
            C: [{to: 'D', duration: 5, routeId: 'L1'}],
        };

        const {durations} = computeShortestPaths(transferGraph, 'A', PEAK_START, scheduleWith(L1));

        // board L1 (wait 300) + 10s ride + 60s walk + board L1 again (wait 300) + 5s ride
        expect(durations.get(stateKey('D', 'L1'))).toBe(300 + 10 + 60 + 300 + 5);
    });
});

describe('computeShortestPaths constraints', () => {
    it('excludes a forbidden station from the traversal entirely', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenStations: new Set(['C'])});

        expect([...durations.keys()].some(state => state.startsWith('C|'))).toBe(false);
    });

    it('excludes edges on a forbidden line', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenLines: new Set(['L2'])});

        expect(durations.has(stateKey('D', 'L2'))).toBe(false);
    });

    it('excludes a specific forbidden edge, forcing a detour', () => {
        const {durations} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2), {forbiddenEdges: new Set(['B>D'])});

        expect(durations.has(stateKey('D', 'L2'))).toBe(false);
        expect(durations.has(stateKey('D', 'L1'))).toBe(true);
    });
});

describe('computeShortestPathWithWaypoints', () => {
    const waypointSchedule = scheduleWith(L1);

    it('matches the plain shortest path when there is no required station', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule);

        // single boarding wait (300s) + ride time (10+1+1=12s)
        expect(result).toEqual({path: ['A', 'B', 'F', 'E'], duration: 312, arrivals: [0, 300 + 10, 300 + 11, 300 + 12]});
    });

    it('forces the path through the required station, even if longer, and pays a fresh boarding wait per leg', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule, ['D']);

        // leg 1 (A->D via B,C): wait 300 + ride 10+5+5=20 = 320
        // leg 2 (D->E): wait 300 + ride 3 = 303
        expect(result?.duration).toBe(320 + 303);
        expect(result?.path).toEqual(['A', 'B', 'C', 'D', 'E']);
        expect(result?.arrivals).toEqual([0, 300 + 10, 300 + 15, 320, 320 + 303]);
    });

    it('returns null when a leg has no path under the given constraints', () => {
        const result = computeShortestPathWithWaypoints(waypointGraph, 'A', 'E', PEAK_START, waypointSchedule, [], {forbiddenStations: new Set(['B'])});

        expect(result).toBeNull();
    });
});

describe('buildPath', () => {
    it('reconstructs the ordered path from the predecessors map', () => {
        const {previous} = computeShortestPaths(graph, 'A', PEAK_START, scheduleWith(L1, L2));

        expect(buildPath(previous, stateKey('D', 'L1'))).toEqual(['A', 'B', 'C', 'D']);
    });

    it('returns a single-stop path when there is no predecessor', () => {
        expect(buildPath(new Map(), stateKey('A', null))).toEqual(['A']);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/gtfs/shortestPath.test.ts`
Expected: FAIL — old signatures don't match.

- [ ] **Step 3: Rewrite `shortestPath.ts`**

Replace the full contents of `src/domain/gtfs/shortestPath.ts`:

```ts
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {DayType} from "./dayType.ts";
import {computeBoardingWaitSeconds} from "./boardingWait.ts";
import {TRANSFER_ROUTE_ID} from "./transferRouteId.ts";

export type PathResult = {
    durations: Map<string, number>,
    previous: Map<string, string>,
}

export type PathConstraints = {
    forbiddenStations?: Set<string>,
    forbiddenLines?: Set<string>,
    forbiddenEdges?: Set<string>,
}

export type Schedule = {
    linesById: Map<string, Line>,
    dayType: DayType,
}

export const edgeKey = (from: string, to: string) => `${from}>${to}`;

const START_ROUTE = '';
/** Search-state key: a stop plus the route currently being ridden (or none). */
export const stateKey = (stopId: string, routeId: string | null) => `${stopId}|${routeId ?? START_ROUTE}`;
export const stopIdOf = (state: string) => state.split('|')[0];
const routeIdOf = (state: string): string | null => {
    const routeId = state.split('|')[1];
    return routeId === START_ROUTE ? null : routeId;
}

/**
 * Time-dependent Dijkstra over a `TransportGraph`. Search state is
 * (stopId, currently-ridden routeId | null): continuing a ride is free, but
 * boarding a new one (including the very first boarding, and right after a
 * `TRANSFER_ROUTE_ID` walking edge) pays an estimated wait based on that
 * line's frequency at the simulated clock time (`startTimeSeconds` plus
 * cumulative elapsed time so far). Returns cumulative elapsed seconds (not
 * clock time) per state, plus each state's predecessor state (feed to
 * `buildPath`). `constraints` excludes stations, lines (routeId) or specific
 * `from>to` edges from the traversal entirely.
 */
export const computeShortestPaths = (
    graph: TransportGraph,
    fromStopId: string,
    startTimeSeconds: number,
    schedule: Schedule,
    constraints: PathConstraints = {}
): PathResult => {
    const start = stateKey(fromStopId, null);
    const durations = new Map<string, number>([[start, 0]]);
    const previous = new Map<string, string>();
    const visited = new Set<string>();
    const queue = new Set<string>([start]);

    while (queue.size > 0) {
        const current = [...queue].reduce((closest, state) =>
            (durations.get(state) ?? Infinity) < (durations.get(closest) ?? Infinity) ? state : closest
        );

        queue.delete(current);
        visited.add(current);

        const currentStopId = stopIdOf(current);
        const currentRouteId = routeIdOf(current);
        const currentDuration = durations.get(current)!;

        for (const edge of graph[currentStopId] ?? []) {
            if (constraints.forbiddenStations?.has(edge.to)) {
                continue;
            }
            if (constraints.forbiddenLines?.has(edge.routeId)) {
                continue;
            }
            if (constraints.forbiddenEdges?.has(edgeKey(currentStopId, edge.to))) {
                continue;
            }

            const isTransfer = edge.routeId === TRANSFER_ROUTE_ID;
            const isContinuing = !isTransfer && edge.routeId === currentRouteId;
            const nextRouteId = isTransfer ? null : edge.routeId;
            const nextState = stateKey(edge.to, nextRouteId);

            if (visited.has(nextState)) {
                continue;
            }

            const boardingWait = isContinuing || isTransfer
                ? 0
                : computeBoardingWaitSeconds(schedule.linesById.get(edge.routeId), schedule.dayType, startTimeSeconds + currentDuration);

            const nextDuration = currentDuration + boardingWait + edge.duration;

            if (nextDuration < (durations.get(nextState) ?? Infinity)) {
                durations.set(nextState, nextDuration);
                previous.set(nextState, current);
                queue.add(nextState);
            }
        }
    }

    return {durations, previous};
}

/**
 * Reconstructs the ordered list of stops from a `computeShortestPaths`
 * predecessor map, ending at state `endState`.
 */
export const buildPath = (previous: Map<string, string>, endState: string): string[] => {
    const path = [stopIdOf(endState)];
    let current = endState;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(stopIdOf(current));
    }

    return path;
}

const bestArrivalState = (durations: Map<string, number>, stopId: string): {state: string, duration: number} | undefined => {
    let best: {state: string, duration: number} | undefined;

    for (const [state, duration] of durations) {
        if (stopIdOf(state) !== stopId) {
            continue;
        }
        if (!best || duration < best.duration) {
            best = {state, duration};
        }
    }

    return best;
}

const reconstructWithArrivals = (durations: Map<string, number>, previous: Map<string, string>, endState: string): {path: string[], arrivals: number[]} => {
    const path = [stopIdOf(endState)];
    const arrivals = [durations.get(endState)!];
    let current = endState;

    while (previous.has(current)) {
        current = previous.get(current)!;
        path.unshift(stopIdOf(current));
        arrivals.unshift(durations.get(current)!);
    }

    return {path, arrivals};
}

export type WaypointPathResult = {
    path: string[],
    duration: number,
    arrivals: number[],
}

/**
 * Shortest path from `fromStopId` to `toStopId` forced through
 * `requiredStations` in order, departing at `startTimeSeconds` under
 * `schedule`, by chaining time-dependent Dijkstra leg by leg. Each leg's
 * search starts fresh with no carried-over "currently boarded" line, so a
 * required waypoint always pays a fresh boarding wait even if the same line
 * continues through it (accepted imprecision). `arrivals[i]` is the
 * cumulative elapsed seconds at `path[i]`. Returns null if any leg is
 * unreachable.
 */
export const computeShortestPathWithWaypoints = (
    graph: TransportGraph,
    fromStopId: string,
    toStopId: string,
    startTimeSeconds: number,
    schedule: Schedule,
    requiredStations: string[] = [],
    constraints: PathConstraints = {}
): WaypointPathResult | null => {
    const stops = [fromStopId, ...requiredStations, toStopId];
    const path = [stops[0]];
    const arrivals = [0];
    let duration = 0;

    for (let i = 0; i < stops.length - 1; i++) {
        const {durations, previous} = computeShortestPaths(graph, stops[i], startTimeSeconds + duration, schedule, constraints);
        const arrival = bestArrivalState(durations, stops[i + 1]);

        if (!arrival) {
            return null;
        }

        const leg = reconstructWithArrivals(durations, previous, arrival.state);
        path.push(...leg.path.slice(1));
        arrivals.push(...leg.arrivals.slice(1).map(a => a + duration));
        duration += arrival.duration;
    }

    return {path, duration, arrivals};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/gtfs/shortestPath.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/gtfs/shortestPath.ts src/domain/gtfs/shortestPath.test.ts
git commit -m "feat(gtfs): rework shortest path as a time-dependent Dijkstra with boarding waits"
```

---

## Task 10: Per-leg duration in `pathLegs.ts`

**Files:**
- Modify: `src/domain/gtfs/pathLegs.ts`
- Modify: `src/domain/gtfs/pathLegs.test.ts`

**Interfaces:**
- Consumes: `arrivals: number[]` (parallel to `path`, from `computeShortestPathWithWaypoints`, Task 9).
- Produces: `PathLeg` gains `duration: number` (seconds); `buildPathLegs(graph, path, arrivals): PathLeg[]`.

- [ ] **Step 1: Write the failing test**

Replace the full contents of `src/domain/gtfs/pathLegs.test.ts`:

```ts
import {describe, expect, it} from "vitest";
import {buildPathLegs} from "./pathLegs.ts";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

const graph: TransportGraph = {
    A: [{to: 'B', duration: 10, routeId: 'L1'}],
    B: [{to: 'C', duration: 10, routeId: 'L1'}],
    C: [{to: 'D', duration: 10, routeId: 'L2'}],
};

describe('buildPathLegs', () => {
    it('merges consecutive stops travelled on the same route into one leg, summing arrival gaps into duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C'], [0, 15, 30])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30},
        ]);
    });

    it('splits into a new leg when the route changes, each with its own duration', () => {
        expect(buildPathLegs(graph, ['A', 'B', 'C', 'D'], [0, 15, 30, 42])).toEqual([
            {routeId: 'L1', fromStopId: 'A', toStopId: 'C', stopIds: ['A', 'B', 'C'], duration: 30},
            {routeId: 'L2', fromStopId: 'C', toStopId: 'D', stopIds: ['C', 'D'], duration: 12},
        ]);
    });

    it('returns an empty array for a single-stop path', () => {
        expect(buildPathLegs(graph, ['A'], [0])).toEqual([]);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/domain/gtfs/pathLegs.test.ts`
Expected: FAIL — `buildPathLegs` doesn't accept `arrivals` or compute `duration` yet.

- [ ] **Step 3: Update `pathLegs.ts`**

Replace the full contents of `src/domain/gtfs/pathLegs.ts`:

```ts
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";

export type PathLeg = {
    routeId: string,
    fromStopId: string,
    toStopId: string,
    stopIds: string[],
    duration: number,
}

/**
 * Groups a shortest-path stop sequence into legs of consecutive stops
 * travelled on the same route, for display as "line X from A to B". Each
 * leg's `duration` is the sum of the per-edge elapsed time (`arrivals`,
 * parallel to `path`, as returned by `computeShortestPathWithWaypoints`),
 * so it includes any boarding wait charged on the leg's first edge.
 */
export const buildPathLegs = (graph: TransportGraph, path: string[], arrivals: number[]): PathLeg[] => {
    const legs: PathLeg[] = [];

    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i + 1];
        const routeId = graph[from]?.find(edge => edge.to === to)?.routeId;

        if (routeId === undefined) {
            continue;
        }

        const edgeDuration = arrivals[i + 1] - arrivals[i];
        const currentLeg = legs[legs.length - 1];

        if (currentLeg && currentLeg.routeId === routeId) {
            currentLeg.toStopId = to;
            currentLeg.stopIds.push(to);
            currentLeg.duration += edgeDuration;
        } else {
            legs.push({routeId, fromStopId: from, toStopId: to, stopIds: [from, to], duration: edgeDuration});
        }
    }

    return legs;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/domain/gtfs/pathLegs.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/domain/gtfs/pathLegs.ts src/domain/gtfs/pathLegs.test.ts
git commit -m "feat(gtfs): track per-leg duration in buildPathLegs"
```

---

## Task 11: `useShortestPath` — schedule-aware signature

**Files:**
- Modify: `src/hooks/gtfs/useShortestPath.ts`

**Interfaces:**
- Consumes: `computeShortestPathWithWaypoints`, `Schedule`, `PathConstraints` from `../../domain/gtfs/shortestPath.ts` (Task 9); `dayTypeForDate` from `../../domain/gtfs/dayType.ts` (Task 7); `Line` from `../../types/gtfs/gtfsLine.ts`.
- Produces: `export type UseShortestPathOptions = {requiredStations?: string[], constraints?: PathConstraints, departureDate?: Date}`; `useShortestPath(graph, fromStopId, toStopId, lines, options?): {path: string[] | null, duration: number | null, arrivals: number[]}`. `departureDate` defaults to "now" when omitted. No dedicated test file exists for this hook (it's exercised indirectly via `PathLayer.test.tsx` and `useAddressRoute.test.tsx`, both of which mock it) — this task has no new test file, but Task 12/13's updated tests cover the new call sites.

- [ ] **Step 1: Rewrite `useShortestPath.ts`**

Replace the full contents of `src/hooks/gtfs/useShortestPath.ts`:

```ts
import {useMemo} from "react";
import type {TransportGraph} from "../../types/gtfs/gtfsGraph.ts";
import type {Line} from "../../types/gtfs/gtfsLine.ts";
import type {PathConstraints, Schedule} from "../../domain/gtfs/shortestPath.ts";
import {computeShortestPathWithWaypoints} from "../../domain/gtfs/shortestPath.ts";
import {dayTypeForDate} from "../../domain/gtfs/dayType.ts";

const NO_REQUIRED_STATIONS: string[] = [];
const NO_RESULT = {path: null, duration: null, arrivals: []};

export type UseShortestPathOptions = {
    requiredStations?: string[],
    constraints?: PathConstraints,
    departureDate?: Date,
}

const secondsSinceMidnight = (date: Date) => date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();

/**
 * Memoized shortest path between two stops of a `TransportGraph`, forced
 * through `options.requiredStations` in order and honoring optional
 * `options.constraints` (forbidden stations/lines/edges). Path selection
 * accounts for estimated train wait times (see domain/gtfs/shortestPath.ts),
 * using `lines`' frequency data and `options.departureDate` (defaults to
 * now) to pick the time-of-day bucket. Returns `{path: null, duration:
 * null, arrivals: []}` until both stop ids and `lines` are set, or no path
 * exists under the given constraints.
 */
export function useShortestPath(
    graph: TransportGraph | undefined,
    fromStopId?: string,
    toStopId?: string,
    lines?: Line[],
    options: UseShortestPathOptions = {}
) {
    const {requiredStations = NO_REQUIRED_STATIONS, constraints, departureDate} = options;

    return useMemo(() => {
        if (!graph || !fromStopId || !toStopId || !lines) {
            return NO_RESULT;
        }

        const date = departureDate ?? new Date();
        const schedule: Schedule = {
            linesById: new Map(lines.map(line => [line.id, line])),
            dayType: dayTypeForDate(date),
        };

        const result = computeShortestPathWithWaypoints(
            graph, fromStopId, toStopId, secondsSinceMidnight(date), schedule, requiredStations, constraints
        );

        return result ?? NO_RESULT;
    }, [graph, fromStopId, toStopId, lines, requiredStations, constraints, departureDate]);
}
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test -- --run`
Expected: FAIL — `PathLayer.tsx` and `useAddressRoute.ts` still call the old 3/4-arg signature; TypeScript errors and/or `useShortestPath` returning `NO_RESULT` because `lines` is `undefined` at those call sites (fixed in Tasks 12-13).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/gtfs/useShortestPath.ts
git commit -m "feat(gtfs): thread schedule-aware options through useShortestPath"
```

---

## Task 12: `PathLayer` — pass `lines` through (mechanical, stays time-agnostic)

**Files:**
- Modify: `src/components/Path/PathLayer.tsx:17`

**Interfaces:**
- Consumes: `useShortestPath` (Task 11).

- [ ] **Step 1: Update the call site**

In `src/components/Path/PathLayer.tsx`, change line 17:

```tsx
    const {path} = useShortestPath(data?.graph, fromStopId, toStopId, data?.lines);
```

- [ ] **Step 2: Run `PathLayer`'s test**

Run: `npx vitest run src/components/Path/PathLayer.test.tsx`
Expected: PASS (the test mocks `useShortestPath` entirely, so the extra argument doesn't affect it).

- [ ] **Step 3: Commit**

```bash
git add src/components/Path/PathLayer.tsx
git commit -m "feat(gtfs): pass line frequencies through PathLayer's shortest-path call"
```

---

## Task 13: `useAddressRoute` — thread departure time and per-leg duration

**Files:**
- Modify: `src/hooks/gtfs/useAddressRoute.ts`
- Modify: `src/hooks/gtfs/useAddressRoute.test.tsx`

**Interfaces:**
- Consumes: `useShortestPath` (Task 11), `buildPathLegs` (Task 10).
- Produces: `useAddressRoute(data, fromAddress, toAddress, departureDate?: Date)` — unchanged return shape (`{fromStation, toStation, path, duration, legs, isLoading}`), `legs` now include `duration` per leg.

- [ ] **Step 1: Update the failing test**

Replace the full contents of `src/hooks/gtfs/useAddressRoute.test.tsx`:

```tsx
import {describe, expect, it, vi} from "vitest";
import {renderHook, waitFor} from "@testing-library/react";
import type {PropsWithChildren} from "react";
import {useAddressRoute} from "./useAddressRoute.ts";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

vi.mock("../geo/useGeocodedStation.ts");

const wrapper = ({children}: PropsWithChildren) => <>{children}</>;

const data: GtfsData = {
    graph: {A: [{to: 'B', duration: 300, routeId: 'L1'}]},
    shapes: {},
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    ],
    lines: [{
        id: 'L1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1,
        frequencies: {
            weekday: {peak: 10, offpeak: 10, night: 10},
            weekend: {peak: 10, offpeak: 10, night: 10},
        },
    }],
};

// Wednesday 08:00 -> weekday/peak bucket, 10min frequency -> 300s boarding wait.
const departureDate = new Date('2026-07-22T08:00:00');

describe('useAddressRoute', () => {
    it('geocodes both addresses, computes the schedule-aware path and groups it into legs', async () => {
        vi.mocked(useGeocodedStation).mockImplementation((_, address) => ({
            data: address === 'from' ? data.stations[0] : data.stations[1],
            isFetching: false,
        }) as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to', departureDate), {wrapper});

        await waitFor(() => expect(result.current.duration).toBe(300 + 300));
        expect(result.current.path).toEqual(['A', 'B']);
        expect(result.current.legs).toEqual([{routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 600}]);
    });

    it('has no path while a station is unresolved', () => {
        vi.mocked(useGeocodedStation).mockReturnValue({data: undefined, isFetching: true} as ReturnType<typeof useGeocodedStation>);

        const {result} = renderHook(() => useAddressRoute(data, 'from', 'to', departureDate), {wrapper});

        expect(result.current.path).toBeNull();
        expect(result.current.legs).toEqual([]);
        expect(result.current.isLoading).toBe(true);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/gtfs/useAddressRoute.test.tsx`
Expected: FAIL — `useAddressRoute` doesn't accept `departureDate` or pass `data.lines`/`arrivals` yet.

- [ ] **Step 3: Update `useAddressRoute.ts`**

Replace the full contents of `src/hooks/gtfs/useAddressRoute.ts`:

```ts
import {useMemo} from "react";
import {useGeocodedStation} from "../geo/useGeocodedStation.ts";
import {useShortestPath} from "./useShortestPath.ts";
import {buildPathLegs} from "../../domain/gtfs/pathLegs.ts";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

/**
 * End-to-end address routing: geocodes `fromAddress`/`toAddress` to their
 * nearest stations, computes the shortest schedule-aware path between them
 * for a departure at `departureDate` (defaults to now), and groups it into
 * per-line legs. `isLoading` covers both geocoding requests.
 */
export function useAddressRoute(data: GtfsData | undefined, fromAddress: string, toAddress: string, departureDate?: Date) {
    const fromStation = useGeocodedStation(data?.stations, fromAddress);
    const toStation = useGeocodedStation(data?.stations, toAddress);

    const {path, duration, arrivals} = useShortestPath(
        data?.graph, fromStation.data?.id, toStation.data?.id, data?.lines, {departureDate}
    );

    const legs = useMemo(() => {
        if (!data || !path) {
            return [];
        }
        return buildPathLegs(data.graph, path, arrivals);
    }, [data, path, arrivals]);

    return {
        fromStation: fromStation.data,
        toStation: toStation.data,
        path,
        duration,
        legs,
        isLoading: fromStation.isFetching || toStation.isFetching,
    };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/gtfs/useAddressRoute.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/gtfs/useAddressRoute.ts src/hooks/gtfs/useAddressRoute.test.tsx
git commit -m "feat(gtfs): thread departure time through useAddressRoute"
```

---

## Task 14: `RouteInfoPanel` — show per-leg duration

**Files:**
- Modify: `src/components/Address/RouteInfoPanel.tsx`
- Modify: `src/components/Address/RouteInfoPanel.test.tsx`

**Interfaces:**
- Consumes: `PathLeg.duration` (Task 10), `formatDuration` (existing).

- [ ] **Step 1: Update the failing test**

Replace the full contents of `src/components/Address/RouteInfoPanel.test.tsx`:

```tsx
import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import RouteInfoPanel from "./RouteInfoPanel.tsx";
import type {GtfsData} from "../../types/gtfs/gtfsData.ts";

const data = {
    stations: [
        {id: 'A', name: 'Station A', stopLat: 48.0, stopLon: 2.0, zoneId: '1'},
        {id: 'B', name: 'Station B', stopLat: 48.1, stopLon: 2.1, zoneId: '1'},
    ],
    lines: [
        {id: 'L1', shortName: '1', longName: 'Line 1', color: 'FF0000', textColor: 'FFFFFF', type: 1},
    ],
} as GtfsData;

describe('RouteInfoPanel', () => {
    it('shows the total duration and each leg by line short name, stop names and its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'L1', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 300},
        ]} />);

        expect(screen.getByText('Durée totale : 5min')).toBeInTheDocument();
        expect(screen.getByText('Ligne 1 : Station A → Station B (5min)')).toBeInTheDocument();
    });

    it('shows an interchange leg as "Changement à" instead of a line name, with its own duration', () => {
        render(<RouteInfoPanel data={data} duration={300} legs={[
            {routeId: 'TRANSFER', fromStopId: 'A', toStopId: 'B', stopIds: ['A', 'B'], duration: 60},
        ]} />);

        expect(screen.getByText('Changement à Station B (1min)')).toBeInTheDocument();
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Address/RouteInfoPanel.test.tsx`
Expected: FAIL — leg text doesn't include duration yet.

- [ ] **Step 3: Update `RouteInfoPanel.tsx`**

Replace line 29 (the ternary building the leg text) in `src/components/Address/RouteInfoPanel.tsx`:

```tsx
                        {leg.routeId === TRANSFER_ROUTE_ID
                            ? `Changement à ${stationById.get(leg.toStopId)?.name} (${formatDuration(leg.duration)})`
                            : `Ligne ${lineById.get(leg.routeId)?.shortName ?? leg.routeId} : ${stationById.get(leg.fromStopId)?.name} → ${stationById.get(leg.toStopId)?.name} (${formatDuration(leg.duration)})`}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Address/RouteInfoPanel.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Address/RouteInfoPanel.tsx src/components/Address/RouteInfoPanel.test.tsx
git commit -m "feat(gtfs): show each route leg's own duration"
```

---

## Task 15: `AddressForm` — optional departure time input

**Files:**
- Modify: `src/components/Address/AddressForm.tsx`
- Modify: `src/components/Address/AddressForm.test.tsx`

**Interfaces:**
- Produces: `AddressForm`'s `Props.onSubmit` grows a third parameter: `onSubmit: (fromAddress: string, toAddress: string, departureDate?: Date) => void`. Empty datetime input → `undefined` (caller's hook default is "now").

- [ ] **Step 1: Update the failing test**

Replace the full contents of `src/components/Address/AddressForm.test.tsx`:

```tsx
import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddressForm from "./AddressForm.tsx";

describe('AddressForm', () => {
    it('submits the typed departure and arrival addresses with no departure date when the time field is left empty', async () => {
        const onSubmit = vi.fn();
        render(<AddressForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.click(screen.getByText('Itinéraire'));

        expect(onSubmit).toHaveBeenCalledWith('1 rue de Paris', '2 rue de Lyon', undefined);
    });

    it('submits the chosen departure date when the time field is filled in', async () => {
        const onSubmit = vi.fn();
        render(<AddressForm onSubmit={onSubmit} />);

        await userEvent.type(screen.getByPlaceholderText('Adresse de départ'), '1 rue de Paris');
        await userEvent.type(screen.getByPlaceholderText("Adresse d'arrivée"), '2 rue de Lyon');
        await userEvent.type(screen.getByLabelText('Heure de départ'), '2026-07-26T14:30');
        await userEvent.click(screen.getByText('Itinéraire'));

        const [, , departureDate] = onSubmit.mock.calls[0];
        expect(departureDate).toEqual(new Date('2026-07-26T14:30:00'));
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Address/AddressForm.test.tsx`
Expected: FAIL — no departure-time input exists yet.

- [ ] **Step 3: Update `AddressForm.tsx`**

Replace the full contents of `src/components/Address/AddressForm.tsx`:

```tsx
import {useState} from "react";
import type {FormEvent} from "react";

type Props = {
    onSubmit: (fromAddress: string, toAddress: string, departureDate?: Date) => void,
}

/**
 * Departure/arrival address inputs plus an optional departure time. Calls
 * `onSubmit` with both raw address strings and the chosen `Date` (or
 * `undefined` if the time field is left empty, meaning "now") on submit;
 * geocoding and routing happen upstream.
 */
function AddressForm({onSubmit}: Props) {
    const [fromAddress, setFromAddress] = useState('');
    const [toAddress, setToAddress] = useState('');
    const [departureTime, setDepartureTime] = useState('');

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onSubmit(fromAddress, toAddress, departureTime ? new Date(departureTime) : undefined);
    };

    return (
        <form onSubmit={handleSubmit} className="address-form">
            <input
                type="text"
                placeholder="Adresse de départ"
                value={fromAddress}
                onChange={e => setFromAddress(e.target.value)}
            />
            <input
                type="text"
                placeholder="Adresse d'arrivée"
                value={toAddress}
                onChange={e => setToAddress(e.target.value)}
            />
            <label>
                Heure de départ
                <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={e => setDepartureTime(e.target.value)}
                />
            </label>
            <button type="submit">Itinéraire</button>
        </form>
    );
}

export default AddressForm;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Address/AddressForm.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Address/AddressForm.tsx src/components/Address/AddressForm.test.tsx
git commit -m "feat(gtfs): add optional departure time to AddressForm"
```

---

## Task 16: Wire departure time through `FullMap`

**Files:**
- Modify: `src/components/Map/FullMap.tsx`

**Interfaces:**
- Consumes: `AddressForm`'s new `onSubmit` third param (Task 15), `useAddressRoute`'s new `departureDate` param (Task 13).

- [ ] **Step 1: Update `FullMap.tsx`**

In `src/components/Map/FullMap.tsx`, add a new state variable after line 32 (`const [toAddress, setToAddress] = useState('');`):

```tsx
    const [departureDate, setDepartureDate] = useState<Date>();
```

Update line 35 to pass it through:

```tsx
    const addressRoute = useAddressRoute(data, fromAddress, toAddress, departureDate);
```

Update line 56 (the `AddressForm` usage) to capture the third callback argument:

```tsx
            <AddressForm onSubmit={(from, to, date) => { setFromAddress(from); setToAddress(to); setDepartureDate(date); }} />
```

- [ ] **Step 2: Run the full test suite and typecheck**

Run: `npm test -- --run && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/Map/FullMap.tsx
git commit -m "feat(gtfs): wire the chosen departure time into address routing"
```

---

## Task 17: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test -- --run`
Expected: PASS, all tests green.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, no errors.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (fix any reported issues before moving on).

- [ ] **Step 4: Rebuild `gtfs.json` from the real data to sanity-check the pipeline end-to-end**

Run: `node scripts/build-gtfs.mjs`
Expected: Completes without error; spot-check `public/data/gtfs.json` — a few entries in `lines` should have a `frequencies` object with plausible (non-zero, non-absurd) minute values.

- [ ] **Step 5: Manually exercise the address-form flow in the browser**

Run: `npm run dev`, open the app, enter two addresses with no departure time (expect "now" behavior), then again with an explicit past/future `datetime-local` value, and confirm `RouteInfoPanel` shows a total duration and per-leg durations that look reasonable (each leg's duration should be at least its raw ride time, since it also includes any boarding wait).

---

## Self-Review Notes

- **Spec coverage:** §1 (calendar ingestion, frequency computation, `Line.frequencies`) → Tasks 3-6. §2 (time-dependent Dijkstra, state keying, boarding wait rule, transfer/waypoint resets) → Tasks 7-10. §3 (datetime input, `useAddressRoute`/`useShortestPath` threading, per-leg duration display, no new `RouteStatus`) → Tasks 11-16 (no `RouteStatus` changes made, per spec). "Known simplifications" section requires no code — it documents existing choices (calendar_dates ignored: never read in Task 3; sparse fallback: Task 4's `DEFAULT_FREQUENCY_MINUTES`; waypoint reset: Task 9's per-leg fresh search; per-line averaging: Task 4's `computeLineFrequencies` grouping by `route_id` only).
- **Placeholder scan:** no TBD/TODO markers; every step has literal code.
- **Type consistency:** verified `Schedule`, `PathConstraints`, `WaypointPathResult`, `PathLeg`, `UseShortestPathOptions` are defined once (Tasks 9-11) and reused with matching names/shapes in Tasks 10, 12-14, 16. `Line.frequencies` (Task 5) matches the shape produced by `computeLineFrequencies` (Task 4) and consumed by `computeBoardingWaitSeconds` (Task 8).
