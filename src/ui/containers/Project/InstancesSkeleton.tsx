import React from 'react';

import type {TableColumnConfig} from '@gravity-ui/uikit';
import {Skeleton, Table} from '@gravity-ui/uikit';
import _ from 'lodash';

import {i18nInstance} from '../../i18n-common/i18nInstance';

import * as styles from './Project.module.css';

const renderSkeleton = () => <Skeleton className={styles.skeleton} />;

const columns: TableColumnConfig<{}>[] = [
    {
        id: 'status',
        name: i18nInstance('status'),
        template: renderSkeleton,
    },
    {
        id: 'createdAt',
        name: i18nInstance('last-changes'),
        template: renderSkeleton,
    },
    {
        id: 'envVariables',
        name: i18nInstance('env-variables'),
        width: 300,
        template: renderSkeleton,
    },
    {
        id: 'runEnvVariables',
        name: i18nInstance('run-env-variables'),
        width: 300,
        template: renderSkeleton,
    },
    {
        id: 'labels',
        name: i18nInstance('labels'),
        width: 300,
        template: renderSkeleton,
    },
];

const data = _.range(0, 5);

export default function InstancesSkeleton() {
    const [visible, setVisible] = React.useState(false);
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            setVisible(true);
        }, 500);

        return () => clearTimeout(timeout);
    });

    if (!visible) {
        return null;
    }

    return (
        <div>
            <h2>
                <Skeleton className={styles.skeleton} />
            </h2>
            <Table columns={columns} data={data} />
        </div>
    );
}
