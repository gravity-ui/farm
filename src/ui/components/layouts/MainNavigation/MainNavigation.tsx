import React from 'react';

import * as styles from './MainNavigation.module.css';

interface MainNavigationProps {
    pageMenu: React.ReactNode;
}

export const MainNavigation: React.FC<MainNavigationProps> = ({pageMenu}) => {
    return (
        <div className={styles.mainNavigation}>
            <div className={styles.sticky}>{pageMenu}</div>
        </div>
    );
};
