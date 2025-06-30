import {i18nStrict} from '../../../../../../utils/i18nStrict';

import en from './en.json';
import ru from './ru.json';

export const i18n = i18nStrict({en, ru});

export type I18nKey = Parameters<typeof i18n>[0];
