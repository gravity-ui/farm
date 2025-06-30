import type {FarmConfigBase} from '../../shared/common';

export interface FarmConfig extends FarmConfigBase {
    // farm provider info
    farmProvider?: FarmProviderConfiguration;
}

export interface FarmProviderConfiguration {
    name: string;
    config?: Record<string, any>;
}
