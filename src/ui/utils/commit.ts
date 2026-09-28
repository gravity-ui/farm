import {isCommitHash} from '../../shared/commit';

const validators: Record<string, (ref: string) => boolean> = {
    git: isCommitHash,
};

export function isValidCommitForVcs(vcs: string, commit: string): boolean {
    return !commit || (validators[vcs]?.(commit) ?? Boolean(commit.trim()));
}
