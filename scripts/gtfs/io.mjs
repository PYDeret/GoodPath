import {parse} from "csv-parse";
import fs from "node:fs";

export function readGtfsCsv(filePath, onRecord) {
    return new Promise((resolve, reject) => {
        const parser = parse({
            delimiter: ',',
            columns: true
        })

        const results = []

        parser.on('readable', () => {
            let record
            while ((record = parser.read()) !== null) {
                if (typeof onRecord === 'function') {
                    const kept = onRecord(record);
                    if (kept) {
                        results.push(kept)
                    }
                }
            }
        })

        parser.on('error', reject);
        parser.on('end', () => resolve(results));

        fs.createReadStream(filePath).pipe(parser);
    })
}