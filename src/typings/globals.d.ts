import type {Request as ExpressRequest} from '@gravity-ui/expresskit';

import type {HelpListItem, User} from '../shared/common';

declare module '@gravity-ui/expresskit' {
    export interface Request extends ExpressRequest {
        nonce: string;
    }
}

declare global {
    interface FarmGlobalAppData {
        user: User;
        theme: 'light' | 'dark';
        lang: 'ru' | 'en';
        defaultProject: string;
        vcs: string;
        defaultBranch: string;
        env: string;
        farmConfig: string;
        version: string;
        noAuth: boolean;
        navigationHelpMenuConfiguration: HelpListItem[];
    }
    interface Window {
        FM: FarmGlobalAppData;
    }
}
