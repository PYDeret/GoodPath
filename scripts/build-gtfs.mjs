import fs from 'node:fs'
import { parse } from "csv-parse";
import path from 'node:path'

const KEPT_TYPES = ['0', '1', '2']
const routePath = path.resolve(import.meta.dirname, '../data/gtfs/routes.txt')
const tripPath = path.resolve(import.meta.dirname, '../data/gtfs/trips.txt')

function parseGtfsFile(filePath, onRecord) {
    return new Promise((resolve, reject) => {
        const parser = parse({
            delimiter: ',',
            columns: true
        })

        const results = []

        parser.on('readable', () => {
            let record
            while ((record = parser.read()) !== null) {
                const kept = onRecord(record);
                if (kept) {
                    results.push(kept)
                }
            }
        })

        parser.on('error', reject);
        parser.on('end', () => resolve(results));

        fs.createReadStream(filePath).pipe(parser);
    })
}

async function main() {
    const routeIds = await parseGtfsFile(routePath, r =>
        KEPT_TYPES.includes(r.route_type) ? r.route_id : null
    )

    const routeIdSet = new Set(routeIds);
    const tripIds = await parseGtfsFile(tripPath, t =>
        routeIdSet.has(t.route_id) ? t.trip_id : null
    )

    console.log(tripIds);
}

main();