import type {ExecOptions} from 'shelljs';
import shell from 'shelljs';

import type {Output} from '../../shared/common';

const LOGS_TIMEOUT = 5000;

export function executeRun(
    command: string,
    options: ExecOptions = {},
    handleOutput?: (output: Output) => void,
    getProcessId?: (pid: number) => void,
) {
    handleOutput?.({command, code: null, stderr: null, stdout: null, duration: null});
    const start = Date.now();

    if (options.env) {
        options.env = {
            ...process.env,
            ...options.env,
        };
    }

    options.silent = true;
    const stdoutOutput: string[] = [];
    const stderrOutput: string[] = [];

    return new Promise<{code: number; stdout: string; stderr: string}>((resolve, reject) => {
        const timerId = setInterval(() => {
            if (stdoutOutput.length > 0 || stderrOutput.length > 0) {
                handleOutput?.({
                    stdout: stdoutOutput.join(''),
                    stderr: stderrOutput.join(''),
                    code: null,
                    command: null,
                    duration: null,
                });
                stdoutOutput.length = 0;
                stderrOutput.length = 0;
            }
        }, LOGS_TIMEOUT);

        const childProcess = shell.exec(command, options, (code, stdout, stderr) => {
            const duration = Date.now() - start;

            clearInterval(timerId);

            handleOutput?.({
                command,
                duration,
                stdout: stdoutOutput.join(''),
                stderr: stderrOutput.join(''),
                code,
            });

            if (code === 0) {
                resolve({code, stdout, stderr});
            } else {
                reject({command, code, stdout, stderr});
            }
        });

        getProcessId?.(childProcess.pid!);

        if (handleOutput) {
            childProcess.stdout?.on('data', (data) => {
                stdoutOutput.push(data.toString());
            });
            childProcess.stderr?.on('data', (data) => {
                stderrOutput.push(data.toString());
            });
        }
    });
}

type ForEachCb<T> = (item: T, index: number, items: T[]) => Promise<any>;

export async function asyncForEach<T>(array: T[], callback: ForEachCb<T>) {
    for (let index = 0; index < array.length; index++) {
        // eslint-disable-next-line callback-return
        await callback(array[index], index, array);
    }
}
