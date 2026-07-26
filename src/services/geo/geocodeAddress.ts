export type GeocodedAddress = {
    lat: number,
    lon: number,
    label: string,
}

type BanFeature = {
    geometry: {coordinates: [number, number]},
    properties: {label: string},
}

// ponytail: biases toward Paris to disambiguate same-named localities elsewhere in France, since GoodPath only covers Île-de-France
async function fetchBanFeatures(query: string, limit: number): Promise<BanFeature[]> {
    const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&lat=48.8566&lon=2.3522&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.features ?? [];
}

function toGeocodedAddress(feature: BanFeature): GeocodedAddress {
    const [lon, lat] = feature.geometry.coordinates;
    return {lat, lon, label: feature.properties.label};
}

/**
 * Resolves a free-text address to coordinates via the French government's
 * free BAN API (no key required). Returns null if no match is found.
 */
export async function geocodeAddress(query: string): Promise<GeocodedAddress | null> {
    const [feature] = await fetchBanFeatures(query, 1);
    return feature ? toGeocodedAddress(feature) : null;
}

/**
 * Returns up to 5 address suggestions from the BAN API for a partial query,
 * for use in autocomplete dropdowns.
 */
export async function searchAddresses(query: string): Promise<GeocodedAddress[]> {
    const features = await fetchBanFeatures(query, 5);
    return features.map(toGeocodedAddress);
}
