import React from 'react';

import {Loader} from '@gravity-ui/uikit';
import type {LoaderProps} from '@gravity-ui/uikit';
import classNames from 'classnames';

import * as styles from './LoaderContainer.module.css';

export interface LoaderContainerProps extends Omit<LoaderProps, 'className'> {
    className?: string;
    innerClassName?: string;
}

export const LoaderContainer: React.FC<LoaderContainerProps> = ({
    className,
    innerClassName,
    size = 'l',
    ...restProps
}) => {
    return (
        <div className={classNames(styles.loaderContainer, className)}>
            <Loader {...restProps} size={size} className={innerClassName} />
        </div>
    );
};
