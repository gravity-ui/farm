import type {Instance} from '../../shared/common';

export interface WebhookAction {
    onPullRequestOpenAfterCreateInstance(
        instance: Instance,
        webhookParameters: Record<string, any>,
    ): Promise<void>;
    onPullRequestClosed?(webhookParameters: Record<string, any>): Promise<void>;
}
