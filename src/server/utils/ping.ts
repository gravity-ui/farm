import http from 'http';

export const ping = (options: http.RequestOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve, reject) => {
        try {
            const request = http.request(options, (message) => {
                message.on('data', () => {
                    resolve(message.statusCode === 200);
                });
            });

            request.on('error', reject);
            request.end();
        } catch (error) {
            reject(error);
        }
    });
};
