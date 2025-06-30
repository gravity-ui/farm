import React from 'react';

import {dateTimeParse} from '@gravity-ui/date-utils';
import {DefinitionList, Flex, Label, Link} from '@gravity-ui/uikit';
import {isEmpty} from 'lodash';

import type {InstanceWithProviderStatus} from '../../../../../../shared/common';
import {YfmPreview} from '../../../../../components/YfmPreview/YfmPreview';
import {i18nInstance} from '../../../../../i18n-common/i18nInstance';
import {generateInstanceHref} from '../../../../../utils/common';

import * as styles from '../Overview.module.css';

interface BaseViewProps {
    instance: InstanceWithProviderStatus;
}

interface LabelsViewProps {
    labels: Record<string, string>;
}

const LabelsView: React.FC<LabelsViewProps> = ({labels}) => {
    return (
        <Flex wrap="wrap" gap={2}>
            {Object.entries(labels).map(([key, value]) => (
                <div key={key} className={styles.label}>
                    <Label value={value} type="copy" copyText={`${key}=${value}`}>
                        {key}
                    </Label>
                </div>
            ))}
        </Flex>
    );
};

const copyObjectText = (object: Record<string, string>) => {
    if (isEmpty(object)) {
        return undefined;
    }

    return Object.entries(object)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
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
            <DefinitionList.Item name={i18nInstance('last-changes')}>
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
                    copyText={copyObjectText(instance.envVariables)}
                >
                    <LabelsView labels={instance.envVariables} />
                </DefinitionList.Item>
            )}
            {!isEmpty(instance.runEnvVariables) && (
                <DefinitionList.Item
                    name={i18nInstance('run-env-variables')}
                    copyText={copyObjectText(instance.runEnvVariables)}
                >
                    <LabelsView labels={instance.runEnvVariables} />
                </DefinitionList.Item>
            )}
        </DefinitionList>
    );
};
