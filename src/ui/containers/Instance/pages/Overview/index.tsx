import React from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {Flex} from '@gravity-ui/uikit';
import {useParams} from 'react-router-dom';

import {Page} from '../../../../components/layouts/Page/Page';
import {getInstanceSource} from '../../../../data-sources';
import {i18nInstance} from '../../../../i18n-common/i18nInstance';
import {InstanceLayout} from '../../layouts/InstanceLayout';

import {BaseView} from './components/BaseView';

import * as styles from './Overview.module.css';

export const InstanceOverviewPage = () => {
    const {hash} = useParams();
    const {data} = useQueryData(getInstanceSource, {hash: hash!});
    const instance = data?.instance;

    return (
        <InstanceLayout>
            <Page header={i18nInstance('title')} className={styles.instanceOverview}>
                {instance && (
                    <Flex direction="column" gap={4}>
                        <BaseView instance={instance} />
                    </Flex>
                )}
            </Page>
        </InstanceLayout>
    );
};
