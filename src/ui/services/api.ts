import type {AxiosInstance} from 'axios';
import axios from 'axios';

export class API {
    _axios: AxiosInstance;
    constructor(config = {}) {
        this._axios = axios.create(config);
    }

    request<TRequest = {}, TResponse = {}>({
        action,
        data,
    }: {
        action: string;
        data?: TRequest;
    }): Promise<TResponse> {
        return this._axios({
            method: 'POST',
            url: `/api/${action}`,
            data,
        }).then((response) => response.data);
    }
}

export default new API();
