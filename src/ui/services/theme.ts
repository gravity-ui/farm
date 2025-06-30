import {useEffect, useState} from 'react';

import type {EventBrokerData, ThemeType} from '@gravity-ui/uikit';
import {EventBroker} from '@gravity-ui/uikit';

import {setCookie} from '../utils/cookie';

const themeEventEmitter = new EventBroker();

const DEFAULT_THEME: ThemeType = 'light';

export function setAppTheme(theme: ThemeType) {
    themeEventEmitter.publish({
        componentId: 'theme',
        eventId: '',
        meta: theme,
    });
}

themeEventEmitter.subscribe((event: EventBrokerData) => {
    // @ts-expect-error modify global state
    FM.theme = event.meta as ThemeType;

    setCookie({
        name: 'farm_theme',
        value: String(event.meta) || DEFAULT_THEME,
        domain: location.hostname,
    });
});

export function useAppTheme() {
    const [theme, setTheme] = useState<ThemeType>(window.FM.theme ?? DEFAULT_THEME);

    useEffect(() => {
        const listener = (event: EventBrokerData) => {
            setTheme((String(event.meta) as ThemeType) ?? DEFAULT_THEME);
        };

        themeEventEmitter.subscribe(listener);

        return () => {
            themeEventEmitter.unsubscribe(listener);
        };
    }, []);

    return {
        theme,
        setTheme,
    };
}
