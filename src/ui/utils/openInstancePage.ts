import {useCallback} from 'react';

import type {InstanceWithProviderStatus} from '../../shared/common';
import {useInstanceActions} from '../containers/Instance/actions';
import {i18nInstanceActions} from '../i18n-common/i18nInstanceActions';
import {toaster} from '../services/toaster';

import {generateApiLink, generateInstanceHref} from './common';

export const useGetOpenInstancePage = () => {
    const {startInstance} = useInstanceActions();

    return useCallback(
        (instance: InstanceWithProviderStatus) => {
            if (instance.status === 'generating') {
                const href = generateApiLink('api/logs', instance.hash);
                window.open(href, '_blank');
                return;
            }

            if (!instance.hash) {
                return;
            }

            if (instance.providerStatus === 'stopped') {
                toaster.add({
                    name: 'openInstance',
                    title: i18nInstanceActions('stop-warning-title'),
                    content: i18nInstanceActions('stop-warning-description'),
                    theme: 'warning',
                    actions: [
                        {
                            label: i18nInstanceActions('start'),
                            onClick: () => startInstance(instance),
                        },
                    ],
                });
                return;
            }

            const href = generateInstanceHref({
                project: instance.project,
                hash: instance.hash,
                urlTemplate: instance.urlTemplate,
            });

            window.open(href, '_blank');
        },
        [startInstance],
    );
};
