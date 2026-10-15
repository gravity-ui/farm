import React from 'react';

import {dateTimeParse} from '@gravity-ui/date-utils';
import {DefinitionList, Flex, Label, Link} from '@gravity-ui/uikit';
import {isEmpty} from 'lodash';

import type {InstanceWithProviderStatus} from '../../../../../../shared/common';
import {
    MASKED_SECRET_VALUE,
    SECRET_ENV_PREFIX,
    isSecretEnvKey,
} from '../../../../../../shared/secret-env';
import {SecretEnvIcon} from '../../../../../components/SecretEnvIcon/SecretEnvIcon';
import {YfmPreview} from '../../../../../components/YfmPreview/YfmPreview';
import {i18nInstance} from '../../../../../i18n-common/i18nInstance';
import {generateInstanceHref} from '../../../../../utils/common';

import * as styles from '../Overview.module.css';

interface BaseViewProps {
    instance: InstanceWithProviderStatus;
}

interface LabelsViewProps {
    labels: Record<string, string>;
    secretEnabled?: boolean;
}

const LabelsView: React.FC<LabelsViewProps> = ({labels, secretEnabled = false}) => {
    return (
        <Flex wrap="wrap" gap={2}>
            {Object.entries(labels).map(([key, value]) => (
                <div key={key} className={styles.label}>
                    <Label
                        value={secretEnabled && isSecretEnvKey(key) ? MASKED_SECRET_VALUE : value}
                        type={secretEnabled && isSecretEnvKey(key) ? 'default' : 'copy'}
                        copyText={
                            secretEnabled && isSecretEnvKey(key) ? undefined : `${key}=${value}`
                        }
                        icon={secretEnabled && isSecretEnvKey(key) ? <SecretEnvIcon /> : undefined}
                        theme={secretEnabled && isSecretEnvKey(key) ? 'utility' : 'normal'}
                    >
                        {secretEnabled && isSecretEnvKey(key)
                            ? key.slice(SECRET_ENV_PREFIX.length)
                            : key}
                    </Label>
                </div>
            ))}
        </Flex>
    );
};

const copyObjectText = (object: Record<string, string>, omitSecrets = false) => {
    if (isEmpty(object)) {
        return undefined;
    }

    return (
        Object.entries(object)
            .filter(([key]) => !omitSecrets || !isSecretEnvKey(key))
            .map(([key, value]) => `${key}=${value}`)
            .join('&') || undefined
    );
};

export const BaseView: React.FC<BaseViewProps> = ({instance}) => {
    const url = generateInstanceHref({
        project: instance.project,
        hash: instance.hash,
        urlTemplate: instance.urlTemplate,
    });

    return (
        <DefinitionList contentMaxWidth={600}>
            <DefinitionList.Item name={i18nInstance('hash')} copyText={instance.hash}>
                {instance.hash}
            </DefinitionList.Item>
            <DefinitionList.Item name={i18nInstance('project')} copyText={instance.project}>
                {instance.project}
            </DefinitionList.Item>
            <DefinitionList.Item name={i18nInstance('branch')} copyText={instance.branch}>
                {instance.branch}
            </DefinitionList.Item>
            <DefinitionList.Item name={i18nInstance('url')} copyText={url}>
                <Link href={url}>{url}</Link>
            </DefinitionList.Item>
            <DefinitionList.Item name={i18nInstance('created-at')}>
                {dateTimeParse(Number(instance.createdAt) || 'now')?.format('DD.MM.YYYY HH:mm')}
            </DefinitionList.Item>
            <DefinitionList.Item name={i18nInstance('updated-at')}>
                {dateTimeParse(Number(instance.startTime) || 'now')?.format('DD.MM.YYYY HH:mm')}
            </DefinitionList.Item>
            {instance.description && (
                <DefinitionList.Item
                    name={i18nInstance('description')}
                    copyText={instance.description}
                >
                    <YfmPreview value={instance.description} />
                </DefinitionList.Item>
            )}
            {!isEmpty(instance.labels) && (
                <DefinitionList.Item
                    name={i18nInstance('labels')}
                    copyText={copyObjectText(instance.labels)}
                >
                    <LabelsView labels={instance.labels} />
                </DefinitionList.Item>
            )}
            {!isEmpty(instance.envVariables) && (
                <DefinitionList.Item
                    name={i18nInstance('env-variables')}
                    copyText={copyObjectText(instance.envVariables, true)}
                >
                    <LabelsView labels={instance.envVariables} secretEnabled />
                </DefinitionList.Item>
            )}
            {!isEmpty(instance.runEnvVariables) && (
                <DefinitionList.Item
                    name={i18nInstance('run-env-variables')}
                    copyText={copyObjectText(instance.runEnvVariables, true)}
                >
                    <LabelsView labels={instance.runEnvVariables} secretEnabled />
                </DefinitionList.Item>
            )}
        </DefinitionList>
    );
};
