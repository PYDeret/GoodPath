export type LineDepartureTimes = {
    weekday: number[],
    weekend: number[],
}

export type Line = {
    id: string,
    shortName: string,
    longName: string,
    color: string,
    textColor: string,
    type: number,
    departureTimes: LineDepartureTimes,
}
