import type {SubscriptionObserver} from 'observable-fns';

import type {InstanceObservableEmitValue} from '../models/common';

import {CommandError} from './command-error';

export const wrapAsCommand = async <T>(
    observer: SubscriptionObserver<InstanceObservableEmitValue>,
    name: string,
    func: () => Promise<T>,
): Promise<T> => {
    observer.next({
        output: [{command: name, code: null, stderr: null, stdout: null, duration: null}],
    });

    const startTime = Date.now();
    let code = 0;

    try {
        return await func();
    } catch (error) {
        if (error instanceof CommandError) {
            code = error.exitCode;
        }

        throw error;
    } finally {
        const endTime = Date.now();

        observer.next({
            output: [
                {
                    command: name,
                    duration: endTime - startTime,
                    code,
                    stderr: null,
                    stdout: null,
                },
            ],
        });
    }
};
