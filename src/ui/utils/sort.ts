import type {TableSortState} from '@gravity-ui/uikit';
import get from 'lodash/get';

import {ASC} from './constants';
import {compareDates} from './date';

export function compareStrings(a: string, b: string, dir = ASC) {
    if (dir === ASC) {
        return a > b ? 1 : -1;
    }

    return b > a ? 1 : -1;
}

export function sortStringsFactory<T>(path: string | string[] = '', dir = ASC) {
    return function (first: T, second: T) {
        const a = get(first, path) || first;
        const b = get(second, path) || second;

        const str1 = String(a);
        const str2 = String(b);

        return compareStrings(str1, str2, dir);
    };
}

export function compareNumbers(a: number, b: number, dir = ASC) {
    if (Number.isNaN(a)) {
        return 1;
    }

    if (Number.isNaN(b)) {
        return -1;
    }

    if (dir === ASC) {
        return a - b;
    }

    return b - a;
}

export function sortNumbersFactory<T>(path: string | string[] = '', dir = ASC) {
    return function (first: T, second: T) {
        const a = get(first, path) ?? first;
        const b = get(second, path) ?? second;

        const num1 = Number(a);
        const num2 = Number(b);

        return compareNumbers(num1, num2, dir);
    };
}

export function sortDateFactory<T>(path: string | string[] = '', dir = ASC) {
    return function (first: T, second: T) {
        return compareDates(get(first, path), get(second, path), dir);
    };
}

export function sortByName<T extends {name: string}>(item1: T, item2: T) {
    return item1.name.localeCompare(item2.name);
}

/**
 * Converts multi-parameter sorting into single-parameter sorting and generates an orderBy string for the backend
 * You will likely need it around onSortStateChange
 * Both SortStates can be longer than 1 if shift is held down — this will then sort by multiple fields simultaneously
 * @param currentSortState
 * @param newSortState
 * @param columnMap a key-value map for renaming from the table parameter name to the one required in the query
 * @returns a pair of SortState and OrderBy string, the first for the table, the second for the query
 */
export function getSingleColumnSortState(
    currentSortState: TableSortState,
    newSortState: TableSortState,
    columnMap: Record<string, string> = {},
): [TableSortState, string | undefined] {
    // undefined if newSortState has 0 elements
    // undefined if all new entities are not equal to a single entity — the first old sort
    // in sortStateColumn, the single element of newSortState is used if newSortState.length === 1
    const sortStateColumn = newSortState.find(
        (item) => newSortState.length === 1 || item.column !== currentSortState[0]?.column,
    );

    if (!sortStateColumn) return [[], undefined];

    const orderBy = `${columnMap[sortStateColumn.column] || sortStateColumn.column} ${
        sortStateColumn.order
    }`;
    const resultSortState = [sortStateColumn];
    return [resultSortState, orderBy];
}

export function sortEnumFactory<T>(path: string | string[] = '', enumOrder: string[], dir = ASC) {
    const enumOrderMap = enumOrder.reduce<Record<string, number>>((acc, value, index) => {
        acc[value] = index;
        return acc;
    }, {});
    const unknownValueOrder = enumOrder.length;

    return function (first: T, second: T) {
        const a = enumOrderMap[get(first, path)] ?? unknownValueOrder;
        const b = enumOrderMap[get(second, path)] ?? unknownValueOrder;

        if (dir === ASC) {
            return a - b;
        }

        return b - a;
    };
}
