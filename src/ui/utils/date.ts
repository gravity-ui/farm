import type {DateTime, DateTimeInput} from '@gravity-ui/date-utils';
import {dateTime} from '@gravity-ui/date-utils';

import {ASC, DESC} from './constants';

export interface Timestamp {
    seconds: string;
    nanos?: number;
}

export const timestampToMilliseconds = (ts: Timestamp, ceilNanos?: boolean) => {
    const {seconds, nanos} = ts;

    let milliseconds = 0;
    if (nanos) {
        milliseconds = ceilNanos ? Math.ceil(nanos / 10 ** 6) : Math.floor(nanos / 10 ** 6);
    }

    const result = Number(seconds) * 1000 + milliseconds;

    return result;
};

export function isTimestamp(date?: unknown): date is Timestamp {
    return date !== null && typeof date === 'object' && 'seconds' in date;
}

/**
 * moment-like helper to parse unknown inputs
 * @param input any
 * @returns DateTime (dayjs) object
 */
export const parse = (input?: unknown) => {
    return parseInput(input || Date.now()) as DateTime;
};

// internal
type DateTimeConfig = {
    timezone?: string;
    label?: string;
};

let config: DateTimeConfig = {};

export const configure = (patch: Partial<DateTimeConfig>) => {
    if (!patch) return;

    config = {...config, ...patch};
};

/**
 * this helper is trying to handle all known cornercases and multitude of date inputs in our codebase
 * ex. date-utils/dateTimeParse will parse epoch as milliseconds so it can't handle Protobuf Timestamp (seconds)
 * @param unknownInput any
 * @param tz [string] converts parsed date to provided timezone
 * @returns DateTime object
 */
function parseInput(unknownInput: unknown, tz?: string): DateTime | undefined {
    // TODO: should never be called with undefined if possible
    if (!unknownInput) {
        console.error('empty date input!');
        return undefined;
    }

    let input = unknownInput;

    if (isTimestamp(input)) {
        input = timestampToMilliseconds(input);
    } else if (typeof input === 'number' || typeof input === 'string') {
        const maybeTimeStamp = Number(input);
        if (!Number.isNaN(maybeTimeStamp)) {
            // timestamp is in seconds
            if (Date.now() / maybeTimeStamp > 100) {
                input = maybeTimeStamp * 1000;
            } else {
                input = maybeTimeStamp;
            }
        }
    }

    const date = dateTime({
        input: input as DateTimeInput,
        timeZone: tz || config.timezone,
    });

    return date;
}

export function compareDates(a: DateTimeInput, b: DateTimeInput, dir = ASC) {
    const dateA = parse(a);
    const dateB = parse(b);

    if (!dateA.isValid()) {
        return 1;
    }
    if (!dateB.isValid()) {
        return -1;
    }
    if (dateA.isSame(dateB)) {
        return 0;
    }

    const result = dateA.isAfter(dateB) ? 1 : -1;

    return dir === DESC ? result * -1 : result;
}
