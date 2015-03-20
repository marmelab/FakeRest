/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Collection = FakeRest.getClass('Collection');
    
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

        describe('getAll', function() {
            it('should return an array', function() {
                expect(new Collection().getAll()).toEqual([]);
            });

            it('should return all collections', function() {
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(collection.getAll()).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
            });

            describe('sort option', function() {

                it('should sort by sort function option', function() {
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

                it('should sort by sort name option', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [{ name : 'a', id : 1 }, { name : 'b', id : 2 }, { name : 'c', id : 0 }]
                    expect(collection.getAll({sort: 'name'})).toEqual(expected)
                });

                it('should sort by sort name and direction option', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected
                    expected = [{ name : 'a', id : 1 }, { name : 'b', id : 2 }, { name : 'c', id : 0 }]
                    expect(collection.getAll({sort: ['name', 'asc']})).toEqual(expected)
                    expected = [{ name : 'c', id : 0 }, { name : 'b', id : 2 }, { name : 'a', id : 1 }]
                    expect(collection.getAll({sort: ['name', 'desc']})).toEqual(expected)
                });

                it('should not affect the sort of further requests', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    collection.getAll({sort: 'name'});
                    var expected  = [ { name : 'c', id : 0 }, { name : 'a', id : 1 }, { name : 'b', id : 2 } ];
                    expect(collection.getAll()).toEqual(expected)
                });
            });

            describe('filter option', function() {

                it('should filter by filter function option', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [ { name : 'c', id : 0 }, { name : 'b', id : 2 } ];
                    function filter(item) {
                      return item.name !== 'a';
                    }
                    expect(collection.getAll({filter: filter})).toEqual(expected)
                });

                it('should filter by filter object option', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    var expected = [{ name : 'b', id : 2 } ];
                    expect(collection.getAll({filter: { name: 'b'} })).toEqual(expected)
                });

                it('should not affect the filter of further requests', function() {
                    var collection = new Collection([{name: 'c'}, {name: 'a'}, {name: 'b'}]);
                    function filter(item) {
                      return item.name !== 'a';
                    }
                    collection.getAll({filter: filter});
                    var expected  = [ { name : 'c', id : 0 }, { name : 'a', id : 1 }, { name : 'b', id : 2 } ];
                    expect(collection.getAll()).toEqual(expected)
                });

            })

        });

        describe('getOne', function() {
            it('should return undefined when no collection match the identifier', function() {
                expect(new Collection().getOne(12)).toBe(undefined);
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
                expect(collection.sequence).toEqual(12);
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
                expect(collection.getOne(item.id)).toBe(undefined);
            });

            it('should return the removed item', function() {
                var collection = new Collection();
                var item = collection.addOne({name: 'foo'});
                var r = collection.removeOne(item.id);
                expect(r).toEqual(item);
            });

            it('should decrement the sequence only if the removed item is the last', function() {
                var collection = new Collection([{id: 0}, {id: 1}, {id: 2}]);
                expect(collection.sequence).toEqual(2);
                collection.removeOne(2);
                expect(collection.sequence).toEqual(1);
                collection.removeOne(0);
                expect(collection.sequence).toEqual(1);
                collection.addOne({})
            });

        })
    });
})();
