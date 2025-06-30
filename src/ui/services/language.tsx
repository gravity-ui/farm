import React, {createContext, useContext, useEffect, useState} from 'react';

import type {EventBrokerData} from '@gravity-ui/uikit';
import {EventBroker, Lang} from '@gravity-ui/uikit';

import {configure} from '../utils/configure';
import {setCookie} from '../utils/cookie';

const languageEventEmitter = new EventBroker();

const DEFAULT_LANGUAGE: Lang = (window.FM.lang as Lang) || Lang.En;
configure(DEFAULT_LANGUAGE);

export function setAppLang(lang: Lang) {
    languageEventEmitter.publish({
        componentId: 'lang',
        eventId: '',
        meta: lang,
    });
}

languageEventEmitter.subscribe((event: EventBrokerData) => {
    const newLang = event.meta as Lang;

    setCookie({
        name: 'farm_lang',
        value: newLang,
        domain: location.hostname,
    });

    window.location.reload();
});

const LanguageContext = createContext<Lang>(DEFAULT_LANGUAGE);

interface LanguageProviderProps {
    children: React.ReactNode;
}

export function LanguageProvider({children}: LanguageProviderProps) {
    const [lang, setLang] = useState<Lang>(DEFAULT_LANGUAGE);

    useEffect(() => {
        const listener = (event: EventBrokerData) => {
            setLang(event.meta as Lang);
        };

        languageEventEmitter.subscribe(listener);
        return () => {
            languageEventEmitter.unsubscribe(listener);
        };
    }, []);

    return <LanguageContext.Provider value={lang}>{children}</LanguageContext.Provider>;
}

export function useLang() {
    const context = useContext(LanguageContext);

    if (!context) {
        throw new Error('useLang must be used within a LanguageProvider');
    }

    return context;
}
