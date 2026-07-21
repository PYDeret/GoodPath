import fs from 'node:fs'
import { parse } from "csv-parse";
import path from 'node:path'

const KEPT_TYPES = ['0', '1', '2']

const records = [];
const routes = path.resolve(import.meta.dirname, '../data/gtfs/routes.txt')
const parser = parse({
    delimiter: ",",
    columns: true,
});

parser.on("readable", function () {
    let record;
    while ((record = parser.read()) !== null) {
        if (!KEPT_TYPES.includes(record.route_type)) {
            continue;
        }

        records.push(record);
    }
});

parser.on("error", function (err) {
    console.error(err.message);
});

let reader = fs.createReadStream(routes, {
    encoding: 'UTF-8',
});

reader.pipe(parser);
parser.on('end', () => {
    console.log(records.length);
});