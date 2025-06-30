import type {ExpressCSPParams} from 'express-csp-header';

import type {HelpListItem} from '../../../shared/common';
import {getDefaultCspDirectives} from '../../configs/csp';
import type {AuthProvider} from '../../models/common';
import type {Vcs} from '../../utils/vcs/vcs';
import type {WebhookAction} from '../../utils/webhook-action';
import type {BaseFarmProvider, FarmInternalApi} from '../farm-provider/base-provider';

interface FarmProviderPlugin {
    constructor: (props: {
        internalApi: FarmInternalApi;
        config?: Record<string, any>;
    }) => BaseFarmProvider;
}

// implements Vcs
interface VcsProviderPlugin {
    constructor: (props: {config?: Record<string, any>}) => Vcs;
}

type FieldDefinition = string | {field: string; mergeWithGlobal?: boolean};

/**
 * Farm Provider Registry
 */
class FarmProviderRegistry {
    private plugins: {
        [key: string]: FarmProviderPlugin | undefined;
    } = {};

    private instances: Record<string, BaseFarmProvider | undefined> = {};

    plugIn(name: string, plugin: FarmProviderPlugin) {
        this.plugins[name] = plugin;
    }

    getPlugins() {
        return this.plugins;
    }

    setInstance(name: string, instance: BaseFarmProvider) {
        this.instances[name] = instance;
    }

    getInstance(name: string) {
        return this.instances[name];
    }
}

/**
 * Farm Json Config Registry
 */
class FarmJsonConfigRegistry {
    private fields: FieldDefinition[] = [];

    defineFields(fields: FieldDefinition[]) {
        this.fields = this.fields.concat(fields);
    }

    getFields() {
        return this.fields;
    }
}

/**
 * VCS Registry
 */
class VcsRegistry {
    private plugins: {
        [key: string]: VcsProviderPlugin | undefined;
    } = {};

    private instances: Record<string, Vcs | undefined> = {};

    plugIn(name: string, plugin: VcsProviderPlugin) {
        this.plugins[name] = plugin;
    }

    getPlugins() {
        return this.plugins;
    }

    setInstance(name: string, instance: Vcs) {
        this.instances[name] = instance;
    }

    getInstance(name: string) {
        return this.instances[name];
    }
}

/**
 * Webhook Actions Registry
 */
class WebhookActionsRegistry {
    private plugins: {
        [key: string]: WebhookAction | undefined;
    } = {};

    plugIn(name: string, plugin: WebhookAction) {
        this.plugins[name] = plugin;
    }

    getPlugins() {
        return this.plugins;
    }
}

export interface AuthPlugin {
    constructor: () => AuthProvider;
}

/**
 * Auth Registry
 */
class AuthProviderRegistry {
    private plugins: {
        [key: string]: AuthPlugin | undefined;
    } = {};

    plugIn(name: string, plugin: AuthPlugin) {
        this.plugins[name] = plugin;
    }

    getPlugins() {
        return this.plugins;
    }

    private instances: {
        [key: string]: AuthProvider | undefined;
    } = {};

    getProviderInstance(name: string): AuthProvider | undefined {
        if (!this.instances[name]) {
            const plugin = this.plugins[name];
            if (!plugin) {
                return undefined;
            }
            this.instances[name] = plugin.constructor();
        }
        return this.instances[name];
    }
}

class UIConfigurationRegistry {
    private navigationHelpMenuConfiguration: HelpListItem[] = [];

    setNavigationHelpMenuConfiguration(items: HelpListItem[]) {
        this.navigationHelpMenuConfiguration = items;
    }

    getNavigationHelpMenuConfiguration() {
        return this.navigationHelpMenuConfiguration;
    }
}

class CSPDirectivesConfiguration {
    private configuration: ExpressCSPParams['directives'] = getDefaultCspDirectives();

    setupConfiguration(
        nextConfig: (curr: ExpressCSPParams['directives']) => ExpressCSPParams['directives'],
    ) {
        this.configuration = nextConfig(this.configuration);
    }

    getConfiguration() {
        return this.configuration;
    }
}

/**
 * Plugin Registry to extend Farm Core
 */
class CoreRegistry {
    readonly farmProviders = new FarmProviderRegistry();
    readonly farmJsonConfig = new FarmJsonConfigRegistry();
    readonly vcs = new VcsRegistry();
    readonly webhookActions = new WebhookActionsRegistry();
    readonly authProviders = new AuthProviderRegistry();
    readonly uiConfiguration = new UIConfigurationRegistry();
    readonly cspDirectives = new CSPDirectivesConfiguration();
}

export const coreRegistry = new CoreRegistry();
