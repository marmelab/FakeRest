import sinon from 'sinon';
import simpleRestProvider from 'ra-data-simple-rest';
import { HttpError, type Options } from 'react-admin';
import { SinonAdapter } from '../src';
import { data } from './data';
import { middlewares } from './middlewares';

export const initializeSinon = () => {
    const restServer = new SinonAdapter({
        baseUrl: 'http://localhost:3000',
        data,
        loggingEnabled: true,
        middlewares,
    });

    // use sinon.js to monkey-patch XmlHttpRequest
    const server = sinon.fakeServer.create();
    // this is required when doing asynchronous XmlHttpRequest
    server.autoRespond = true;
    if (window) {
        // @ts-ignore
        window.restServer = restServer; // give way to update data in the console
        // @ts-ignore
        window.sinonServer = server; // give way to update data in the console
    }
    server.respondWith(restServer.getHandler());
};

// An HttpClient based on XMLHttpRequest to use with Sinon
const httpClient = (url: string, options: Options = {}): Promise<any> => {
    const request = new XMLHttpRequest();
    request.open(options.method ?? 'GET', url);

    const persistedUser = localStorage.getItem('user');
    const user = persistedUser ? JSON.parse(persistedUser) : null;
    if (user) {
        request.setRequestHeader('Authorization', `Bearer ${user.id}`);
    }

    // add content-type header
    request.overrideMimeType('application/json');
    request.send(typeof options.body === 'string' ? options.body : undefined);

    return new Promise((resolve, reject) => {
        request.onloadend = (e) => {
            let json: any;
            try {
                json = JSON.parse(request.responseText);
            } catch (e) {
                // not json, no big deal
            }
            // Get the raw header string
            const headersAsString = request.getAllResponseHeaders();

            // Convert the header string into an array
            // of individual headers
            const arr = headersAsString.trim().split(/[\r\n]+/);

            // Create a map of header names to values
            const headers = new Headers();
            for (const line of arr) {
                const parts = line.split(': ');
                const header = parts.shift();
                if (!header) continue;
                const value = parts.join(': ');
                headers.set(header, value);
            }
            if (request.status < 200 || request.status >= 300) {
                return reject(
                    new HttpError(
                        json?.message || request.statusText,
                        request.status,
                        json,
                    ),
                );
            }
            resolve({
                status: request.status,
                headers,
                body: request.responseText,
                json,
            });
        };
    });
};

export const dataProvider = simpleRestProvider(
    'http://localhost:3000',
    httpClient,
);
