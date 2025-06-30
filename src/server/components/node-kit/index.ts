import path from 'path';

import {NodeKit} from '@gravity-ui/nodekit';

let nkInstance: NodeKit | null = null;

export function getNodeKit() {
    if (!nkInstance) {
        nkInstance = new NodeKit({configsPath: path.resolve(__dirname, '../../configs')});
    }
    return nkInstance;
}

export function isNodeKitInitialized() {
    return nkInstance !== null;
}

export type Logger = ReturnType<typeof getNodeKit>['ctx']['log'];
export type ErrLogger = ReturnType<typeof getNodeKit>['ctx']['logError'];
