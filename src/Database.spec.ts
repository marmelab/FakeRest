import { Database } from './Database.ts';
import { Single } from './Single.ts';
import { Collection } from './Collection.ts';

describe('Database', () => {
    describe('init', () => {
        it('should populate several collections', () => {
            const server = new Database();
            server.init({
                foo: [{ a: 1 }, { a: 2 }, { a: 3 }],
                bar: [{ b: true }, { b: false }],
                baz: { name: 'baz' },
            });
            expect(server.getAll('foo')).toEqual([
                { id: 0, a: 1 },
                { id: 1, a: 2 },
                { id: 2, a: 3 },
            ]);
            expect(server.getAll('bar')).toEqual([
                { id: 0, b: true },
                { id: 1, b: false },
            ]);
            expect(server.getOnly('baz')).toEqual({ name: 'baz' });
        });
    });

    describe('addCollection', () => {
        it('should add a collection and index it by name', () => {
            const server = new Database();
            const collection = new Collection({
                items: [
                    { id: 1, name: 'foo' },
                    { id: 2, name: 'bar' },
                ],
            });
            server.addCollection('foo', collection);
            const newcollection = server.getCollection('foo');
            expect(newcollection).toEqual(collection);
        });
    });

    describe('addSingle', () => {
        it('should add a single object and index it by name', () => {
            const server = new Database();
            const single = new Single({ name: 'foo', description: 'bar' });
            server.addSingle('foo', single);
            expect(server.getSingle('foo')).toEqual(single);
        });
    });

    describe('getAll', () => {
        it('should return all items for a given name', () => {
            const server = new Database();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            server.addCollection(
                'baz',
                new Collection({ items: [{ id: 1, name: 'baz' }] }),
            );
            expect(server.getAll('foo')).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
            ]);
            expect(server.getAll('baz')).toEqual([{ id: 1, name: 'baz' }]);
        });

        it('should support a query', () => {
            const server = new Database();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 0, name: 'c', arg: false },
                        { id: 1, name: 'b', arg: true },
                        { id: 2, name: 'a', arg: true },
                    ],
                }),
            );
            const params = {
                filter: { arg: true },
                sort: 'name',
                slice: [0, 10],
            };
            const expected = [
                { id: 2, name: 'a', arg: true },
                { id: 1, name: 'b', arg: true },
            ];
            expect(server.getAll('foo', params)).toEqual(expected);
        });
    });

    describe('getOne', () => {
        it('should return an error when no collection match the identifier', () => {
            const server = new Database();
            server.addCollection(
                'foo',
                new Collection({ items: [{ id: 1, name: 'foo' }] }),
            );
            expect(() => {
                server.getOne('foo', 2);
            }).toThrow(new Error('No item with identifier 2'));
        });

        it('should return the first collection matching the identifier', () => {
            const server = new Database();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { id: 1, name: 'foo' },
                        { id: 2, name: 'bar' },
                    ],
                }),
            );
            expect(server.getOne('foo', 1)).toEqual({ id: 1, name: 'foo' });
            expect(server.getOne('foo', 2)).toEqual({ id: 2, name: 'bar' });
        });

        it('should use the identifierName', () => {
            const server = new Database();
            server.addCollection(
                'foo',
                new Collection({
                    items: [
                        { _id: 1, name: 'foo' },
                        { _id: 2, name: 'bar' },
                    ],
                    identifierName: '_id',
                }),
            );
            expect(server.getOne('foo', 1)).toEqual({ _id: 1, name: 'foo' });
            expect(server.getOne('foo', 2)).toEqual({ _id: 2, name: 'bar' });
        });
    });

    describe('getOnly', () => {
        it('should return the single matching the identifier', () => {
            const server = new Database();
            server.addSingle('foo', new Single({ name: 'foo' }));
            expect(server.getOnly('foo')).toEqual({ name: 'foo' });
        });
    });
});
