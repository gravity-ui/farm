import {sleep} from './common';

export async function withRetry<T>(
    operation: () => Promise<T>,
    retries = 3,
    delay = 1500,
): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (attempt === retries - 1) {
                throw error;
            }

            await sleep(delay);
        }
    }
    throw new Error('Operation failed after all retries');
}
