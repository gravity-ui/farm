import {ClientDataManager} from '@gravity-ui/data-source';

export const dataManager = new ClientDataManager({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});
