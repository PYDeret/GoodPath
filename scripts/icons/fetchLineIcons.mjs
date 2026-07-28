const BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/ilico';

const bareLineId = (lineId) => lineId.replace(/^IDFM:/, '');

// PRIM's API key quota is 50 requests/day, so all icons must come from a
// single /getIcon/sprite call rather than one request per line. Each
// <symbol id="line:IDFM:xxx"> in the returned sprite is unwrapped back into
// a standalone SVG so the rest of the app (LineBadge) can keep treating
// icons as one static file per line, same as if getIcon/{lineId} had been
// called directly. Most symbols omit their own viewBox (inheriting the
// root <svg>'s), and some reference <clipPath> defs declared once, outside
// every symbol — both must be carried over or the standalone SVG renders
// wrong or with its background clipped away.
const parseSprite = (spriteSvg) => {
    const rootViewBoxMatch = spriteSvg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/);
    const defaultViewBox = rootViewBoxMatch ? rootViewBoxMatch[1] : '0 0 60 60';

    const clipPaths = new Map();
    const clipPathRe = /<clipPath\b[^>]*\bid="([^"]+)"[^>]*>[\s\S]*?<\/clipPath>/g;
    let clipMatch;
    while ((clipMatch = clipPathRe.exec(spriteSvg)) !== null) {
        clipPaths.set(clipMatch[1], clipMatch[0]);
    }

    const icons = new Map();
    const symbolRe = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
    let match;

    while ((match = symbolRe.exec(spriteSvg)) !== null) {
        const [, attrs, inner] = match;
        const idMatch = attrs.match(/\bid="line:([^"]+)"/);
        if (!idMatch) {
            continue;
        }
        const viewBoxMatch = attrs.match(/\bviewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : defaultViewBox;

        const usedClipIds = [...inner.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map((clip) => clip[1]);
        const defs = usedClipIds.map((clipId) => clipPaths.get(clipId)).filter(Boolean).join('');
        const defsBlock = defs ? `<defs>${defs}</defs>` : '';

        icons.set(idMatch[1], `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defsBlock}${inner}</svg>`);
    }

    return icons;
};

export async function fetchLineIcons(lineIds, apiToken, fetchImpl = fetch) {
    const uniqueLineIds = [...new Set(lineIds)];

    const response = await fetchImpl(`${BASE_URL}/getIcon/sprite?getAll=true&format=sprite&style=colored`, {
        headers: {apikey: apiToken},
    });
    if (!response.ok) {
        throw new Error(`getIcon/sprite failed: HTTP ${response.status}`);
    }

    const allIcons = parseSprite(await response.text());
    const icons = new Map();

    for (const lineId of uniqueLineIds) {
        const bareId = bareLineId(lineId);
        if (allIcons.has(lineId)) {
            icons.set(bareId, allIcons.get(lineId));
        } else {
            console.warn(`[fetchLineIcons] no icon for line ${bareId}`);
        }
    }

    return icons;
}
