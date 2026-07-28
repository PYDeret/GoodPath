const BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/ilico';
const MAX_CONCURRENCY = 10;

const bareLineId = (lineId) => lineId.replace(/^IDFM:/, '');

const fetchIcon = async (bareId, apiToken, fetchImpl) => {
    const response = await fetchImpl(`${BASE_URL}/getIcon/${bareId}?style=colored`, {
        headers: {Authorization: apiToken},
    });

    if (response.status === 404) {
        return undefined;
    }
    if (!response.ok) {
        throw new Error(`getIcon failed for ${bareId}: HTTP ${response.status}`);
    }

    return response.text();
};

export async function fetchLineIcons(lineIds, apiToken, fetchImpl = fetch) {
    const bareIds = [...new Set(lineIds.map(bareLineId))];
    const icons = new Map();
    let cursor = 0;

    const worker = async () => {
        while (cursor < bareIds.length) {
            const bareId = bareIds[cursor++];
            try {
                const svg = await fetchIcon(bareId, apiToken, fetchImpl);
                if (svg !== undefined) {
                    icons.set(bareId, svg);
                } else {
                    console.warn(`[fetchLineIcons] no icon for line ${bareId} (404)`);
                }
            } catch (error) {
                console.warn(`[fetchLineIcons] failed to fetch icon for line ${bareId}: ${error.message}`);
            }
        }
    };

    const workerCount = Math.min(MAX_CONCURRENCY, bareIds.length);
    await Promise.all(Array.from({length: workerCount}, worker));

    return icons;
}
