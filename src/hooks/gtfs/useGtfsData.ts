import {fetchGtfsData} from "../../services/gtfs/fetchGtfs.ts";
import {useQuery} from "@tanstack/react-query";

export function useGtfsData() {
    return useQuery({
        queryKey: ['gtfs'],
        queryFn: fetchGtfsData
    });
}