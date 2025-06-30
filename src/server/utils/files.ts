import fs from 'fs';
import util from 'util';

import type {Output} from '../../shared/common';

import {executeRun} from './async';

export const fileExists = util.promisify(fs.exists);

export const readFile = util.promisify(fs.readFile);

export const readdir = util.promisify(fs.readdir);

export const writeFile = util.promisify(fs.writeFile);

export async function ensureDirectory(
    directory: string,
    handleOutput?: (output: Output) => void,
    getProcessId?: (pid: number) => void,
) {
    const exists = await fileExists(directory);
    if (exists) {
        return;
    }
    await executeRun(`mkdir -p ${directory}`, undefined, handleOutput, getProcessId);
}

export async function removeDirectory(
    directory: string,
    handleOutput?: (output: Output) => void,
    getProcessId?: (pid: number) => void,
) {
    const exists = await fileExists(directory);
    if (!exists) {
        return;
    }
    await executeRun(`rm -rf ${directory}`, undefined, handleOutput, getProcessId);
}
