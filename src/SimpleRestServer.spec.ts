import { SimpleRestServer } from './SimpleRestServer.ts';

describe('SimpleRestServer', () => {
    describe('getAll', () => {
        it('should return list results according to the request parameters', async () => {
            const data = {
                posts: [
                    {
                        id: 1,
                        title: 'bazingaaa',
                    },
                    {
                        id: 2,
                        title: 'bazinga',
                    },
                    {
                        id: 3,
                        title: 'nope',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts',
                method: 'GET',
                params: {
                    filter: { q: 'bazin' },
                    range: [0, 1],
                    sort: 'title',
                },
                requestBody: undefined,
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: [
                        {
                            id: 2,
                            title: 'bazinga',
                        },
                        {
                            id: 1,
                            title: 'bazingaaa',
                        },
                    ],
                }),
            );
        });
    });
    describe('getOne', () => {
        it('should correctly get records with a numeric identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 1,
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/1',
                method: 'GET',
                params: {},
                requestBody: undefined,
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 1,
                        title: 'test',
                    },
                }),
            );
        });
        it('should correctly get records with a string identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 'bazinga',
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/bazinga',
                method: 'GET',
                params: {},
                requestBody: undefined,
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 'bazinga',
                        title: 'test',
                    },
                }),
            );
        });
    });
    describe('update', () => {
        it('should correctly update records with a numeric identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 1,
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/1',
                method: 'PUT',
                params: {},
                requestBody: {
                    id: 1,
                    title: 'test42',
                },
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 1,
                        title: 'test42',
                    },
                }),
            );
        });
        it('should correctly update records with a string identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 'bazinga',
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/bazinga',
                method: 'PUT',
                params: {},
                requestBody: {
                    id: 'bazinga',
                    title: 'test42',
                },
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 'bazinga',
                        title: 'test42',
                    },
                }),
            );
        });
    });
    describe('delete', () => {
        it('should correctly delete records with a numeric identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 1,
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/1',
                method: 'DELETE',
                params: {},
                requestBody: undefined,
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 1,
                        title: 'test',
                    },
                }),
            );
        });
        it('should correctly delete records with a string identifier', async () => {
            const data = {
                posts: [
                    {
                        id: 'bazinga',
                        title: 'test',
                    },
                ],
            };

            const server = new SimpleRestServer({
                baseUrl: 'http://localhost:4000',
                data,
            });

            const response = await server.handleRequest({
                url: 'http://localhost:4000/posts/bazinga',
                method: 'DELETE',
                params: {},
                requestBody: {
                    id: 'bazinga',
                    title: 'test',
                },
            });

            expect(response).toEqual(
                expect.objectContaining({
                    status: 200,
                    body: {
                        id: 'bazinga',
                        title: 'test',
                    },
                }),
            );
        });
    });
});
