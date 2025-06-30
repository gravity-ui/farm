import React from 'react';

import {idle, useQueryData} from '@gravity-ui/data-source';
import {Flex, Text, sp} from '@gravity-ui/uikit';
import {useParams} from 'react-router-dom';

import type {ListLogsResponse} from '../../../../../shared/api/listLogs';
import type {Instance, Output} from '../../../../../shared/common';
import {EmptyPage} from '../../../../components/EmptyPage/EmptyPage';
import {DataLoader} from '../../../../components/data-source';
import {Page} from '../../../../components/layouts/Page/Page';
import {getInstanceSource, listLogsSource} from '../../../../data-sources';
import {i18nInstance} from '../../../../i18n-common/i18nInstance';
import {generateInstanceHref} from '../../../../utils/common';
import {InstanceLayout} from '../../layouts/InstanceLayout';

import {i18n} from './i18n';

import * as styles from './BuildLogs.module.scss';

interface LogsTitleProps {
    listLogs: ListLogsResponse | undefined;
}

const renderTitle = ({listLogs}: LogsTitleProps) => {
    if (!listLogs?.message) {
        return i18n('title');
    }

    return (
        <Flex alignItems="center">
            <span className={sp({mr: 1})}>{i18n('title')}</span>
            {Boolean(listLogs.message) && <p>{listLogs.message}</p>}
        </Flex>
    );
};

interface LogsContentProps {
    instance: Instance;
    listLogs: ListLogsResponse | undefined;
}

const LogsContent = ({instance, listLogs}: LogsContentProps) => {
    const renderLog = (item: Output, index: number) => {
        const {command, duration, stdout, stderr} = item;

        return (
            <React.Fragment key={`log-${index}`}>
                {Boolean(command && !duration) && (
                    <div className={styles.command}>
                        <b>{command}</b>
                    </div>
                )}
                {Boolean(stdout) && (
                    <Text
                        as="pre"
                        whiteSpace="break-spaces"
                        variant="code-1"
                        className={styles.output}
                    >
                        {stdout}
                    </Text>
                )}
                {Boolean(stderr) && (
                    <Text
                        as="pre"
                        whiteSpace="break-spaces"
                        variant="code-1"
                        className={styles.output}
                    >
                        {stderr}
                    </Text>
                )}
                {Boolean(duration) && (
                    <div>
                        <br />
                        {i18n('command-finished', {
                            duration: (duration as number) / 1000,
                        })}
                        <hr />
                    </div>
                )}
            </React.Fragment>
        );
    };

    const renderInstanceLink = () => {
        if (!listLogs) {
            return null;
        }

        const {finished, status} = listLogs;
        if (!finished || !status || status === 'errored') {
            return null;
        }

        if (!instance?.project) {
            return null;
        }

        const href = generateInstanceHref({
            hash: instance.hash,
            project: instance.project,
            urlTemplate: instance.urlTemplate,
        });

        return (
            <a className={styles.instanceLink} href={href}>
                {i18nInstance('go-to-instance')}
            </a>
        );
    };

    return (
        <div>
            {listLogs?.logs?.map(renderLog)}
            {renderInstanceLink()}
        </div>
    );
};

export const InstanceBuildLogsPage = () => {
    const {hash} = useParams();

    const instanceQuery = useQueryData(getInstanceSource, hash ? {hash} : idle);
    const listLogsQuery = useQueryData(
        listLogsSource,
        hash && Boolean(instanceQuery.data?.instance) ? {hash} : idle,
    );

    return (
        <InstanceLayout>
            <Page
                header={renderTitle({
                    listLogs: listLogsQuery.data,
                })}
                className={styles.buildLogs}
            >
                <DataLoader
                    status={instanceQuery.status}
                    error={instanceQuery.error}
                    errorAction={instanceQuery.refetch}
                >
                    {instanceQuery.data?.instance ? (
                        <LogsContent
                            instance={instanceQuery.data?.instance}
                            listLogs={listLogsQuery.data}
                        />
                    ) : (
                        <EmptyPage message={i18nInstance('not-found')} />
                    )}
                </DataLoader>
            </Page>
        </InstanceLayout>
    );
};
