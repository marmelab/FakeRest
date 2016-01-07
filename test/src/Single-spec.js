/*global describe,it,expect,beforeEach,jasmine*/

(function() {
    'use strict';

    var Single = FakeRest.Single;
    var Collection = FakeRest.Collection;
    var Server = FakeRest.Server;

    describe('Single', function () {
        
      describe('constructor', function() {
          it('should set the intial set of data', function () {
              var single = new Single({foo: 'bar'});
              expect(single.getOnly()).toEqual({foo: 'bar'});
          });
      });

      describe('getOnly', function () {
          it('should return the passed in object', function () {
              var single = new Single({foo: 'bar'});
              expect(single.getOnly()).toEqual({foo: 'bar'});
          });

          describe('embed query', function() {
              it('should throw an error when trying to embed a non-existing collection', function() {
                  var foo = new Single({name: 'foo', bar_id: 123});
                  var server = new Server();
                  server.addSingle('foo', foo);
                  expect(function() { foo.getOnly({embed: ['bar']}); }).toThrow(
                      new Error('Can\'t embed a non-existing collection bar'));
              });

              it('should return the original object for misisng embed one', function () {
                  var foo = new Single({name: 'foo', bar_id: 123});
                  var bars = new Collection([]);
                  var server = new Server();
                  server.addSingle('foo', foo);
                  server.addCollection('bars', bars);
                  var expected = {name: 'foo', bar_id: 123};
                  expect(foo.getOnly({embed: ['bar']})).toEqual(expected);
              });

              it('should return the object with the reference object for embed one', function() {
                  var foo = new Single({name: 'foo', bar_id: 123});
                  var bars = new Collection([
                      {id: 1, bar: 'nobody wants me'},
                      {id: 123, bar: 'baz'},
                      {id: 456, bar: 'bazz'}
                  ]);
                  var server = new Server();
                  server.addSingle('foo', foo);
                  server.addCollection('bars', bars);
                  var expected = {name: 'foo', bar_id: 123, bar: {id: 123, bar: 'baz'}};
                  expect(foo.getOnly({embed: ['bar']})).toEqual(expected);
              });

              it('should throw an error when trying to embed many a non-existing collection', function () {
                  var foo = new Single({name: 'foo', bar_id: 123});
                  var server = new Server();
                  server.addSingle('foo', foo);
                  expect(function() { foo.getOnly({embed: ['bars']}); }).toThrow(
                      new Error('Can\'t embed a non-existing collection bars'));
              });

              it('should return the object with an array of references for embed many using inner array', function() {
                  var foo = new Single({name: 'foo', bars: [1, 3]});
                  var bars = new Collection([
                      {id: 1, bar: 'baz'},
                      {id: 2, bar: 'biz'},
                      {id: 3, bar: 'boz'},
                  ]);
                  var server = new Server();
                  server.addSingle('foo', foo);
                  server.addCollection('bars', bars);
                  var expected = {name: 'foo', bars: [
                      {id: 1, bar: 'baz'},
                      {id: 3, bar: 'boz'},
                  ]};
                  expect(foo.getOnly({embed: ['bars']})).toEqual(expected);
              });

              it('should allow multiple embeds', function() {
                  var foo = new Single({name: 'foo', bars: [1, 3], bazs: [4, 5]});
                  var bars = new Collection([
                      {id: 1, name: 'bar1'},
                      {id: 2, name: 'bar2'},
                      {id: 3, name: 'bar3'},
                  ]);
                  var bazs = new Collection([
                      {id: 4, name: 'baz1'},
                      {id: 5, name: 'baz2'},
                      {id: 6, name: 'baz3'},
                  ]);
                  var server = new Server();
                  server.addSingle('foo', foo);
                  server.addCollection('bars', bars);
                  server.addCollection('bazs', bazs);
                  var expected = {
                    name: 'foo',
                    bars: [
                      {id: 1, name: 'bar1'},
                      {id: 3, name: 'bar3'},
                    ],
                    bazs: [
                      {id: 4, name: 'baz1'},
                      {id: 5, name: 'baz2'},
                    ],
                  };
                  expect(foo.getOnly({embed: ['bars', 'bazs']})).toEqual(expected);
              });
          });
      });

      describe('updateOnly', function() {
          it('should return the updated item', function() {
              var single = new Single({name: 'foo'});
              expect(single.updateOnly({name: 'bar'})).toEqual({name: 'bar'});
          });

          it('should update the item', function() {
              var single = new Single({name: 'foo'});
              single.updateOnly({name: 'bar'});
              expect(single.getOnly()).toEqual({name: 'bar'});
          });
      });
    });
})();
