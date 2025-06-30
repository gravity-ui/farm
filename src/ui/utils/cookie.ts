type Cookie = {
    domain?: string;
    name: string;
    value: string;
    path?: string;
    maxAge?: number;
};

export const setCookie = ({
    domain,
    name,
    value,
    path = '/',
    maxAge = 365 * 24 * 60 * 60,
}: Cookie) => {
    let cookie = `${name}=${value}; path=${path}; max-age=${maxAge}`;

    if (domain) {
        cookie += `; domain=${domain}`;
    }

    document.cookie = cookie;
};
