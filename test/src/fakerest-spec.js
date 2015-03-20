/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var httpBackend,
        http,
        resource,
        q;

    describe('fakerest', function() {

        describe('setResource', function() {
            it('should set a resource', function() {
                var fakerest = new FakeRest();
                fakerest.setResource('foo', [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]);
                expect(fakerest.resources).toEqual({
                    'foo': [{id: 1, name: 'foo'}, {id: 2, name: 'bar'}]
                });
            });            
        })

    });
})();
