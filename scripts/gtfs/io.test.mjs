import {afterEach, describe, expect, it} from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {createJson, readGtfsCsv} from "./io.mjs";

const tmpFiles = [];

const writeTmpCsv = (content) => {
    const filePath = path.join(os.tmpdir(), `gtfs-test-${Date.now()}-${Math.random()}.csv`);
    fs.writeFileSync(filePath, content);
    tmpFiles.push(filePath);
    return filePath;
}

afterEach(() => {
    tmpFiles.splice(0).forEach(filePath => fs.rmSync(filePath));
});

describe('readGtfsCsv', () => {
    it('parses rows as objects keyed by header', async () => {
        const filePath = writeTmpCsv('stop_id,stop_name\nA,Station A\nB,Station B\n');

        const records = await readGtfsCsv(filePath, (record) => record);

        expect(records).toEqual([
            {stop_id: 'A', stop_name: 'Station A'},
            {stop_id: 'B', stop_name: 'Station B'},
        ]);
    });

    it('drops rows rejected by onRecord', async () => {
        const filePath = writeTmpCsv('stop_id,stop_name\nA,Station A\nB,Station B\n');

        const records = await readGtfsCsv(filePath, (record) => record.stop_id === 'A' ? record : null);

        expect(records).toEqual([{stop_id: 'A', stop_name: 'Station A'}]);
    });

    it('resolves to an empty array when no onRecord is given', async () => {
        const filePath = writeTmpCsv('stop_id,stop_name\nA,Station A\n');

        const records = await readGtfsCsv(filePath);

        expect(records).toEqual([]);
    });
});

describe('createJson', () => {
    it('writes buildData output as JSON to the given path', () => {
        const filePath = path.join(os.tmpdir(), `gtfs-test-${Date.now()}-${Math.random()}.json`);
        tmpFiles.push(filePath);

        const routes = [{route_id: 'R1', route_short_name: '1', route_long_name: 'Line 1', route_color: 'FFF', route_text_color: '000', route_type: '1'}];
        createJson(routes, [], [], [], [], [], filePath);

        const written = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        expect(written.lines).toEqual([
            {id: 'R1', shortName: '1', longName: 'Line 1', color: 'FFF', textColor: '000', type: 1},
        ]);
    });
});
