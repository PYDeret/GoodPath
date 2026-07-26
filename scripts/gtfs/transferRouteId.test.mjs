import {describe, expect, it} from "vitest";
import {TRANSFER_ROUTE_ID as buildTransferRouteId} from "./transform.mjs";
import {TRANSFER_ROUTE_ID as appTransferRouteId} from "../../src/domain/gtfs/transferRouteId.ts";

describe('TRANSFER_ROUTE_ID', () => {
    it('stays in sync between the build pipeline and the app', () => {
        expect(buildTransferRouteId).toBe(appTransferRouteId);
    });
});
