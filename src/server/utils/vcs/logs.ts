import type {SubscriptionObserver} from 'observable-fns';

import type {Output} from '../../../shared/common';
import type {InstanceObservableEmitValue} from '../../models/common';

import type {Vcs} from './vcs';

export function createVcsLogRedactor(vcs: Vcs) {
    return vcs.createLogRedactor?.() ?? ((logs: Output[]) => vcs.redactLogs?.(logs) ?? logs);
}

export function redactVcsError(vcs: Vcs, error: unknown): unknown {
    if (!vcs.redactOutput) return error;
    return vcs.redactOutput(error instanceof Object ? error : new Error(String(error)));
}

export function createVcsBuildObserver(
    vcs: Vcs,
    observer: SubscriptionObserver<InstanceObservableEmitValue>,
) {
    const redact = createVcsLogRedactor(vcs);
    return {
        observer: {
            get closed() {
                return observer.closed;
            },
            next(value: InstanceObservableEmitValue) {
                observer.next(value.output ? {...value, output: redact(value.output)} : value);
            },
            error(error: unknown) {
                observer.error(redactVcsError(vcs, error));
            },
            complete() {
                observer.complete();
            },
        } as SubscriptionObserver<InstanceObservableEmitValue>,
        flush() {
            const output = redact([], true);
            if (output.some((row) => row.stdout || row.stderr)) observer.next({output});
        },
    };
}
