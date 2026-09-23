import type {Instance} from '../../../shared/common';

export interface QSVariables {
    key: string;
    value: string;
}

export type FormValue = Required<
    Pick<
        Instance,
        'project' | 'branch' | 'description' | 'urlTemplate' | 'vcs' | 'instanceConfigName'
    > & {
        commit: string;
        variables: QSVariables[];
        runVariables: QSVariables[];
        labels: QSVariables[];
    }
>;
