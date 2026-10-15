import nodeFs from 'node:fs';

import type {Request} from '@gravity-ui/expresskit';
import axios from 'axios';

import type {ListBranchesRequest} from '../../../shared/api/listBranches';
import {isCommitHash} from '../../../shared/commit';
import type {Output, VcsCredentialsConfig} from '../../../shared/common';
import {TEMP_PATH, WORKDIR_PATH} from '../../constants';
import {executeRun} from '../async';
import {buildPath, getAllProjectNames, getProjectFarmConfig} from '../common';
import type {FarmProjectConfig} from '../farmJsonConfig';

import {listRecentRefs} from './recent-refs';
import type {
    CommonPullRequestData,
    GetProjectConfigParams,
    Vcs,
    VcsCheckoutProps,
    VcsGetK8sCheckoutCommands,
} from './vcs';
import {getCheckoutRef} from './vcs';

const defaultHostname = 'github.com';
const defaultWebhookEventNameHeader = 'x-github-event';

export class GitVcs implements Vcs {
    async startup(): Promise<void> {
        return Promise.resolve();
    }

    getCheckoutRef({branch, commit}: Pick<VcsGetK8sCheckoutCommands, 'branch' | 'commit'>): string {
        if (commit !== undefined && !this.isValidRef(commit)) {
            throw new Error('Commit must be a full hexadecimal hash');
        }

        return getCheckoutRef({branch, commit});
    }

    isValidRef(ref: string): boolean {
        return isCommitHash(ref);
    }

    async checkout({project, branch, commit, instanceDir}: VcsCheckoutProps) {
        const {repositoryPath, vcsCredentials} = getProjectFarmConfig(project);
        const vcsConfig = vcsCredentials?.git ?? {};
        const projectRepoUrl = getPrivateAuthHostname(vcsConfig);
        const checkoutRef = this.getCheckoutRef({branch, commit});

        const targetDir = `${WORKDIR_PATH}/${instanceDir}`;
        const explicitBranch = branch.startsWith('refs/heads/');
        const branchName = explicitBranch ? branch.slice('refs/heads/'.length) : branch;
        const repositoryUrl = `${projectRepoUrl}/${repositoryPath}.git`;
        let command = `git clone --depth 1 -b ${quote(branchName)} -- ${quote(repositoryUrl)} ${quote(targetDir)}`;

        if (commit) {
            command = `
                git clone --depth 1 -- ${quote(repositoryUrl)} ${quote(targetDir)} &&
                cd ${quote(targetDir)} &&
                git fetch --depth 1 origin ${quote(checkoutRef)} &&
                git checkout --detach ${quote(checkoutRef)}
            `;
        } else if (!explicitBranch && branch.startsWith('refs/tags/')) {
            command = `
                git clone --depth 1 -- ${quote(repositoryUrl)} ${quote(targetDir)} &&
                cd ${quote(targetDir)} &&
                git fetch --depth 1 origin ${quote(branch)} &&
                git checkout --detach FETCH_HEAD
            `;
        } else if (!explicitBranch && branch.startsWith('pull/')) {
            command = `
                git clone --depth 1 -- ${quote(repositoryUrl)} ${quote(targetDir)} &&
                cd ${quote(targetDir)} &&
                git fetch origin ${quote(`${branch}:${instanceDir}`)} &&
                git checkout ${quote(instanceDir)}
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

    getK8sCheckoutCommands({project, branch, commit}: VcsGetK8sCheckoutCommands): string[] {
        const {repositoryPath, monoRepoPath, vcsCredentials} = getProjectFarmConfig(project);
        const vcsConfig = vcsCredentials?.git ?? {};
        const instancePath = buildPath(repositoryPath, monoRepoPath);
        const projectRepoUrl = getPrivateAuthHostname(vcsConfig);
        const checkoutRef = this.getCheckoutRef({branch, commit});

        const explicitBranch = branch.startsWith('refs/heads/');
        const branchName = explicitBranch ? branch.slice('refs/heads/'.length) : branch;
        const tag = !explicitBranch && branch.startsWith('refs/tags/');
        const repositoryUrl = `${projectRepoUrl}/${repositoryPath}.git`;

        return [
            `mkdir -p /${TEMP_PATH}`,
            `cd /${TEMP_PATH}`,
            `mkdir -p ${quote(repositoryPath)}`,
            commit || tag
                ? `git clone --depth 1 -- ${quote(repositoryUrl)} ${quote(repositoryPath)}`
                : `git clone --depth 1 -b ${quote(branchName)} -- ${quote(repositoryUrl)} ${quote(repositoryPath)}`,
            ...(commit || tag
                ? [
                      `cd ${quote(repositoryPath)}`,
                      `git fetch --depth 1 origin ${quote(checkoutRef)}`,
                      `git checkout --detach ${commit ? quote(checkoutRef) : 'FETCH_HEAD'}`,
                      `cd /${TEMP_PATH}`,
                  ]
                : []),
            `cd ${quote(instancePath)}`,
        ];
    }

    parsePullRequestData(rawData: unknown): CommonPullRequestData {
        const data = rawData as {
            action: string;
            pull_request: {
                title: string;
                body: string;
                head: {ref: string; sha?: string};
                base: {ref: string};
                number: number;
                user: {login: string};
                merged?: boolean;
            };
            repository: {full_name: string};
        };

        const project = data.repository.full_name.split('/')[1];
        const title = data.pull_request.title;
        const headBranch = data.pull_request.head.ref;
        const branch = /^refs\/(tags|heads)\//.test(headBranch)
            ? `refs/heads/${headBranch}`
            : headBranch;
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
            commit: data.pull_request.head.sha,
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
        commit,
    }: GetProjectConfigParams): Promise<FarmProjectConfig> => {
        const {monoRepoPath} = getProjectFarmConfig(project);
        const tempDir = this.getCheckoutRef({branch, commit}) + getRandom();

        try {
            await this.checkout({project, branch, commit, instanceDir: tempDir});

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

    async listBranches(
        projectName: string,
        options: Pick<ListBranchesRequest, 'refType' | 'query'> = {},
    ): Promise<string[]> {
        const projectConfig = getProjectFarmConfig(projectName);
        const vcsConfig = projectConfig.vcsCredentials?.git ?? {};
        const hostname = vcsConfig.hostname || defaultHostname;

        if (!hostname.includes('github')) return [];
        const token = getGitToken(vcsConfig);
        if (!token) throw new Error('git token is not defined');
        return listRecentRefs(
            {
                ...options,
                token,
                hostname,
                repositoryPath: projectConfig.repositoryPath,
                defaultBranch: projectConfig.defaultBranch,
            },
            axios,
        );
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

function quote(value: string) {
    return "'" + value.replace(/'/g, "'\\''") + "'";
}
