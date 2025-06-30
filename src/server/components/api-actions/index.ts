import type {ApiAction} from '../../../shared/common';

import deleteInstance from './deleteInstance';
import deleteInstances from './deleteInstances';
import getInstance from './getInstance';
import getInstanceConfig from './getInstanceConfig';
import getInstanceProviderStatus from './getInstanceProviderStatus';
import getInstancesConfigs from './getInstancesConfigs';
import getProjectRepoUrl from './getProjectRepoUrl';
import listBranches from './listBranches';
import listInstanceLogs from './listInstanceLogs';
import listLogs from './listLogs';
import listProjectInstances from './listProjectInstances';
import listProjects from './listProjects';
import listProviderInstances from './listProviderInstances';
import listQueue from './listQueue';
import listVcsProviders from './listVcsProviders';
import restartInstance from './restartInstance';
import searchProjects from './searchProjects';
import startInstance from './startInstance';
import stopInstance from './stopInstance';

export default {
    listProjects,
    searchProjects,
    listProjectInstances,
    deleteInstance,
    deleteInstances,
    listLogs,
    listInstanceLogs,
    listBranches,
    listProviderInstances,
    listVcsProviders,
    stopInstance,
    startInstance,
    getInstanceProviderStatus,
    getInstance,
    restartInstance,
    listQueue,
    getInstanceConfig,
    getInstancesConfigs,
    getProjectRepoUrl,
} as Record<string, ApiAction>;
