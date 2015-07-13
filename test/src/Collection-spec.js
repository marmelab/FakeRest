/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Collection = FakeRest.Collection;
    
    describe('Collection', function() {

        describe('constructor', function() {

            it('should set the initial set of data', function() {
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(collection.getAll()).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
            });            

            it('should set identifier name to id by default', function() {
                var collection = new Collection();
                expect(collection.identifierName).toEqual('id');
            });            
        })

        describe('getCount', function() {

            it('should return an integer', function() {
                expect(new Collection().getCount()).toEqual(0);
            });

            it('should return the collection size', function() {
                expect(new Collection([{}, {}]).getCount()).toEqual(2);
            });

            it('should return the correct collection size, even when items were removed', function() {
                var collection = new Collection([{}, {}, {}]);
                collection.removeOne(1);
                expect(collection.getCount()).toEqual(2);
            });

            it('should accept a query object', function() {
                var collection = new Collection([{}, {name: 'a'}, {name:'b'}]);
                function filter(item) {
                    return item.name == 'a' || item.name == 'b';
                }
                expect(collection.getCount({filter: filter})).toEqual(2);
            });
        });

        describe('getAll', function() {

            it('should return an array', function() {
                expect(new Collection().getAll()).toEqual([]);
            });

            it('should return all collections', function() {
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(collection.getAll()).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
            });

            describe('sort query', function() {

                it('should throw an error if passed an unsupported sort argument', function() {
                    var collection = new Collection();
                    expect(function() { collection.getAll({sort: 23}) }).toThrow(new Error('Unsupported sort type'));
                });

                it('should sort by sort function', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [{ name : 'a', id : 1 }, { name : 'b', id : 2 }, { name : 'c', id : 0 }]
                    function sort(a, b) {
                      if (a.name > b.name) {
                        return 1;
                      }
                      if (a.name < b.name) {
                        return -1;
                      }
                      // a must be equal to b
                      return 0;
                    }
                    expect(collection.getAll({sort: sort})).toEqual(expected)
                });

                it('should sort by sort name', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [{ name : 'a', id : 1 }, { name : 'b', id : 2 }, { name : 'c', id : 0 }]
                    expect(collection.getAll({sort: 'name'})).toEqual(expected)
                });

                it('should sort by sort name and direction', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected
                    expected = [{ name : 'a', id : 1 }, { name : 'b', id : 2 }, { name : 'c', id : 0 }]
                    expect(collection.getAll({sort: ['name', 'asc']})).toEqual(expected)
                    expected = [{ name : 'c', id : 0 }, { name : 'b', id : 2 }, { name : 'a', id : 1 }]
                    expect(collection.getAll({sort: ['name', 'desc']})).toEqual(expected)
                });

                it('should not affect further requests', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    collection.getAll({sort: 'name'});
                    var expected  = [ { name : 'c', id : 0 }, { name : 'a', id : 1 }, { name : 'b', id : 2 } ];
                    expect(collection.getAll()).toEqual(expected)
                });
            });

            describe('filter query', function() {

                it('should throw an error if passed an unsupported filter argument', function() {
                    var collection = new Collection();
                    expect(function() { collection.getAll({filter: 23}) }).toThrow(new Error('Unsupported filter type'));
                });

                it('should filter by filter function', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [ { name : 'c', id : 0 }, { name : 'b', id : 2 } ];
                    function filter(item) {
                      return item.name !== 'a';
                    }
                    expect(collection.getAll({filter: filter})).toEqual(expected)
                });

                it('should filter by filter object', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [{ name : 'b', id : 2 } ];
                    expect(collection.getAll({filter: { name: 'b'} })).toEqual(expected)
                });

                it('should filter by the special q full-text filter', function() {
                    var collection = new Collection([
                        { a: 'hello', b: 'world' },
                        { a: 'helloworld', b: 'bunny'},
                        { a: 'foo', b: 'bar'},
                        { a: '', b: '' },
                        {}
                    ]);
                    expect(collection.getAll({filter: { q: 'hello'} })).toEqual([ { id: 0, a: 'hello', b: 'world' }, { id: 1, a: 'helloworld', b: 'bunny'} ])
                    expect(collection.getAll({filter: { q: 'bar'} })).toEqual([{ id: 2, a: 'foo', b: 'bar'}])
                })

                it('should not affect further requests', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    function filter(item) {
                      return item.name !== 'a';
                    }
                    collection.getAll({filter: filter});
                    var expected  = [ { name : 'c', id : 0 }, { name : 'a', id : 1 }, { name : 'b', id : 2 } ];
                    expect(collection.getAll()).toEqual(expected)
                });
            });

            describe('range query', function() {

                it('should throw an error if passed an unsupported range argument', function() {
                    var collection = new Collection();
                    expect(function() { collection.getAll({range: 23}) }).toThrow(new Error('Unsupported range type'));
                });

                var collection = new Collection([{id: 0, name: 'a'}, {id: 1, name: 'b'}, {id: 2, name: 'c'}, {id: 3, name: 'd'}, {id: 4, name: 'e'} ]);

                it('should return a range in the collection', function() {
                    var expected;

                    expected = [ {id: 0, name: 'a'} ];
                    expect(collection.getAll({ range: [0, 0] })).toEqual(expected);

                    expected = [ {id: 1, name: 'b'}, {id: 2, name: 'c'}, {id: 3, name: 'd'}, {id: 4, name: 'e'} ];
                    expect(collection.getAll({ range: [1] })).toEqual(expected);

                    expected = [ {id: 2, name: 'c'}, {id: 3, name: 'd'} ];
                    expect(collection.getAll({ range: [2, 3] })).toEqual(expected);
                });

                it('should not affect further requests', function() {
                    var collection = new Collection([{id: 0, name: 'a'}, {id: 1, name: 'b'}, {id: 2, name: 'c'}]);
                    collection.getAll({range: [1]});
                    var expected  = [ {id: 0, name: 'a'}, {id: 1, name: 'b'}, {id: 2, name: 'c'} ];
                    expect(collection.getAll()).toEqual(expected)
                });
            });

            describe('composite query', function() {

                it('should execute all commands of the query object', function() {
                    var collection = new Collection([
                        {id: 0, name: 'c', arg: false },
                        {id: 1, name: 'b', arg: true },
                        {id: 2, name: 'a', arg: true}
                    ]);
                    var query = {
                        filter: { arg: true },
                        sort: 'name'
                    };
                    var expected = [
                        {id: 2, name: 'a', arg: true},
                        {id: 1, name: 'b', arg: true }
                    ];
                    expect(collection.getAll(query)).toEqual(expected);
                });
            })

        });

        describe('getOne', function() {

            it('should throw an exception when trying to get a non-existing item', function() {
                var collection = new Collection();
                expect(function() { collection.getOne(0) }).toThrow(new Error('No item with identifier 0'));
            });

            it('should return the first collection matching the identifier', function() {
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(collection.getOne(1)).toEqual({id: 1, name: 'foo'});
                expect(collection.getOne(2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var collection = new Collection([{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id');
                expect(collection.getOne(1)).toEqual({_id: 1, name: 'foo'});
                expect(collection.getOne(2)).toEqual({_id: 2, name: 'bar'});
            });
        });

        describe('addOne', function() {

            it('should return the item inserted', function() {
                var collection = new Collection();
                var r = collection.addOne({name: 'foo'});
                expect(r.name).toEqual('foo');
            });

            it('should add the item', function() {
                var collection = new Collection();
                collection.addOne({name: 'foo'});
                expect(collection.getOne(0)).toEqual({id: 0, name: 'foo'});
            });

            it('should incement the sequence at each insertion', function() {
                var collection = new Collection();
                expect(collection.sequence).toEqual(0)
                collection.addOne({name: 'foo'});
                expect(collection.sequence).toEqual(1)
                collection.addOne({name: 'foo'});
                expect(collection.sequence).toEqual(2)
            });

            it('should set identifier if not provided', function() {
                var collection = new Collection();
                var r1 = collection.addOne({name: 'foo'});
                expect(r1.id).toEqual(0);
                var r2 = collection.addOne({name: 'bar'});
                expect(r2.id).toEqual(1);
            });

            it('should refuse insertion with existing identifier', function() {
                var collection = new Collection([{name: 'foo'}]);
                expect(function() { collection.addOne({id: 0, name: 'bar'}) }).toThrow(new Error('An item with the identifier 0 already exists'));
            });

            it('should accept insertion with non-existing identifier and move sequence accordingly', function() {
                var collection = new Collection();
                collection.addOne({name: 'foo'});
                collection.addOne({id: 12, name: 'bar'});
                expect(collection.sequence).toEqual(13);
                var r = collection.addOne({name: 'bar'});
                expect(r.id).toEqual(13);
            });
        });

        describe('updateOne', function() {

            it('should throw an exception when trying to update a non-existing item', function() {
                var collection = new Collection();
                expect(function() { collection.updateOne(0, {id: 0, name: 'bar'}) }).toThrow(new Error('No item with identifier 0'));
            });

            it('should return the updated item', function() {
                var collection = new Collection([{name: 'foo'}]);
                expect(collection.updateOne(0, {id: 0, name: 'bar'})).toEqual({id: 0, name: 'bar'});
            });

            it('should update the item', function() {
                var collection = new Collection([{name: 'foo'}, {name: 'baz'}]);
                collection.updateOne(0, {id: 0, name: 'bar'});
                expect(collection.getOne(0)).toEqual({id: 0, name: 'bar'});
                expect(collection.getOne(1)).toEqual({id: 1, name: 'baz'});
            });
        });

        describe('removeOne', function() {

            it('should throw an exception when trying to remove a non-existing item', function() {
                var collection = new Collection();
                expect(function() { collection.removeOne(0) }).toThrow(new Error('No item with identifier 0'));
            });

            it('should remove the item', function() {
                var collection = new Collection();
                var item = collection.addOne({name: 'foo'});
                collection.removeOne(item.id);
                expect(collection.getAll()).toEqual([]);
            });

            it('should return the removed item', function() {
                var collection = new Collection();
                var item = collection.addOne({});
                var r = collection.removeOne(item.id);
                expect(r).toEqual(item);
            });

            it('should decrement the sequence only if the removed item is the last', function() {
                var collection = new Collection([{id: 0}, {id: 1}, {id: 2}]);
                expect(collection.sequence).toEqual(3);
                collection.removeOne(2);
                expect(collection.sequence).toEqual(2);
                collection.removeOne(0);
                expect(collection.sequence).toEqual(2);
                var r = collection.addOne({});
                expect(r.id).toEqual(2);
            });
        })
    });
})();
