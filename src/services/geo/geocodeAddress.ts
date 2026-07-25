export type GeocodedAddress = {
    lat: number,
    lon: number,
    label: string,
}

/**
 * Resolves a free-text address to coordinates via the French government's
 * free BAN API (no key required). Returns null if no match is found.
 */
export async function geocodeAddress(query: string): Promise<GeocodedAddress | null> {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    const feature = data.features?.[0];

    if (!feature) {
        return null;
    }

    const [lon, lat] = feature.geometry.coordinates;
    return {lat, lon, label: feature.properties.label};
}
