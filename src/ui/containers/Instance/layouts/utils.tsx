import React, {useEffect, useState} from 'react';

import {useDataManager} from '@gravity-ui/data-source';
import {House} from '@gravity-ui/icons';
import {matchPath} from 'react-router-dom';

import type {InstanceWithProviderStatus} from '../../../../shared/common';
import {uiRoutes} from '../../../../shared/uiRoutes';
import {i18nInstanceActions} from '../../../i18n-common/i18nInstanceActions';
import {toaster} from '../../../services/toaster';
import {InstanceIconsMap} from '../../../utils/iconsMap';
import {useInstanceActions} from '../actions';

import {i18n} from './i18n';

const toastName = 'stop-instance-alert';

export const useInstanceStopWarning = (instance?: InstanceWithProviderStatus) => {
    const {startInstance} = useInstanceActions();
    const dataManager = useDataManager();
    const [isToastVisible, setIsToastVisible] = useState(false);

    useEffect(() => {
        if (instance?.providerStatus === 'stopped' && !isToastVisible && !toaster.has(toastName)) {
            setIsToastVisible(true); // so that the toast is not recreated with every render

            toaster.add({
                name: toastName,
                title: i18nInstanceActions('stop-warning-title'),
                theme: 'warning',
                autoHiding: false,
                actions: [
                    {
                        label: i18nInstanceActions('start'),
                        onClick: () => {
                            startInstance(instance).then(() => {
                                setTimeout(() => {
                                    setIsToastVisible(false);
                                }, 1000);
                            });
                        },
                    },
                ],
            });
        }

        if (instance?.providerStatus !== 'stopped') {
            setIsToastVisible(false);
            toaster.remove(toastName);
        }
    }, [instance, dataManager, isToastVisible, startInstance]);

    useEffect(() => {
        return () => {
            const isPathMatches = Boolean(
                matchPath(
                    {
                        path: uiRoutes.instance,
                        // if this option is enabled, the url may not completely match
                        end: false,
                    },
                    location.pathname,
                ),
            );

            if (!isPathMatches) {
                toaster.remove(toastName);
            }
        };
    }, []);
};

export const InstanceRoutes = [
    {
        icon: <House />,
        title: i18n('overview'),
        path: uiRoutes.instance,
    },
    {
        icon: <InstanceIconsMap.ViewBuildLogs />,
        title: i18n('build-logs'),
        path: uiRoutes.instanceBuildLogs,
    },
    {
        icon: <InstanceIconsMap.ViewInstanceLogs />,
        title: i18n('instance-logs'),
        path: uiRoutes.instanceRunLogs,
    },
];
