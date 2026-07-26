export type DayFrequencies = {
    peak: number,
    offpeak: number,
    night: number,
}

export type LineFrequencies = {
    weekday: DayFrequencies,
    weekend: DayFrequencies,
}

export type Line = {
    id: string,
    shortName: string,
    longName: string,
    color: string,
    textColor: string,
    type: number,
    frequencies: LineFrequencies,
}