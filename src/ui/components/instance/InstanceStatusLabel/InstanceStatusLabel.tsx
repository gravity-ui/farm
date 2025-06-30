import React from 'react';

import type {LabelProps} from '@gravity-ui/uikit';
import {Flex, HelpMark, Label} from '@gravity-ui/uikit';

import type {
    InstanceCommonStatus,
    InstanceProviderStatus,
    InstanceWithProviderStatus,
} from '../../../../shared/common';

import {i18n} from './i18n';

interface StatusLabelItem {
    theme: LabelProps['theme'];
    text: string;
    normalStatus: string;
    hint?: string;
}

const mapCommonStatus: Record<InstanceCommonStatus, StatusLabelItem | undefined> = {
    queued: {
        theme: 'warning',
        text: i18n('queued'),
        normalStatus: 'queued',
    },
    generating: {
        theme: 'info',
        text: i18n('generating'),
        normalStatus: 'generating',
    },
    generated: {
        theme: 'info',
        text: i18n('generated'),
        normalStatus: 'generated',
    },
    deleting: {
        theme: 'danger',
        text: i18n('deleting'),
        normalStatus: 'deleting',
    },
    errored: {
        theme: 'danger',
        text: i18n('errored'),
        normalStatus: 'errored',
    },
};

const mapProviderStatus: Record<InstanceProviderStatus, StatusLabelItem | undefined> = {
    starting: {
        theme: 'info',
        text: i18n('starting'),
        normalStatus: 'starting',
    },
    running: {
        theme: 'success',
        text: i18n('running'),
        normalStatus: 'running',
    },
    stopped: {
        theme: 'normal',
        text: i18n('stopped'),
        normalStatus: 'stopped',
    },
    errored: {
        theme: 'danger',
        text: i18n('errored-provider'),
        normalStatus: 'errored',
    },
    unknown: {
        theme: 'unknown',
        text: i18n('unknown'),
        normalStatus: 'unknown',
        hint: i18n('unknown-hint'),
    },
    unhealthy: {
        theme: 'warning',
        text: i18n('unhealthy'),
        normalStatus: 'unhealthy',
        hint: i18n('unhealthy-hint'),
    },
};

const fallbackStatus: StatusLabelItem = {
    theme: 'unknown',
    text: i18n('unknown'),
    normalStatus: 'unknown',
};

export const getInstanceStatus = (
    instance: Pick<InstanceWithProviderStatus, 'status' | 'providerStatus'>,
) => {
    const {status, providerStatus} = instance;

    if (status === 'generated') {
        return mapProviderStatus[providerStatus] ?? fallbackStatus;
    }

    return mapCommonStatus[status] ?? fallbackStatus;
};

export default function StatusLabel({instance}: {instance: InstanceWithProviderStatus}) {
    const {theme, text, hint} = getInstanceStatus(instance);

    return (
        <Label theme={theme}>
            <Flex gap={1}>
                {text}
                {hint && <HelpMark onClick={(e) => e.stopPropagation()}>{hint}</HelpMark>}
            </Flex>
        </Label>
    );
}
