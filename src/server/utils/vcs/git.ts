import nodeFs from 'node:fs';

import type {Request} from '@gravity-ui/expresskit';

import type {Output, VcsCredentialsConfig} from '../../../shared/common';
import {TEMP_PATH, WORKDIR_PATH} from '../../constants';
import {executeRun} from '../async';
import {buildPath, getAllProjectNames, getProjectFarmConfig} from '../common';
import {farmAxios} from '../envAxios';
import type {FarmProjectConfig} from '../farmJsonConfig';

import type {
    CommonPullRequestData,
    GetProjectConfigParams,
    Vcs,
    VcsCheckoutProps,
    VcsGetK8sCheckoutCommands,
} from './vcs';

const defaultHostname = 'github.com';
const defaultWebhookEventNameHeader = 'x-github-event';

export class GitVcs implements Vcs {
    async startup(): Promise<void> {
        return Promise.resolve();
    }

    async checkout({project, branch, instanceDir}: VcsCheckoutProps) {
        const {repositoryPath, vcsCredentials} = getProjectFarmConfig(project);
        const vcsConfig = vcsCredentials?.git ?? {};
        const projectRepoUrl = getPrivateAuthHostname(vcsConfig);

        const targetDir = `${WORKDIR_PATH}/${instanceDir}`;
        let command = `git clone --depth 1 -b ${branch} ${projectRepoUrl}/${repositoryPath}.git ${targetDir}`;

        if (branch.startsWith('pull/')) {
            command = `
                git clone --depth 1 ${projectRepoUrl}/${repositoryPath}.git ${targetDir} &&
                cd ${targetDir} &&
                git fetch origin ${branch}:${instanceDir} &&
                git checkout ${instanceDir}
            `;
        }

        const output: Output[] = [];

        await executeRun(command, undefined, (o) => {
            if (o.command) {
                o.command = filterToken(o.command, vcsConfig);
            }
            output.push(o);
        });

        return output;
    }

    getK8sCheckoutCommands({project, branch}: VcsGetK8sCheckoutCommands): string[] {
        const {repositoryPath, monoRepoPath, vcsCredentials} = getProjectFarmConfig(project);
        const vcsConfig = vcsCredentials?.git ?? {};
        const instancePath = buildPath(repositoryPath, monoRepoPath);
        const projectRepoUrl = getPrivateAuthHostname(vcsConfig);

        return [
            `mkdir /${TEMP_PATH}`,
            `cd /${TEMP_PATH}`,
            `git clone --depth 1 -b ${branch} ${projectRepoUrl}/${repositoryPath}.git ${repositoryPath}`,
            `cd '${instancePath}'`,
        ];
    }

    parsePullRequestData(rawData: unknown): CommonPullRequestData {
        const data = rawData as {
            action: string;
            pull_request: {
                title: string;
                body: string;
                head: {ref: string};
                base: {ref: string};
                number: number;
                user: {login: string};
                merged?: boolean;
            };
            repository: {full_name: string};
        };

        const project = data.repository.full_name.split('/')[1];
        const title = data.pull_request.title;
        const branch = `pull/${data.pull_request.number}`;
        const description = data.pull_request.body || '';
        const baseBranch = data.pull_request.base.ref;
        const merged = data.pull_request.merged;

        // Logic for extracting ticketIDs from unified-pull-request.ts
        const ticketIDs = title.match(/[A-Z]+-\d+/g) || [];

        // Converting GitHub-specific statuses to common ones
        let normalizedAction: 'opened' | 'closed';

        switch (data.action) {
            case 'opened':
                normalizedAction = 'opened';
                break;
            case 'closed':
                normalizedAction = 'closed';
                break;
            case 'reopened':
                normalizedAction = 'opened';
                break;
            case 'synchronize':
            case 'ready_for_review':
                // Consider PR update and ready for review as reopening
                normalizedAction = 'opened';
                break;
            default:
                // For unknown statuses, use 'opened' as a safe default value
                normalizedAction = 'opened';
                break;
        }

        return {
            action: normalizedAction,
            project,
            branch,
            title,
            description,
            webhookActionParameters: {
                ticketIDs,
                merged,
                baseBranch,
            },
        };
    }

    isRequestFromThisVcs(request: Request): boolean {
        return Boolean(this.getEventName(request));
    }

    getEventName(request: Request): string | string[] | undefined {
        const {headerValue} = this.findAnyWebhookEventNameHeader(request);
        return headerValue;
    }

