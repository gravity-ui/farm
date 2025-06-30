import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {dateTimeParse} from '@gravity-ui/date-utils';
import {Queue as QueueIllustration} from '@gravity-ui/illustrations';
import type {TableColumnConfig} from '@gravity-ui/uikit';
import {PlaceholderContainer, Table, withTableCopy} from '@gravity-ui/uikit';

import type {InstanceWithProviderStatus} from '../../../shared/common';
import {DataLoader} from '../../components/data-source';
import {InstanceHash} from '../../components/instance/InstanceHash/InstanceHash';
import InstanceStatusLabel, {
    getInstanceStatus,
} from '../../components/instance/InstanceStatusLabel/InstanceStatusLabel';
import {Page} from '../../components/layouts/Page/Page';
import {getQueueSource} from '../../data-sources';
import {i18nInstance} from '../../i18n-common/i18nInstance';
import {useGetOpenInstancePage} from '../../utils/openInstancePage';
import {compareStrings, sortDateFactory, sortStringsFactory} from '../../utils/sort';

import {i18n} from './i18n';

const QueueTable = withTableCopy<InstanceWithProviderStatus>(Table);

const columns: TableColumnConfig<InstanceWithProviderStatus>[] = [
    {
        id: 'project',
        name: i18nInstance('project'),
        meta: {
            sort: sortStringsFactory('project'),
        },
    },
    {
        id: 'branch',
        name: i18nInstance('branch'),
        template: ({branch, instanceConfigName}) => {
            let name = branch.replace('users/', '');
            if (instanceConfigName) {
                name += ` [${instanceConfigName}]`;
            }
            return name;
        },
        meta: {
            sort: sortStringsFactory('branch'),
        },
    },
    {
        id: 'hash',
        name: i18nInstance('hash'),
        template: ({hash}) => <InstanceHash hash={hash} />,
        meta: {
            copy: ({hash}: InstanceWithProviderStatus) => {
                if (!hash) {
                    throw new Error('hash is not defined');
                }

                return hash;
            },
        },
    },
    {
        id: 'status',
        name: i18nInstance('status'),
        template: (instance) => <InstanceStatusLabel instance={instance} />,
        meta: {
            sort: (a: InstanceWithProviderStatus, b: InstanceWithProviderStatus) =>
                compareStrings(getInstanceStatus(a).text, getInstanceStatus(b).text),
        },
    },
    {
        id: 'startTime',
        name: i18nInstance('last-changes'),
        template: ({startTime}) =>
            dateTimeParse(Number(startTime) || 'now')?.format('DD.MM.YYYY HH:mm'),
        meta: {
            sort: sortDateFactory('startTime'),
        },
    },
];

export const Queue = () => {
    const getQueueQuery = useQueryData(getQueueSource, {});
    const openInstancePage = useGetOpenInstancePage();

    return (
        <Page header={i18n('title')}>
            <DataLoader
                errorAction={getQueueQuery.refetch}
                error={getQueueQuery.error}
                status={getQueueQuery.status}
            >
                {getQueueQuery.data?.length ? (
                    <QueueTable
                        columns={columns}
                        data={getQueueQuery.data || []}
                        onRowClick={openInstancePage}
                    />
                ) : (
                    <PlaceholderContainer
                        title={i18n('empty-list')}
                        image={<QueueIllustration />}
                    />
                )}
            </DataLoader>
        </Page>
    );
};
