export type DayType = 'weekday' | 'weekend';

/** Saturday and Sunday count as 'weekend'; every other day is 'weekday'. */
export const dayTypeForDate = (date: Date): DayType => {
    const day = date.getDay();
    return day === 0 || day === 6 ? 'weekend' : 'weekday';
}
