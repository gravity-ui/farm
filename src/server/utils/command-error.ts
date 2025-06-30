export class CommandError extends Error {
    declare exitCode: number;

    constructor(exitCode: number) {
        super(`Command was terminated with an error with exit code ${exitCode}`);

        this.name = 'CommandError';
        this.exitCode = exitCode;
    }
}
