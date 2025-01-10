import { Collection } from './Collection.ts';
import { Database } from './Database.ts';
import type { CollectionItem } from './types.ts';

describe('Collection', () => {
    describe('constructor', () => {
        it('should set the initial set of data', () => {
            const collection = new Collection({
                items: [
                    { id: 1, name: 'foo' },
                    { id: 2, name: 'bar' },
                ],
            });
            expect(collection.getAll()).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
            ]);
        });

        it('should set identifier name to id by default', () => {
            const collection = new Collection();
            expect(collection.identifierName).toEqual('id');
        });
    });

    describe('getCount', () => {
        it('should return an integer', () => {
            expect(new Collection().getCount()).toEqual(0);
        });

        it('should return the collection size', () => {
            expect(new Collection({ items: [{}, {}] }).getCount()).toEqual(2);
        });

        it('should return the correct collection size, even when items were removed', () => {
            const collection = new Collection({ items: [{}, {}, {}] });
            collection.removeOne(1);
            expect(collection.getCount()).toEqual(2);
        });

        it('should accept a query object', () => {
            const collection = new Collection({
                items: [{}, { name: 'a' }, { name: 'b' }],
            });
            function filter(item: CollectionItem) {
                return item.name === 'a' || item.name === 'b';
            }
            expect(collection.getCount({ filter: filter })).toEqual(2);
        });
    });

    describe('getAll', () => {
        it('should return an array', () => {
            expect(new Collection().getAll()).toEqual([]);
        });

        it('should return all collections', () => {
            const collection = new Collection({
                items: [
                    { id: 1, name: 'foo' },
                    { id: 2, name: 'bar' },
                ],
            });
            expect(collection.getAll()).toEqual([
                { id: 1, name: 'foo' },
                { id: 2, name: 'bar' },
            ]);
        });

        describe('sort query', () => {
            it('should throw an error if passed an unsupported sort argument', () => {
                const collection = new Collection();
                expect(() => {
                    // @ts-expect-error
                    collection.getAll({ sort: 23 });
                }).toThrow(new Error('Unsupported sort type'));
            });

            it('should sort by sort function', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                const expected = [
                    { name: 'a', id: 1 },
                    { name: 'b', id: 2 },
                    { name: 'c', id: 0 },
                ];
                function sort(a: CollectionItem, b: CollectionItem) {
                    if (a.name > b.name) {
                        return 1;
                    }
                    if (a.name < b.name) {
                        return -1;
                    }
                    // a must be equal to b
                    return 0;
                }
                expect(collection.getAll({ sort: sort })).toEqual(expected);
            });

            it('should sort by sort name', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                const expected = [
                    { name: 'a', id: 1 },
                    { name: 'b', id: 2 },
                    { name: 'c', id: 0 },
                ];
                expect(collection.getAll({ sort: 'name' })).toEqual(expected);
            });

            it('should sort by sort name and direction', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                let expected: CollectionItem[];
                expected = [
                    { name: 'a', id: 1 },
                    { name: 'b', id: 2 },
                    { name: 'c', id: 0 },
                ];
                expect(collection.getAll({ sort: ['name', 'asc'] })).toEqual(
                    expected,
                );
                expected = [
                    { name: 'c', id: 0 },
                    { name: 'b', id: 2 },
                    { name: 'a', id: 1 },
                ];
                expect(collection.getAll({ sort: ['name', 'desc'] })).toEqual(
                    expected,
                );
            });

            it('should not affect further requests', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                collection.getAll({ sort: 'name' });
                const expected = [
                    { name: 'c', id: 0 },
                    { name: 'a', id: 1 },
                    { name: 'b', id: 2 },
                ];
                expect(collection.getAll()).toEqual(expected);
            });
        });

        describe('filter query', () => {
            it('should throw an error if passed an unsupported filter argument', () => {
                const collection = new Collection();
                expect(() => {
                    // @ts-expect-error
                    collection.getAll({ filter: 23 });
                }).toThrow(new Error('Unsupported filter type'));
            });

            it('should filter by filter function', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                const expected = [
                    { name: 'c', id: 0 },
                    { name: 'b', id: 2 },
                ];
                function filter(item: CollectionItem) {
                    return item.name !== 'a';
                }
                expect(collection.getAll({ filter: filter })).toEqual(expected);
            });

            it('should filter by filter object', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                const expected = [{ name: 'b', id: 2 }];
                expect(collection.getAll({ filter: { name: 'b' } })).toEqual(
                    expected,
                );
            });

            it('should filter values with deep paths', () => {
                const collection = new Collection({
                    items: [
                        { name: 'c', deep: { value: 'c' } },
                        { name: 'a', deep: { value: 'a' } },
                        { name: 'b', deep: { value: 'b' } },
                    ],
                });
                const expected = [{ name: 'b', deep: { value: 'b' }, id: 2 }];
                expect(
                    collection.getAll({ filter: { 'deep.value': 'b' } }),
                ).toEqual(expected);
            });

            it('should filter values with objects', () => {
                const collection = new Collection({
                    items: [
                        { name: 'c', deep: { value: 'c' } },
                        { name: 'a', deep: { value: 'a' } },
                        { name: 'b', deep: { value: 'b' } },
                    ],
                });
                const expected = [{ name: 'b', deep: { value: 'b' }, id: 2 }];
                expect(
                    collection.getAll({ filter: { deep: { value: 'b' } } }),
                ).toEqual(expected);
            });

            it('should filter boolean values properly', () => {
                const collection = new Collection({
                    items: [
                        { name: 'a', is: true },
                        { name: 'b', is: false },
                        { name: 'c', is: true },
                    ],
                });
                const expectedFalse = [{ name: 'b', id: 1, is: false }];
                const expectedTrue = [
                    { name: 'a', id: 0, is: true },
                    { name: 'c', id: 2, is: true },
                ];
                expect(collection.getAll({ filter: { is: 'false' } })).toEqual(
                    expectedFalse,
                );
                expect(collection.getAll({ filter: { is: false } })).toEqual(
                    expectedFalse,
                );
                expect(collection.getAll({ filter: { is: 'true' } })).toEqual(
                    expectedTrue,
                );
                expect(collection.getAll({ filter: { is: true } })).toEqual(
                    expectedTrue,
                );
            });

            it('should filter array values properly', () => {
                const collection = new Collection({
                    items: [
                        { tags: ['a', 'b', 'c'] },
                        { tags: ['b', 'c', 'd'] },
                        { tags: ['c', 'd', 'e'] },
                    ],
                });
                const expected = [
                    { id: 0, tags: ['a', 'b', 'c'] },
                    { id: 1, tags: ['b', 'c', 'd'] },
                ];
                expect(collection.getAll({ filter: { tags: 'b' } })).toEqual(
                    expected,
                );
                expect(collection.getAll({ filter: { tags: 'f' } })).toEqual(
                    [],
                );
            });

            it('should filter array values properly within deep paths', () => {
                const collection = new Collection({
                    items: [
                        { deep: { tags: ['a', 'b', 'c'] } },
                        { deep: { tags: ['b', 'c', 'd'] } },
                        { deep: { tags: ['c', 'd', 'e'] } },
                    ],
                });
                const expected = [
                    { id: 0, deep: { tags: ['a', 'b', 'c'] } },
                    { id: 1, deep: { tags: ['b', 'c', 'd'] } },
                ];
                expect(
                    collection.getAll({ filter: { 'deep.tags': 'b' } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({ filter: { 'deep.tags': 'f' } }),
                ).toEqual([]);
            });

            it('should filter array values properly inside deep paths', () => {
                const collection = new Collection({
                    items: [
                        { tags: { deep: ['a', 'b', 'c'] } },
                        { tags: { deep: ['b', 'c', 'd'] } },
                        { tags: { deep: ['c', 'd', 'e'] } },
                    ],
                });
                const expected = [
                    { id: 0, tags: { deep: ['a', 'b', 'c'] } },
                    { id: 1, tags: { deep: ['b', 'c', 'd'] } },
                ];
                expect(
                    collection.getAll({ filter: { 'tags.deep': 'b' } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({ filter: { 'tags.deep': 'f' } }),
                ).toEqual([]);
            });

            it('should filter array values properly with deep paths', () => {
                const collection = new Collection({
                    items: [
                        { tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
                        { tags: [{ name: 'b' }, { name: 'c' }, { name: 'd' }] },
                        { tags: [{ name: 'c' }, { name: 'd' }, { name: 'e' }] },
                    ],
                });
                const expected = [
                    {
                        id: 0,
                        tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
                    },
                    {
                        id: 1,
                        tags: [{ name: 'b' }, { name: 'c' }, { name: 'd' }],
                    },
                ];
                expect(
                    collection.getAll({ filter: { 'tags.name': 'b' } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({ filter: { 'tags.name': 'f' } }),
                ).toEqual([]);
            });

            it('should filter array values properly when receiving several values within deep paths', () => {
                const collection = new Collection({
                    items: [
                        { deep: { tags: ['a', 'b', 'c'] } },
                        { deep: { tags: ['b', 'c', 'd'] } },
                        { deep: { tags: ['c', 'd', 'e'] } },
                    ],
                });
                const expected = [{ id: 1, deep: { tags: ['b', 'c', 'd'] } }];
                expect(
                    collection.getAll({ filter: { 'deep.tags': ['b', 'd'] } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({
                        filter: { 'deep.tags': ['a', 'b', 'e'] },
                    }),
                ).toEqual([]);
            });

            it('should filter array values properly when receiving several values with deep paths', () => {
                const collection = new Collection({
                    items: [
                        { tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
                        { tags: [{ name: 'c' }, { name: 'd' }, { name: 'e' }] },
                        { tags: [{ name: 'e' }, { name: 'f' }, { name: 'g' }] },
                    ],
                });
                const expected = [
                    {
                        id: 0,
                        tags: [{ name: 'a' }, { name: 'b' }, { name: 'c' }],
                    },
                    {
                        id: 1,
                        tags: [{ name: 'c' }, { name: 'd' }, { name: 'e' }],
                    },
                ];
                expect(
                    collection.getAll({ filter: { 'tags.name': ['c'] } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({ filter: { 'tags.name': ['h', 'i'] } }),
                ).toEqual([]);
            });

            it('should filter array values properly when receiving several values', () => {
                const collection = new Collection({
                    items: [
                        { tags: ['a', 'b', 'c'] },
                        { tags: ['b', 'c', 'd'] },
                        { tags: ['c', 'd', 'e'] },
                    ],
                });
                const expected = [{ id: 1, tags: ['b', 'c', 'd'] }];
                expect(
                    collection.getAll({ filter: { tags: ['b', 'd'] } }),
                ).toEqual(expected);
                expect(
                    collection.getAll({ filter: { tags: ['a', 'b', 'e'] } }),
                ).toEqual([]);
            });

            it('should filter by the special q full-text filter', () => {
                const collection = new Collection({
                    items: [
                        { a: 'Hello', b: 'world' },
                        { a: 'helloworld', b: 'bunny' },
                        { a: 'foo', b: 'bar' },
                        { a: { b: 'bar' } },
                        { a: '', b: '' },
                        { a: null, b: null },
                        {},
                    ],
                });
                expect(collection.getAll({ filter: { q: 'hello' } })).toEqual([
                    { id: 0, a: 'Hello', b: 'world' },
                    { id: 1, a: 'helloworld', b: 'bunny' },
                ]);
                expect(collection.getAll({ filter: { q: 'bar' } })).toEqual([
                    { id: 2, a: 'foo', b: 'bar' },
                    { id: 3, a: { b: 'bar' } },
                ]);
                expect(
                    collection.getAll({ filter: { q: 'hello bar' } }),
                ).toEqual([
                    { id: 0, a: 'Hello', b: 'world' },
                    { id: 1, a: 'helloworld', b: 'bunny' },
                    { id: 2, a: 'foo', b: 'bar' },
                    { id: 3, a: { b: 'bar' } },
                ]);
            });

            it('should filter by range using _gte, _gt, _lte, and _lt', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(collection.getAll({ filter: { v_gte: 2 } })).toEqual([
                    { v: 2, id: 1 },
                    { v: 3, id: 2 },
                ]);
                expect(collection.getAll({ filter: { v_gt: 2 } })).toEqual([
                    { v: 3, id: 2 },
                ]);
                expect(collection.getAll({ filter: { v_gte: 4 } })).toEqual([]);
                expect(collection.getAll({ filter: { v_lte: 2 } })).toEqual([
                    { v: 1, id: 0 },
                    { v: 2, id: 1 },
                ]);
                expect(collection.getAll({ filter: { v_lt: 2 } })).toEqual([
                    { v: 1, id: 0 },
                ]);
                expect(collection.getAll({ filter: { v_lte: 0 } })).toEqual([]);
            });

            it('should filter by inequality using _neq', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(collection.getAll({ filter: { v_neq: 2 } })).toEqual([
                    { v: 1, id: 0 },
                    { v: 3, id: 2 },
                ]);
            });

            it('should filter by equality using _eq', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(collection.getAll({ filter: { v_eq: 2 } })).toEqual([
                    { v: 2, id: 1 },
                ]);
            });

            it('should filter using _eq_any', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(
                    collection.getAll({ filter: { v_eq_any: [1, 3] } }),
                ).toEqual([
                    { v: 1, id: 0 },
                    { v: 3, id: 2 },
                ]);
            });

            it('should filter using _neq_any', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(
                    collection.getAll({ filter: { v_neq_any: [1, 3] } }),
                ).toEqual([{ v: 2, id: 1 }]);
            });

            it('should filter using _inc_any', () => {
                const collection = new Collection({
                    items: [{ v: [1, 2] }, { v: [2, 4] }, { v: [3, 1] }],
                });
                expect(
                    collection.getAll({ filter: { v_inc_any: [1, 3] } }),
                ).toEqual([
                    { v: [1, 2], id: 0 },
                    { v: [3, 1], id: 2 },
                ]);
            });

            it('should filter using _ninc_any', () => {
                const collection = new Collection({
                    items: [{ v: [1, 2] }, { v: [2, 4] }, { v: [3, 1] }],
                });
                expect(
                    collection.getAll({ filter: { v_ninc_any: [1, 3] } }),
                ).toEqual([{ v: [2, 4], id: 1 }]);
            });

            it('should filter using _inc', () => {
                const collection = new Collection({
                    items: [{ v: [1, 2] }, { v: [2, 4] }, { v: [3, 1] }],
                });
                expect(
                    collection.getAll({ filter: { v_inc: [1, 3] } }),
                ).toEqual([{ v: [3, 1], id: 2 }]);
            });

            it('should filter by text search using _q', () => {
                const collection = new Collection({
                    items: [{ v: 'abCd' }, { v: 'cDef' }, { v: 'EFgh' }],
                });
                expect(collection.getAll({ filter: { v_q: 'cd' } })).toEqual([
                    { id: 0, v: 'abCd' },
                    { id: 1, v: 'cDef' },
                ]);
                expect(collection.getAll({ filter: { v_q: 'ef' } })).toEqual([
                    { id: 1, v: 'cDef' },
                    { id: 2, v: 'EFgh' },
                ]);
            });

            it('should filter by array', () => {
                const collection = new Collection({
                    items: [
                        { a: 'H' },
                        { a: 'e' },
                        { a: 'l' },
                        { a: 'l' },
                        { a: 'o' },
                    ],
                });
                expect(collection.getAll({ filter: { id: [] } })).toEqual([]);
                expect(
                    collection.getAll({ filter: { id: [1, 2, 3] } }),
                ).toEqual([
                    { id: 1, a: 'e' },
                    { id: 2, a: 'l' },
                    { id: 3, a: 'l' },
                ]);
                expect(
                    collection.getAll({ filter: { id: ['1', '2', '3'] } }),
                ).toEqual([
                    { id: 1, a: 'e' },
                    { id: 2, a: 'l' },
                    { id: 3, a: 'l' },
                ]);
            });

            it('should combine all filters with an AND logic', () => {
                const collection = new Collection({
                    items: [{ v: 1 }, { v: 2 }, { v: 3 }],
                });
                expect(
                    collection.getAll({ filter: { v_gte: 2, v_lte: 2 } }),
                ).toEqual([{ v: 2, id: 1 }]);
            });

            it('should not affect further requests', () => {
                const collection = new Collection({
                    items: [{ name: 'c' }, { name: 'a' }, { name: 'b' }],
                });
                function filter(item: CollectionItem) {
                    return item.name !== 'a';
                }
                collection.getAll({ filter: filter });
                const expected = [
                    { name: 'c', id: 0 },
                    { name: 'a', id: 1 },
                    { name: 'b', id: 2 },
                ];
                expect(collection.getAll()).toEqual(expected);
            });
        });

        describe('range query', () => {
            it('should throw an error if passed an unsupported range argument', () => {
                const collection = new Collection();
                expect(() => {
                    // @ts-expect-error
                    collection.getAll({ range: 23 });
                }).toThrow(new Error('Unsupported range type'));
            });

            const collection = new Collection({
                items: [
                    { id: 0, name: 'a' },
                    { id: 1, name: 'b' },
                    { id: 2, name: 'c' },
                    { id: 3, name: 'd' },
                    { id: 4, name: 'e' },
                ],
            });

            it('should return a range in the collection', () => {
                let expected: CollectionItem[];

                expected = [{ id: 0, name: 'a' }];
                expect(collection.getAll({ range: [0, 0] })).toEqual(expected);

                expected = [
                    { id: 1, name: 'b' },
                    { id: 2, name: 'c' },
                    { id: 3, name: 'd' },
                    { id: 4, name: 'e' },
                ];
                expect(collection.getAll({ range: [1] })).toEqual(expected);

                expected = [
                    { id: 2, name: 'c' },
                    { id: 3, name: 'd' },
                ];
                expect(collection.getAll({ range: [2, 3] })).toEqual(expected);
            });

            it('should not affect further requests', () => {
                const collection = new Collection({
                    items: [
                        { id: 0, name: 'a' },
                        { id: 1, name: 'b' },
                        { id: 2, name: 'c' },
                    ],
                });
                collection.getAll({ range: [1] });
                const expected = [
                    { id: 0, name: 'a' },
                    { id: 1, name: 'b' },
                    { id: 2, name: 'c' },
                ];
                expect(collection.getAll()).toEqual(expected);
            });
        });

        describe('embed query', () => {
            it('should throw an error when trying to embed a non-existing collection', () => {
                const foos = new Collection({
                    items: [{ name: 'John', bar_id: 123 }],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                expect(() => {
                    foos.getAll({ embed: ['bar'] });
                }).toThrow(
                    new Error("Can't embed a non-existing collection bar"),
                );
            });

            it('should return the original object for missing embed one', () => {
                const foos = new Collection({
                    items: [{ name: 'John', bar_id: 123 }],
                });
                const bars = new Collection({ items: [] });
                const database = new Database();
                database.addCollection('foos', foos);
                database.addCollection('bars', bars);
                const expected = [{ id: 0, name: 'John', bar_id: 123 }];
                expect(foos.getAll({ embed: ['bar'] })).toEqual(expected);
            });

            it('should return the object with the reference object for embed one', () => {
                const foos = new Collection({
                    items: [
                        { name: 'John', bar_id: 123 },
                        { name: 'Jane', bar_id: 456 },
                    ],
                });
                const bars = new Collection({
                    items: [
                        { id: 1, bar: 'nobody wants me' },
                        { id: 123, bar: 'baz' },
                        { id: 456, bar: 'bazz' },
                    ],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                database.addCollection('bars', bars);
                const expected = [
                    {
                        id: 0,
                        name: 'John',
                        bar_id: 123,
                        bar: { id: 123, bar: 'baz' },
                    },
                    {
                        id: 1,
                        name: 'Jane',
                        bar_id: 456,
                        bar: { id: 456, bar: 'bazz' },
                    },
                ];
                expect(foos.getAll({ embed: ['bar'] })).toEqual(expected);
            });

            it('should throw an error when trying to embed many a non-existing collection', () => {
                const foos = new Collection({
                    items: [{ name: 'John', bar_id: 123 }],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                expect(() => {
                    foos.getAll({ embed: ['bars'] });
                }).toThrow(
                    new Error("Can't embed a non-existing collection bars"),
                );
            });

            it('should return the object with an empty array for missing embed many', () => {
                const foos = new Collection({
                    items: [{ name: 'John', bar_id: 123 }],
                });
                const bars = new Collection({
                    items: [{ id: 1, bar: 'nobody wants me' }],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                database.addCollection('bars', bars);
                const expected = [{ id: 1, bar: 'nobody wants me', foos: [] }];
                expect(bars.getAll({ embed: ['foos'] })).toEqual(expected);
            });

            it('should return the object with an array of references for embed many', () => {
                const foos = new Collection({
                    items: [
                        { id: 1, name: 'John', bar_id: 123 },
                        { id: 2, name: 'Jane', bar_id: 456 },
                        { id: 3, name: 'Jules', bar_id: 456 },
                    ],
                });
                const bars = new Collection({
                    items: [
                        { id: 1, bar: 'nobody wants me' },
                        { id: 123, bar: 'baz' },
                        { id: 456, bar: 'bazz' },
                    ],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                database.addCollection('bars', bars);
                const expected = [
                    { id: 1, bar: 'nobody wants me', foos: [] },
                    {
                        id: 123,
                        bar: 'baz',
                        foos: [{ id: 1, name: 'John', bar_id: 123 }],
                    },
                    {
                        id: 456,
                        bar: 'bazz',
                        foos: [
                            { id: 2, name: 'Jane', bar_id: 456 },
                            { id: 3, name: 'Jules', bar_id: 456 },
                        ],
                    },
                ];
                expect(bars.getAll({ embed: ['foos'] })).toEqual(expected);
            });

            it('should return the object with an array of references for embed many using inner array', () => {
                const foos = new Collection({
                    items: [
                        { id: 1, name: 'John' },
                        { id: 2, name: 'Jane' },
                        { id: 3, name: 'Jules' },
                    ],
                });
                const bars = new Collection({
                    items: [
                        { id: 1, bar: 'nobody wants me' },
                        { id: 123, bar: 'baz', foos: [1] },
                        { id: 456, bar: 'bazz', foos: [2, 3] },
                    ],
                });
                const database = new Database();
                database.addCollection('foos', foos);
                database.addCollection('bars', bars);
                const expected = [
                    { id: 1, bar: 'nobody wants me', foos: [] },
                    { id: 123, bar: 'baz', foos: [{ id: 1, name: 'John' }] },
                    {
                        id: 456,
                        bar: 'bazz',
                        foos: [
                            { id: 2, name: 'Jane' },
                            { id: 3, name: 'Jules' },
                        ],
                    },
                ];
                expect(bars.getAll({ embed: ['foos'] })).toEqual(expected);
            });

            it('should allow multiple embeds', () => {
                const books = new Collection({
                    items: [
                        { id: 1, title: 'Pride and Prejudice', author_id: 1 },
                        { id: 2, title: 'Sense and Sensibility', author_id: 1 },
                        { id: 3, title: 'War and Preace', author_id: 2 },
                    ],
                });
                const authors = new Collection({
                    items: [
                        {
                            id: 1,
                            firstName: 'Jane',
                            lastName: 'Austen',
                            country_id: 1,
                        },
                        {
                            id: 2,
                            firstName: 'Leo',
                            lastName: 'Tosltoi',
                            country_id: 2,
                        },
                    ],
                });
                const countries = new Collection({
                    items: [
                        { id: 1, name: 'England' },
                        { id: 2, name: 'Russia' },
                    ],
                });
                const database = new Database();
                database.addCollection('books', books);
                database.addCollection('authors', authors);
                database.addCollection('countrys', countries); // nevermind the plural
                const expected = [
                    {
                        id: 1,
                        firstName: 'Jane',
                        lastName: 'Austen',
                        country_id: 1,
                        books: [
                            {
                                id: 1,
                                title: 'Pride and Prejudice',
                                author_id: 1,
                            },
                            {
                                id: 2,
                                title: 'Sense and Sensibility',
                                author_id: 1,
                            },
                        ],
                        country: { id: 1, name: 'England' },
                    },
                    {
                        id: 2,
                        firstName: 'Leo',
                        lastName: 'Tosltoi',
                        country_id: 2,
                        books: [
                            { id: 3, title: 'War and Preace', author_id: 2 },
                        ],
                        country: { id: 2, name: 'Russia' },
                    },
                ];
                expect(authors.getAll({ embed: ['books', 'country'] })).toEqual(
                    expected,
                );
            });
        });

        describe('composite query', () => {
            it('should execute all commands of the query object', () => {
                const collection = new Collection({
                    items: [
                        { id: 0, name: 'c', arg: false },
                        { id: 1, name: 'b', arg: true },
                        { id: 2, name: 'a', arg: true },
                    ],
                });
                const query = {
                    filter: { arg: true },
                    sort: 'name',
                };
                const expected = [
                    { id: 2, name: 'a', arg: true },
                    { id: 1, name: 'b', arg: true },
                ];
                expect(collection.getAll(query)).toEqual(expected);
            });
        });
    });

    describe('getOne', () => {
        it('should throw an exception when trying to get a non-existing item', () => {
            const collection = new Collection();
            expect(() => {
                collection.getOne(0);
            }).toThrow(new Error('No item with identifier 0'));
        });

        it('should return the first collection matching the identifier', () => {
            const collection = new Collection({
                items: [
                    { id: 1, name: 'foo' },
                    { id: 2, name: 'bar' },
                ],
            });
            expect(collection.getOne(1)).toEqual({ id: 1, name: 'foo' });
            expect(collection.getOne(2)).toEqual({ id: 2, name: 'bar' });
        });

        it('should use the identifierName', () => {
            const collection = new Collection({
                items: [
                    { _id: 1, name: 'foo' },
                    { _id: 2, name: 'bar' },
                ],
                identifierName: '_id',
            });
            expect(collection.getOne(1)).toEqual({ _id: 1, name: 'foo' });
            expect(collection.getOne(2)).toEqual({ _id: 2, name: 'bar' });
        });
    });

    describe('addOne', () => {
        it('should return the item inserted', () => {
            const collection = new Collection();
            const r = collection.addOne({ name: 'foo' });
            expect(r.name).toEqual('foo');
        });

        it('should add the item', () => {
            const collection = new Collection();
            collection.addOne({ name: 'foo' });
            expect(collection.getOne(0)).toEqual({ id: 0, name: 'foo' });
        });

        it('should incement the sequence at each insertion', () => {
            const collection = new Collection();
            expect(collection.sequence).toEqual(0);
            collection.addOne({ name: 'foo' });
            expect(collection.sequence).toEqual(1);
            collection.addOne({ name: 'foo' });
            expect(collection.sequence).toEqual(2);
        });

        it('should set identifier if not provided', () => {
            const collection = new Collection();
            const r1 = collection.addOne({ name: 'foo' });
            expect(r1.id).toEqual(0);
            const r2 = collection.addOne({ name: 'bar' });
            expect(r2.id).toEqual(1);
        });

        it('should refuse insertion with existing identifier', () => {
            const collection = new Collection<CollectionItem>({
                items: [{ name: 'foo' }],
            });
            expect(() => {
                collection.addOne({ id: 0, name: 'bar' });
            }).toThrow(
                new Error('An item with the identifier 0 already exists'),
            );
        });

        it('should accept insertion with non-existing identifier and move sequence accordingly', () => {
            const collection = new Collection();
            collection.addOne({ name: 'foo' });
            collection.addOne({ id: 12, name: 'bar' });
            expect(collection.sequence).toEqual(13);
            const r = collection.addOne({ name: 'bar' });
            expect(r.id).toEqual(13);
        });
    });

    describe('updateOne', () => {
        it('should throw an exception when trying to update a non-existing item', () => {
            const collection = new Collection();
            expect(() => {
                collection.updateOne(0, { id: 0, name: 'bar' });
            }).toThrow(new Error('No item with identifier 0'));
        });

        it('should return the updated item', () => {
            const collection = new Collection<CollectionItem>({
                items: [{ name: 'foo' }],
            });
            expect(collection.updateOne(0, { id: 0, name: 'bar' })).toEqual({
                id: 0,
                name: 'bar',
            });
        });

        it('should update the item', () => {
            const collection = new Collection<CollectionItem>({
                items: [{ name: 'foo' }, { name: 'baz' }],
            });
            collection.updateOne(0, { id: 0, name: 'bar' });
            expect(collection.getOne(0)).toEqual({ id: 0, name: 'bar' });
            expect(collection.getOne(1)).toEqual({ id: 1, name: 'baz' });
        });

        it('should update the original item', () => {
            const items = [{ name: 'foo' }, { name: 'baz' }];
            const collection = new Collection<CollectionItem>({
                items,
            });
            collection.updateOne(0, { id: 0, name: 'bar' });
            expect(collection.getOne(0)).toEqual({ id: 0, name: 'bar' });
            expect(collection.getOne(1)).toEqual({ id: 1, name: 'baz' });
            expect(items[0]).toEqual({ name: 'foo' });
            expect(items[1]).toEqual({ name: 'baz' });
        });
    });

    describe('removeOne', () => {
        it('should throw an exception when trying to remove a non-existing item', () => {
            const collection = new Collection();
            expect(() => {
                collection.removeOne(0);
            }).toThrow(new Error('No item with identifier 0'));
        });

        it('should remove the item', () => {
            const collection = new Collection();
            const item = collection.addOne({ name: 'foo' });
            collection.removeOne(item.id);
            expect(collection.getAll()).toEqual([]);
        });

        it('should return the removed item', () => {
            const collection = new Collection();
            const item = collection.addOne({});
            const r = collection.removeOne(item.id);
            expect(r).toEqual(item);
        });

        it('should decrement the sequence only if the removed item is the last', () => {
            const collection = new Collection<CollectionItem>({
                items: [{ id: 0 }, { id: 1 }, { id: 2 }],
            });
            expect(collection.sequence).toEqual(3);
            collection.removeOne(2);
            expect(collection.sequence).toEqual(2);
            collection.removeOne(0);
            expect(collection.sequence).toEqual(2);
            const r = collection.addOne({});
            expect(r.id).toEqual(2);
        });
    });

    describe('custom identifier generation', () => {
        test('should use the custom identifier provided at initialization', () => {
            const collection = new Collection({
                items: [
                    {
                        id: '6090eb22-e140-4720-b7b2-e1416a3d2447',
                        name: 'foo',
                    },
                    {
                        id: 'fb1c2ce1-5df7-4af8-be1c-7af234b67f7d',
                        name: 'baz',
                    },
                ],
                identifierName: 'id',
            });

            expect(
                collection.getOne('6090eb22-e140-4720-b7b2-e1416a3d2447'),
            ).toEqual({
                id: '6090eb22-e140-4720-b7b2-e1416a3d2447',
                name: 'foo',
            });
        });

        test('should use the custom identifier provided at insertion', () => {
            const collection = new Collection<CollectionItem>({
                items: [],
                identifierName: 'id',
            });

            const item = collection.addOne({
                id: '6090eb22-e140-4720-b7b2-e1416a3d2447',
                name: 'foo',
            });

            expect(item.id).toEqual('6090eb22-e140-4720-b7b2-e1416a3d2447');
        });

        test('should use the custom identifier generation function at insertion', () => {
            const collection = new Collection<CollectionItem>({
                items: [],
                identifierName: 'id',
                getNewId: () => '6090eb22-e140-4720-b7b2-e1416a3d2447',
            });

            const item = collection.addOne({
                name: 'foo',
            });

            expect(item.id).toEqual('6090eb22-e140-4720-b7b2-e1416a3d2447');
        });
    });
});
