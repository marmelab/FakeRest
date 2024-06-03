import simpleRestProvider from 'ra-data-simple-rest';
import { fetchUtils } from 'react-admin';

const httpClient = (url: string, options: any = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    const persistedUser = localStorage.getItem('user');
    const user = persistedUser ? JSON.parse(persistedUser) : null;
    if (user) {
        options.headers.set('Authorization', `Bearer ${user.id}`);
    }
    return fetchUtils.fetchJson(url, options);
};

export const dataProvider = simpleRestProvider(
    'http://localhost:3000',
    httpClient,
);
