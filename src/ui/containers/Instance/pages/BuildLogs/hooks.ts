import React from 'react';

import type {ListLogsResponse} from '../../../../../shared/api/listLogs';

import {BUILD_LOGS_PAGE_ID, SCROLL_BOTTOM_TOLERANCE, SCROLL_TO_TOP_THRESHOLD} from './constants';

export const useAutoscrollingBehavior = (
    listLogs: ListLogsResponse | undefined,
    logsBottomRef: React.RefObject<HTMLAnchorElement | HTMLDivElement>,
) => {
    const [isScrollTopButtonVisible, setIsScrollTopButtonVisible] = React.useState(false);
    const [shouldAutoscroll, setShouldAutoscroll] = React.useState(true);

    // Auto-scroll to the end of logs when new ones appear
    React.useEffect(() => {
        if (logsBottomRef.current && shouldAutoscroll) {
            logsBottomRef.current.scrollIntoView({behavior: 'auto', block: 'center'});
        }
    }, [listLogs?.logs, shouldAutoscroll, logsBottomRef]);

    React.useEffect(() => {
        const page = document.getElementById(BUILD_LOGS_PAGE_ID);
        if (!page) return;

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = page;
            const logsPageHeight = scrollHeight - clientHeight;
            // check if user is at the bottom of the page with SCROLL_BOTTOM_TOLERANCE tolerance
            const isAtBottom = logsPageHeight - scrollTop < SCROLL_BOTTOM_TOLERANCE;

            // show scroll to top button if user is not at the very beginning of the page
            setIsScrollTopButtonVisible(scrollTop > SCROLL_TO_TOP_THRESHOLD);
            setShouldAutoscroll(isAtBottom);
        };

        page.addEventListener('scroll', handleScroll);

        return () => page.removeEventListener('scroll', handleScroll);
    }, []);

    return {
        isScrollTopButtonVisible,
    };
};
