import React from 'react';

import {Flex, Text, sp} from '@gravity-ui/uikit';

import {i18n} from './i18n';

interface InstanceCountProps {
    count: number;
    className?: string;
}

export const InstanceCount = ({count, className}: InstanceCountProps) => {
    return (
        <Text variant="subheader-3" className={className}>
            <Flex alignItems="end" grow={1}>
                <Text
                    variant="body-3"
                    style={{color: 'var(--g-color-text-secondary)'}}
                    className={sp({mr: 1})}
                >
                    {i18n('instance', {
                        count,
                    })}
                    :
                </Text>
                {count}
            </Flex>
        </Text>
    );
};
