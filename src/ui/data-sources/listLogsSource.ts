import {skipContext} from '@gravity-ui/data-source';
import axios from 'axios';

import type {ListLogsRequest, ListLogsResponse} from '../../shared/api/listLogs';
import {makePlainQueryDataSource} from '../components/data-source';
import api from '../services/api';
import {DEFAULT_REFETCH_INTERVAL} from '../utils/constants';

export const listLogsSource = makePlainQueryDataSource({
    name: 'listLogs',
    fetch: skipContext(async ({hash}: ListLogsRequest) => {
        try {
            const {
                logs = [],
                finished,
                status,
                message = '',
            } = await api.request<ListLogsRequest, ListLogsResponse>({
                action: 'listLogs',
                data: {
                    hash,
                },
            });

            return {
                logs,
                message,
                status,
                finished,
            };
        } catch (error) {
            let logs;
            if (axios.isAxiosError(error)) {
                logs = error.response?.data?.data?.logs;
            }
            return {
                finished: false,
                logs,
                message: '',
                status: undefined,
            };
        }
    }),
    options: {
        refetchInterval: DEFAULT_REFETCH_INTERVAL,
    },
});
