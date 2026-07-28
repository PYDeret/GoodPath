const BASE_URL = 'https://prim.iledefrance-mobilites.fr/marketplace/ilico';
const MAX_CONCURRENCY = 5;
const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 500;

const bareLineId = (lineId) => lineId.replace(/^IDFM:/, '');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ponytail: PRIM rate-limits aggressively (HTTP 429) under load; back off per
// its Retry-After header when present, else exponentially, up to MAX_RETRIES.
const retryDelayMs = (response, attempt) => {
    const retryAfterSeconds = Number(response.headers?.get?.('retry-after'));
    if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        return retryAfterSeconds * 1000;
    }
    return BASE_RETRY_DELAY_MS * 2 ** attempt;
};

const fetchIcon = async (bareId, apiToken, fetchImpl) => {
    for (let attempt = 0; ; attempt++) {
        const response = await fetchImpl(`${BASE_URL}/getIcon/${bareId}?style=colored`, {
            headers: {apikey: apiToken},
        });

        if (response.status === 404) {
            return undefined;
        }
        if (response.status === 429 && attempt < MAX_RETRIES) {
            await sleep(retryDelayMs(response, attempt));
            continue;
        }
        if (!response.ok) {
            throw new Error(`getIcon failed for ${bareId}: HTTP ${response.status}`);
        }

        return response.text();
    }
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
