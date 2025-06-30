import {
    type InfiniteQueryDataSource,
    // eslint-disable-next-line no-restricted-imports
    makeInfiniteQueryDataSource as makeInfiniteQueryDataSourceBase,
    withCancellation,
} from '@gravity-ui/data-source';

import type {QueryError} from '../types';

export const makeInfiniteQueryDataSource = <
    TParams,
    TRequest,
    TResponse,
    TData,
    TError = QueryError,
    TErrorResponse = unknown,
>(
    config: Omit<
        InfiniteQueryDataSource<TParams, TRequest, TResponse, TData, TError, TErrorResponse>,
        'type'
    >,
): InfiniteQueryDataSource<TParams, TRequest, TResponse, TData, TError, TErrorResponse> => {
    const dataSource = makeInfiniteQueryDataSourceBase(config);

    dataSource.fetch = withCancellation<typeof dataSource>(dataSource.fetch);

    return dataSource;
};
