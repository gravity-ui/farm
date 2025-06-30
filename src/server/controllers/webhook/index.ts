import type {Request, Response} from '@gravity-ui/expresskit';

import {coreRegistry} from '../../components/core-plugin-registry';
import type {Vcs} from '../../utils/vcs/vcs';

import {handleUnifiedPullRequest} from './unified-pull-request';

export default async (req: Request, res: Response) => {
    // Get all VCS implementations
    const vcsPlugins = coreRegistry.vcs.getPlugins();
    let vcsImpl: Vcs | null = null;
    let vcsType = '';

    // Find the appropriate VCS implementation based on request headers
    for (const [key, plugin] of Object.entries(vcsPlugins)) {
        if (!plugin) continue;

        const impl = plugin.constructor({});
        if (impl.isRequestFromThisVcs(req)) {
            vcsImpl = impl;
            vcsType = key;
            break;
        }
    }

    if (!vcsImpl) {
        res.status(400).send({error: 'Unknown VCS type'});
        return;
    }
    // Check if the event is a pull request
    const eventName = vcsImpl.getEventName(req);
    if (eventName !== 'pull_request') {
        res.status(400).send({error: 'Only pull request events are supported'});
        return;
    }

    // Parse the request data using the VCS implementation to get common format
    const parsedData = vcsImpl.parsePullRequestData(req.body);

    try {
        await handleUnifiedPullRequest(parsedData, vcsType, req.ctx);
        res.status(200).send();
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).send({error: error.message});
        } else {
            res.status(500).send({error: 'Unknown error'});
        }
    }
};
