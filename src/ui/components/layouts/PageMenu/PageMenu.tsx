import React from 'react';

import {Flex, Skeleton, Text, sp} from '@gravity-ui/uikit';

import {PageMenuItemsList} from './PageMenuItemsList';
import type {MenuNext} from './types';

import * as styles from './PageMenu.module.scss';

interface PageMenuProps extends MenuNext {}

export const PageMenu = ({title, items, description, card}: PageMenuProps) => {
    return (
        <div>
            <div className={sp({p: 5})}>
                {title && (
                    <div>
                        <div className={styles.headerWrapper}>
                            <Text className={styles.headerTitle} variant="body-2">
                                {title}
                            </Text>
                        </div>
                        {description && <div className={sp({mt: 2})}>{description}</div>}
                    </div>
                )}
                {card && (
                    <Flex className={sp({mt: 1}, card.className)}>
                        {card.iconLoading ? (
                            <Skeleton className={styles.cardIconSkeleton} />
                        ) : (
                            card.icon
                        )}
                    </Flex>
                )}
            </div>
            <PageMenuItemsList items={items} />
        </div>
    );
};
