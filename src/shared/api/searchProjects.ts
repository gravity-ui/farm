import type {Project} from './listProjects';

export interface SearchProjectsRequest {
    projectPattern: string;
}

export interface SearchProjectsResponse {
    projects: Project[] | undefined;
}
