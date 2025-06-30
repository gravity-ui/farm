/* eslint-disable @typescript-eslint/no-unused-vars */
import Tables from 'knex/types/tables';

import type {InstanceBuildLogsRow, InstanceRow} from '../../../models/common';

declare module 'knex/types/tables' {
    export interface Tables {
        instances: InstanceRow;
        instance_build_logs: InstanceBuildLogsRow;
    }
}
