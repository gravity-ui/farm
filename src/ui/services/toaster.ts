import {Toaster} from '@gravity-ui/uikit';
import type {AxiosError} from 'axios';

import {ci18n} from '../i18n-common/ci18n';
import {getErrorMessageFromAxios} from '../utils/common';

export const toaster = new Toaster();

export function handleRequestErrorWithToast(error: AxiosError<{message: string}>) {
    toaster.add({
        name: 'preview-error-error',
        title: ci18n('error-title'),
        content: getErrorMessageFromAxios(error),
        theme: 'danger',
    });
}
