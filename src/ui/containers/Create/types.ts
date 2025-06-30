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
        variables: QSVariables[];
        runVariables: QSVariables[];
        labels: QSVariables[];
    }
>;
