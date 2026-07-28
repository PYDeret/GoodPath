const BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/ilico';

const bareLineId = (lineId) => lineId.replace(/^IDFM:/, '');

// PRIM's API key quota is 50 requests/day, so all icons must come from a
// single /getIcon/sprite call rather than one request per line. Each
// <symbol> in the returned sprite is unwrapped back into a standalone SVG
// so the rest of the app (LineBadge) can keep treating icons as one static
// file per line, same as if getIcon/{lineId} had been called directly.
const parseSprite = (spriteSvg) => {
    const icons = new Map();
    const symbolRe = /<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g;
    let match;

    while ((match = symbolRe.exec(spriteSvg)) !== null) {
        const [, attrs, inner] = match;
        const idMatch = attrs.match(/\bid="([^"]+)"/);
        if (!idMatch) {
            continue;
        }
        const viewBoxMatch = attrs.match(/\bviewBox="([^"]+)"/);
        const viewBox = viewBoxMatch ? viewBoxMatch[1] : '0 0 60 60';
        icons.set(idMatch[1], `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${inner}</svg>`);
    }

    return icons;
};

export async function fetchLineIcons(lineIds, apiToken, fetchImpl = fetch) {
    const bareIds = new Set(lineIds.map(bareLineId));

    const response = await fetchImpl(`${BASE_URL}/getIcon/sprite?getAll=true&format=sprite&style=colored`, {
        headers: {apikey: apiToken},
    });
    if (!response.ok) {
        throw new Error(`getIcon/sprite failed: HTTP ${response.status}`);
    }

    const allIcons = parseSprite(await response.text());
    const icons = new Map();

    for (const bareId of bareIds) {
        if (allIcons.has(bareId)) {
            icons.set(bareId, allIcons.get(bareId));
        } else {
            console.warn(`[fetchLineIcons] no icon for line ${bareId}`);
        }
    }

    return icons;
}
