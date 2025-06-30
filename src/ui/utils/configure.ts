import {configure as configureMarkdownEditor} from '@gravity-ui/markdown-editor';
import type {Lang} from '@gravity-ui/uikit';
import {configure as configureUikit} from '@gravity-ui/uikit';

export function configure(lang: Lang) {
    configureUikit({
        lang,
    });

    configureMarkdownEditor({
        lang,
    });
}
