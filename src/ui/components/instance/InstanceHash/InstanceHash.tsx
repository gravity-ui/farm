export const InstanceHash = ({hash}: {hash: string}) => {
    if (hash.length <= 8) {
        return hash;
    }

    const shortenedHash = hash.slice(0, 4) + '...' + hash.slice(-4);
    return shortenedHash;
};