    private findAnyWebhookEventNameHeader(request: Request) {
        let eventNameHeader = defaultWebhookEventNameHeader.toLowerCase();
        let headerValue = String(request.headers[eventNameHeader] || '');

        if (!headerValue) {
            for (const projectName of getAllProjectNames()) {
                const projectConfig = getProjectFarmConfig(projectName);
                const vcs = projectConfig.vcs;
                if (!vcs) {
                    throw new Error('Project vcs is not defined');
                }
                if (vcs !== 'git') {
                    continue;
                }
                const projectEventNameHeader =
                    projectConfig.vcsCredentials?.[vcs]?.webhookEventNameHeader?.toLowerCase();
                if (projectEventNameHeader) {
                    eventNameHeader = projectEventNameHeader;
                    headerValue = String(request.headers[eventNameHeader] || '');
                }
            }
        }

        return {eventNameHeader, headerValue};
    }

    getProjectConfig = async ({
        project,
        branch,
    }: GetProjectConfigParams): Promise<FarmProjectConfig> => {
        const {monoRepoPath} = getProjectFarmConfig(project);
        const tempDir = branch + getRandom();

        try {
            await this.checkout({project, branch, instanceDir: tempDir});

            let configFilePath = buildPath(WORKDIR_PATH, tempDir, monoRepoPath, 'farm.json');
            if (!nodeFs.existsSync(configFilePath)) {
                configFilePath = buildPath(WORKDIR_PATH, tempDir, monoRepoPath, 'package.json');
            }

            const configContent = nodeFs.readFileSync(configFilePath, 'utf8');
            return await JSON.parse(configContent);
        } finally {
            const pathToRemove = buildPath(WORKDIR_PATH, tempDir);
            if (nodeFs.existsSync(pathToRemove)) {
                nodeFs.rm(pathToRemove, {recursive: true}, () => undefined);
            }
        }
    };

    async listBranches(projectName: string): Promise<string[]> {
        const projectConfig = getProjectFarmConfig(projectName);
        const vcsConfig = projectConfig.vcsCredentials?.git ?? {};
        const hostname = vcsConfig.hostname || defaultHostname;

        if (hostname.includes('github')) {
            const token = getGitToken(vcsConfig);
            if (!token) {
                throw new Error('git token is not defined');
            }
            return this.getBranchesViaGithubAPI({
                token,
                hostname: hostname,
                repositoryPath: projectConfig.repositoryPath,
            });
        }

        /*
         * todo:
         * Rough algorithm: checkout repository then fetch and list branches.
         *
         * Command to list branches:
         * git branch -r --format='%(refname:short)' | jq -R -s 'split("\n")[:-1]'
         * This command requires jq so it should be installed on environment with farm.
         *
         * Maybe it is possible to parse raw 'git branch -r' output to remove
         * jq dependency.
         *
         * Tried to do so but got only two branches instead of about hundred.
         * Couldn't find out the reason of such behavior. Also on working VM hadn't
         * such problem because 'git branch -r' returns all known branches.
         * Tried on sourcecraft repository using https and ssh connection.
         */

        return Promise.resolve([]);
    }

    /**
     * @deprecated
     * Delete after cli implementation
     */
    private async getBranchesViaGithubAPI(params: {
        token: string;
        hostname: string;
        repositoryPath: string;
    }): Promise<string[]> {
        const headers = {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            Authorization: `Bearer ${params.token}`,
        };

        let branches: string[] = [];
        for (let page = 1; ; page++) {
            const {data} = await farmAxios<
                Array<{
                    name: string;
                }>
            >({
                method: 'GET',
                url: `https://api.${params.hostname || defaultHostname}/repos/${params.repositoryPath}/branches?page=${page}`,
                headers,
            });

            if (!data.length) break;
            branches = branches.concat(data.map((b) => b.name));
        }

        return branches;
    }

    getProjectRepoUrl(projectName: string): string {
        const projectConfig = getProjectFarmConfig(projectName);
        const vcsConfig = projectConfig.vcsCredentials?.git ?? {};
        const hostname = vcsConfig.hostname || defaultHostname;

        return `https://${hostname}/${projectConfig.repositoryPath}`;
    }
}

function filterToken(output: string, config: VcsCredentialsConfig) {
    const tokenValue = getGitToken(config);
    return tokenValue ? output.replace(tokenValue, 'GIT_REPOSITORY_TOKEN') : output;
}

/**
 * Works only with git clone command
 */
function getPrivateAuthHostname(config: VcsCredentialsConfig) {
    const {hostname = defaultHostname} = config;
    const tokenValue = getGitToken(config);

    if (!tokenValue) {
        return `https://${hostname}`;
    }

    return `https://${tokenValue}@${hostname}`;
}

function getGitToken(config: VcsCredentialsConfig): string | undefined {
    const {authTokenEnvName} = config;
    if (!authTokenEnvName) {
        const fallbackValues = process.env.GIT_REPOSITORY_TOKEN ?? process.env.GH_TOKEN;
        return fallbackValues || undefined;
    }

    return process.env[authTokenEnvName];
}

function getRandom() {
    return String(Math.floor(Math.random() * 9000 + 1000));
}
