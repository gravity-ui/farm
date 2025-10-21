import React from 'react';

import {idle, useQueryData} from '@gravity-ui/data-source';
import {ArrowUp} from '@gravity-ui/icons';
import {Button, Flex, Icon, Text, Tooltip, sp} from '@gravity-ui/uikit';
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

import {BUILD_LOGS_PAGE_ID} from './constants';
import {useAutoscrollingBehavior} from './hooks';
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
    const logsContainerRef = React.useRef<HTMLDivElement>(null);
    const LogsBottomRef = React.useRef<HTMLAnchorElement | HTMLDivElement>(null);

    const {isScrollTopButtonVisible} = useAutoscrollingBehavior(listLogs, LogsBottomRef);

    const renderLog = (item: Output, index: number) => {
        const {command, duration, stdout, stderr} = item;
        const isLastLog = index === (listLogs?.logs?.length || 0) - 1;

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
                {isLastLog && <div ref={LogsBottomRef as React.RefObject<HTMLDivElement>} />}
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
            <a
                ref={LogsBottomRef as React.RefObject<HTMLAnchorElement>}
                className={styles.instanceLink}
                href={href}
            >
                {i18nInstance('go-to-instance')}
            </a>
        );
    };

    const renderScrollToTopButton = () => {
        const handleScrollToTop = () => {
            logsContainerRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            });
        };

        if (!isScrollTopButtonVisible) {
            return null;
        }

        return (
            <Tooltip content={i18n('return-to-start-of-logs')} placement="left" openDelay={0}>
                <Button
                    view="raised"
                    pin="circle-circle"
                    size="xl"
                    className={styles.scrollToUpButton}
                    onClick={handleScrollToTop}
                >
                    <Icon data={ArrowUp} size={24} />
                </Button>
            </Tooltip>
        );
    };

    return (
        <div ref={logsContainerRef} id="logs">
            {listLogs?.logs?.map(renderLog)}
            {renderInstanceLink()}
            {renderScrollToTopButton()}
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
                id={BUILD_LOGS_PAGE_ID}
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
