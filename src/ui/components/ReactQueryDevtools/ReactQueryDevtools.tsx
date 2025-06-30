import React from 'react';

import {ReactQueryDevtools as Devtools} from '@tanstack/react-query-devtools';

import * as styles from './ReactQueryDevtools.module.css';

export const ReactQueryDevtools = () => {
    return (
        <div className={styles.reactQueryDevtools}>
            <Devtools initialIsOpen={false} buttonPosition="bottom-right" />
        </div>
    );
};
