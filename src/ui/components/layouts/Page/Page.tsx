import React from 'react';

import {Flex, Text} from '@gravity-ui/uikit';
import classNames from 'classnames';

import * as styles from './Page.module.css';

interface PageProps {
    children: React.ReactNode;
    header?: string | React.ReactNode;
    className?: string;
}

export const Page = ({children, header, className}: PageProps) => {
    return (
        <Flex direction="column" gap={4} className={classNames(styles.page, className)}>
            {header && <Text variant="header-1">{header}</Text>}
            {children}
        </Flex>
    );
};
