const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Stable id for a trip's exact ordered stop sequence (FNV-1a hash, hex
 * string). Two trips sharing this id are physically interchangeable for
 * routing purposes; a trip that skips a stop the other serves gets a
 * different id.
 */
export const computePatternId = (stopIds) => {
    const joined = stopIds.join('>');
    let hash = FNV_OFFSET_BASIS;

    for (let i = 0; i < joined.length; i++) {
        hash ^= joined.charCodeAt(i);
        hash = Math.imul(hash, FNV_PRIME);
    }

    return (hash >>> 0).toString(16);
}
