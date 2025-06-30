// eslint-disable-next-line no-restricted-imports
import {I18N} from '@gravity-ui/i18n';
import {Lang} from '@gravity-ui/uikit';

type KeysData = Parameters<InstanceType<typeof I18N>['registerKeyset']>[2];

export type KeysetDictionary = Record<'en' | 'ru', KeysData>;

type I18nFn<T extends KeysetDictionary> = (
    key: keyof T[keyof T],
    options?: object | Record<string, unknown>,
) => string;

export const i18nStrict = <TKeysetDictionary extends KeysetDictionary = KeysetDictionary>(
    keyset: TKeysetDictionary,
) => {
    const i18n = new I18N();
    const keysetName = Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);

    i18n.registerKeyset('en', keysetName, keyset.en);
    i18n.registerKeyset('ru', keysetName, keyset.ru);

    const i18nFn = i18n.keyset(keysetName) as I18nFn<TKeysetDictionary>;

    return ((...args) => {
        try {
            i18n.setLang(window.FM.lang);
        } catch (error) {
            console.error(
                `Error while trying to set I18N language. Wrong language value is "${window.FM.lang}".`,
                error,
            );
            i18n.setLang(Lang.En);
        }

        return i18nFn(...args);
    }) as I18nFn<TKeysetDictionary>;
};
