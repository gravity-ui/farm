import https from 'https';

import axios from 'axios';

const options = {
    timeout: 25 * 1000,
    // TODO: remove this when api host gets normal certificate
    httpsAgent: new https.Agent({
        rejectUnauthorized: false,
    }),
};

export const farmAxios = axios.create(options);
