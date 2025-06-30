import {
    type PlainQueryDataSource,
    // eslint-disable-next-line no-restricted-imports
    makePlainQueryDataSource as makePlainQueryDataSourceBase,
    withCancellation,
} from '@gravity-ui/data-source';

import type {QueryError} from '../types';

export const makePlainQueryDataSource = <
    TParams,
    TRequest,
    TResponse,
    TData,
    TError = QueryError,
    TErrorResponse = unknown,
>(
    config: Omit<
        PlainQueryDataSource<TParams, TRequest, TResponse, TData, TError, TErrorResponse>,
        'type'
    >,
): PlainQueryDataSource<TParams, TRequest, TResponse, TData, TError, TErrorResponse> => {
    const dataSource = makePlainQueryDataSourceBase(config);

    dataSource.fetch = withCancellation<typeof dataSource>(dataSource.fetch);

    return dataSource;
};
