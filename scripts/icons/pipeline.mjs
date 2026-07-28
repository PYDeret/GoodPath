import path from 'node:path';
import fs from 'node:fs';
import {fetchLineIcons} from './fetchLineIcons.mjs';

const gtfsJsonPath = path.resolve(import.meta.dirname, '../../public/data/gtfs.json');
const iconsDir = path.resolve(import.meta.dirname, '../../public/data/icons');

export async function main() {
    const apiToken = process.env.PRIM_API_TOKEN;
    if (!apiToken) {
        throw new Error('PRIM_API_TOKEN is not set. Add it to a .env file at the project root.');
    }

    const gtfsData = JSON.parse(fs.readFileSync(gtfsJsonPath, 'utf8'));
    const lineIds = gtfsData.lines.map((line) => line.id);

    const icons = await fetchLineIcons(lineIds, apiToken);

    fs.mkdirSync(iconsDir, {recursive: true});
    for (const [bareId, svg] of icons) {
        fs.writeFileSync(path.join(iconsDir, `${bareId}.svg`), svg);
    }

    console.log(`Wrote ${icons.size} of ${new Set(lineIds).size} line icons to ${iconsDir}`);
}
