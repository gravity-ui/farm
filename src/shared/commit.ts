export function isCommitHash(value: string): boolean {
    return /^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(value);
}
