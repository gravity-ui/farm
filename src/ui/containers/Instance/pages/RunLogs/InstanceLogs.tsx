import React, {useCallback, useState} from 'react';

import {Card} from '@gravity-ui/uikit';
import type {QueryKey} from '@tanstack/react-query';
import {useQuery} from '@tanstack/react-query';
import {useParams} from 'react-router-dom';

import type {
    ListInstanceLogsRequest,
    ListInstanceLogsResponse,
} from '../../../../../shared/api/listInstanceLogs';
import {LoaderContainer} from '../../../../components/data-source';
import {Page} from '../../../../components/layouts/Page/Page';
import api from '../../../../services/api';
import {InstanceLayout} from '../../layouts/InstanceLayout';

import LogViewer from './LogViewer/LogViewer';
import {i18n} from './i18n';

import * as styles from './InstanceLogs.module.css';

export const InstanceRunLogsPage = () => {
    const {hash} = useParams();

    const [outLimit, setOutLimit] = useState(300);
    const [errLimit, setErrLimit] = useState(300);

    const fetchData = useCallback(
        ({queryKey}: {queryKey: QueryKey}) => {
            const [_key, maxOut, maxErr] = queryKey as number[];

            if (!hash) {
                return Promise.resolve<ListInstanceLogsResponse>({stdout: '', stderr: ''});
            }

            const request = api.request<ListInstanceLogsRequest, ListInstanceLogsResponse>({
                action: 'listInstanceLogs',
                data: {
                    hash,
                    params: {stdOut: {maxLines: maxOut}, stdError: {maxLines: maxErr}},
                },
            });

            return request;
        },
        [hash],
    );

    const {data, isLoading} = useQuery({
        queryKey: ['instance-logs', outLimit, errLimit],
        queryFn: fetchData,
    });

    const renderBody = () => {
        if (!data) return null;
        const {stdout, stderr} = data;
        return (
            <React.Fragment>
                <Card className={styles.logcard}>
                    <LogViewer name="stdout" logs={stdout} changeNumItems={setOutLimit} />
                </Card>
                <Card className={styles.logcard}>
                    <LogViewer name="stderr" logs={stderr} changeNumItems={setErrLimit} />
                </Card>
            </React.Fragment>
        );
    };

    return (
        <InstanceLayout>
            <Page header={i18n('title')} className={styles.instanceLogs}>
                <div className={styles.body}>{isLoading ? <LoaderContainer /> : renderBody()}</div>
            </Page>
        </InstanceLayout>
    );
};
