import React, {useMemo} from 'react';

import {useQueryData} from '@gravity-ui/data-source';
import {Flex, Skeleton} from '@gravity-ui/uikit';
import {HttpStatusCode} from 'axios';
import {useParams} from 'react-router-dom';

import {ErrorContainer, LoaderContainer} from '../../../components/data-source';
import InstanceStatusLabel from '../../../components/instance/InstanceStatusLabel/InstanceStatusLabel';
import {MainNavigation} from '../../../components/layouts/MainNavigation/MainNavigation';
import {PageMenu} from '../../../components/layouts/PageMenu/PageMenu';
import {getInstanceSource} from '../../../data-sources';

import {InstanceActionBar, InstanceSimpleActionBar} from './InstanceActionBar';
import {i18n} from './i18n';
import {InstanceRoutes, useInstanceStopWarning} from './utils';

import * as styles from './InstanceLayout.module.css';

interface InstanceLayoutProps {
    children: React.ReactNode;
}

export const InstanceLayout = ({children}: InstanceLayoutProps) => {
    const {hash} = useParams();
    const {data, ...instanceQuery} = useQueryData(getInstanceSource, {hash: hash!});
    useInstanceStopWarning(data?.instance);

    const renderContent = useMemo(() => {
        if (instanceQuery.isLoading) {
            return <LoaderContainer />;
        }

        if (instanceQuery.isError) {
            let text = '';
            switch (instanceQuery.error?.status) {
                case HttpStatusCode.NotFound:
                    text = i18n('not-found');
                    break;
                case HttpStatusCode.InternalServerError:
                default:
                    text = i18n('error');
                    break;
            }

            return (
                <Flex
                    direction="column"
                    height="100%"
                    width="100%"
                    alignContent="center"
                    alignItems="center"
                >
                    <ErrorContainer
                        action={{handler: instanceQuery.refetch}}
                        title={text}
                        error={null}
                    />
                </Flex>
            );
        }

        return children;
    }, [
        instanceQuery.isLoading,
        instanceQuery.isError,
        instanceQuery.error?.status,
        instanceQuery.refetch,
        children,
    ]);

    return (
        <Flex direction="column" height="100vh">
            {instanceQuery.status === 'loading' ? (
                <Skeleton className={styles.actionBarSkeleton} />
            ) : data?.instance ? (
                <InstanceActionBar instance={data.instance} />
            ) : (
                <InstanceSimpleActionBar hash={hash!} />
            )}
            <Flex height="calc(100vh - 40px)" className={styles.content}>
                <MainNavigation
                    pageMenu={
                        <PageMenu
                            items={InstanceRoutes}
                            card={{
                                icon: data?.instance?.status && (
                                    <InstanceStatusLabel instance={data.instance} />
                                ),
                                iconLoading: instanceQuery.isLoading,
                            }}
                            title={
                                <Flex gap={1}>
                                    <span>{i18n('title')}</span>
                                </Flex>
                            }
                        />
                    }
                />
                {renderContent}
            </Flex>
        </Flex>
    );
};
