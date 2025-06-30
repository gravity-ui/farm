import type {Instance} from '../common';

export interface Project {
    name: string;
    vcs: string;
    items: Instance[];
}

export interface ListProjectsResponse {
    projects: Project[];
}

export interface ListProjectsRequest {}
