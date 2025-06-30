import React, {useMemo} from 'react';

import {ArrowUpRightFromSquare, Copy} from '@gravity-ui/icons';
import {ActionTooltip, Button, Flex, HelpMark, Icon, Text} from '@gravity-ui/uikit';

import type {QueuedInstance} from '../../../../../shared/common';
import {YfmPreview} from '../../../../components/YfmPreview/YfmPreview';
import {i18nInstanceActions} from '../../../../i18n-common/i18nInstanceActions';
import {TABLE_ACTION_SIZE} from '../../../../utils/constants';
import {useGetOpenInstancePage} from '../../../../utils/openInstancePage';

import * as styles from './InstanceBranch.module.css';

export interface InstanceBranchProps {
    url: string;
    instance: QueuedInstance;
}

export function InstanceBranch({url, instance}: InstanceBranchProps) {
    const {branch, instanceConfigName, description} = instance;

    const name = useMemo(() => {
        let value = branch.replace('users/', '');
        if (instanceConfigName) {
            value += ` [${instanceConfigName}]`;
        }
        return value;
    }, [branch, instanceConfigName]);

    const [copy, setCopy] = React.useState<boolean>(false);
    const onCopy = React.useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            navigator.clipboard.writeText(url);
            setCopy(true);
            setTimeout(() => {
                setCopy(false);
            }, 1000);
        },
        [url],
    );

    const openInstancePage = useGetOpenInstancePage();
    const onOpen = React.useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            openInstancePage(instance);
        },
        [instance, openInstancePage],
    );

    return (
        <Flex gap={1} alignItems="center">
            <ActionTooltip title={i18nInstanceActions('open-instance')}>
                <Button
                    onClick={onOpen}
                    size="s"
                    view="flat"
                    style={{color: 'var(--g-color-text-secondary)'}}
                >
                    <Icon data={ArrowUpRightFromSquare} size={TABLE_ACTION_SIZE} />
                </Button>
            </ActionTooltip>
            <ActionTooltip
                title={
                    copy ? i18nInstanceActions('copied') : i18nInstanceActions('copy-instance-link')
                }
            >
                <Button
                    onClick={onCopy}
                    size="s"
                    view="flat"
                    style={{color: 'var(--g-color-text-secondary)'}}
                >
                    <Icon data={Copy} size={TABLE_ACTION_SIZE} />
                </Button>
            </ActionTooltip>
            <Text>{name}</Text>
            {description && (
                <HelpMark onClick={(e) => e.stopPropagation()}>
                    <div onClick={(e) => e.stopPropagation()} className={styles.popoverContent}>
                        <YfmPreview value={description} />
                    </div>
                </HelpMark>
            )}
        </Flex>
    );
}
