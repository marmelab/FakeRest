/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Repository = FakeRest.getClass('Repository');
    var Collection = FakeRest.getClass('Collection');

    describe('Repository', function() {

        describe('addCollection', function() {

            it('should add a collection and index it by name', function() {
                var repository = new Repository();
                var collection = new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}])
                repository.addCollection('foo', collection);
                var collection = repository.getCollection('foo');
                expect(collection).toEqual(collection);
            });            
        })

        describe('getAll', function() {

            it('should throw an error for unknown collections', function() {
                var repository = new Repository();
                expect(function() { repository.getAll('foo') }).toThrow(new Error('Unknown collection "foo"'));
            });

            it('should return all items for a given name', function() {
                var repository = new Repository();
                repository.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                repository.addCollection('baz', new Collection([{id: 1, name: 'baz'}]));
                expect(repository.getAll('foo')).toEqual([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(repository.getAll('baz')).toEqual([{id: 1, name: 'baz'}]);
            });

            it('should support a query', function() {
                var repository = new Repository();
                repository.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                expect(repository.getAll('foo', {filter: {name: 'foo'}})).toEqual([{id: 1, name: 'foo'}]);
            });
        });

        describe('getOne', function() {
            it('should throw an error for unknown collections', function() {
                var repository = new Repository();
                expect(function() { repository.getOne('foo', 1) }).toThrow(new Error('Unknown collection "foo"'));
            });

            it('should return undefined when no collection match the identifier', function() {
                var repository = new Repository();
                repository.addCollection('foo', new Collection([{id: 1, name: 'foo'}]));
                expect(repository.getOne('foo', 2)).toBe(undefined);
            });

            it('should return the first collection matching the identifier', function() {
                var repository = new Repository();
                repository.addCollection('foo', new Collection([{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]));
                expect(repository.getOne('foo', 1)).toEqual({id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({id: 2, name: 'bar'});
            });

            it('should use the identifierName', function() {
                var repository = new Repository();
                repository.addCollection('foo', new Collection([{_id: 1, name: 'foo'}, {_id: 2, name: 'bar'}], '_id'));
                expect(repository.getOne('foo', 1)).toEqual({_id: 1, name: 'foo'});
                expect(repository.getOne('foo', 2)).toEqual({_id: 2, name: 'bar'});
            });

        });

    });
})();
