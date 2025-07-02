import {sleep} from './common';

export const waitFor = <T>(
    get: () => Promise<T>,
    predicate: (value: T) => boolean,
    timeout?: number,
    period = 1000,
): Promise<{value: T; timedOut: boolean}> => {
    const tick = async () => {
        let value = await get();

        while (!predicate(value)) {
            value = await get();
            await sleep(period);
        }

        return {value, timedOut: false};
    };

    if (!timeout) {
        return tick();
    }

    return Promise.race([
        tick(),
        sleep(timeout)
            .then(get)
            .then((value) => ({value, timedOut: true})),
    ]);
};
