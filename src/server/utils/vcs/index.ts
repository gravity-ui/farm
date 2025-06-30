import {coreRegistry} from '../../components/core-plugin-registry';

import type {Vcs} from './vcs';

export function getVcs(name: string): Vcs {
    const vcsProviders = coreRegistry.vcs.getPlugins();

    let vcsInstance = coreRegistry.vcs.getInstance(name);

    if (!vcsInstance) {
        // pass configuration in future
        vcsInstance = vcsProviders[name]?.constructor({});

        if (!vcsInstance) {
            throw new Error(`VCS provider '${name}' not found`);
        }

        coreRegistry.vcs.setInstance(name, vcsInstance);
    }

    return vcsInstance;
}
