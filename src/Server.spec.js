import sinon from "sinon";

import { Server } from "./Server";
import { Single } from "./Single";
import { Collection } from "./Collection";

function getFakeXMLHTTPRequest(method, url, data) {
  const xhr = sinon.useFakeXMLHttpRequest();
  let request;
  xhr.onCreate = function (xhr) {
    request = xhr;
  };
  const myRequest = new XMLHttpRequest();
  myRequest.open(method, url, false);
  myRequest.send(data);
  xhr.restore();
  return request;
}

describe("Server", () => {
  describe("init", () => {
    it("should populate several collections", () => {
      const server = new Server();
      server.init({
        foo: [{ a: 1 }, { a: 2 }, { a: 3 }],
        bar: [{ b: true }, { b: false }],
        baz: { name: "baz" },
      });
      expect(server.getAll("foo")).toEqual([
        { id: 0, a: 1 },
        { id: 1, a: 2 },
        { id: 2, a: 3 },
      ]);
      expect(server.getAll("bar")).toEqual([
        { id: 0, b: true },
        { id: 1, b: false },
      ]);
      expect(server.getOnly("baz")).toEqual({ name: "baz" });
    });
  });

  describe("addCollection", () => {
    it("should add a collection and index it by name", () => {
      const server = new Server();
      const collection = new Collection([
        { id: 1, name: "foo" },
        { id: 2, name: "bar" },
      ]);
      server.addCollection("foo", collection);
      const newcollection = server.getCollection("foo");
      expect(newcollection).toEqual(collection);
    });
  });

  describe("addSingle", () => {
    it("should add a single object and index it by name", () => {
      const server = new Server();
      const single = new Single({ name: "foo", description: "bar" });
      server.addSingle("foo", single);
      expect(server.getSingle("foo")).toEqual(single);
    });
  });

  describe("getAll", () => {
    it("should return all items for a given name", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      server.addCollection("baz", new Collection([{ id: 1, name: "baz" }]));
      expect(server.getAll("foo")).toEqual([
        { id: 1, name: "foo" },
        { id: 2, name: "bar" },
      ]);
      expect(server.getAll("baz")).toEqual([{ id: 1, name: "baz" }]);
    });

    it("should support a query", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 0, name: "c", arg: false },
          { id: 1, name: "b", arg: true },
          { id: 2, name: "a", arg: true },
        ])
      );
      const params = { filter: { arg: true }, sort: "name", slice: [0, 10] };
      const expected = [
        { id: 2, name: "a", arg: true },
        { id: 1, name: "b", arg: true },
      ];
      expect(server.getAll("foo", params)).toEqual(expected);
    });
  });

  describe("getOne", () => {
    it("should return an error when no collection match the identifier", () => {
      const server = new Server();
      server.addCollection("foo", new Collection([{ id: 1, name: "foo" }]));
      expect(() => {
        server.getOne("foo", 2);
      }).toThrow(new Error("No item with identifier 2"));
    });

    it("should return the first collection matching the identifier", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      expect(server.getOne("foo", 1)).toEqual({ id: 1, name: "foo" });
      expect(server.getOne("foo", 2)).toEqual({ id: 2, name: "bar" });
    });

    it("should use the identifierName", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection(
          [
            { _id: 1, name: "foo" },
            { _id: 2, name: "bar" },
          ],
          "_id"
        )
      );
      expect(server.getOne("foo", 1)).toEqual({ _id: 1, name: "foo" });
      expect(server.getOne("foo", 2)).toEqual({ _id: 2, name: "bar" });
    });
  });

  describe("getOnly", () => {
    it("should return the single matching the identifier", () => {
      const server = new Server();
      server.addSingle("foo", new Single({ name: "foo" }));
      expect(server.getOnly("foo")).toEqual({ name: "foo" });
    });
  });

  describe("addRequestInterceptor", () => {
    it("should allow request transformation", () => {
      const server = new Server();
      server.addRequestInterceptor(function (request) {
        const start = request.params._start - 1 || 0;
        const end =
          request.params._end !== undefined ? request.params._end - 1 : 19;
        request.params.range = [start, end];
        return request;
      });
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      let request;
      request = getFakeXMLHTTPRequest("GET", "/foo?_start=1&_end=1");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.responseText).toEqual('[{"id":1,"name":"foo"}]');
      expect(request.getResponseHeader("Content-Range")).toEqual("items 0-0/2");
      request = getFakeXMLHTTPRequest("GET", "/foo?_start=2&_end=2");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.responseText).toEqual('[{"id":2,"name":"bar"}]');
      expect(request.getResponseHeader("Content-Range")).toEqual("items 1-1/2");
    });
  });

  describe("addResponseInterceptor", () => {
    it("should allow response transformation", () => {
      const server = new Server();
      server.addResponseInterceptor(function (response) {
        response.body = { data: response.body, status: response.status };
        return response;
      });
      server.addResponseInterceptor(function (response) {
        response.status = 418;
        return response;
      });
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(418);
      expect(request.responseText).toEqual(
        '{"data":[{"id":1,"name":"foo"},{"id":2,"name":"bar"}],"status":200}'
      );
    });

    it("should pass request in response interceptor", () => {
      const server = new Server();
      let requestUrl;
      server.addResponseInterceptor(function (response, request) {
        requestUrl = request.url;
        return response;
      });
      server.addCollection("foo", new Collection());

      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);

      expect(requestUrl).toEqual("/foo");
    });
  });

  describe("handle", () => {
    it("should not respond to GET /whatever on non existing collection", () => {
      const server = new Server();
      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(0); // not responded
    });

    it("should respond to GET /foo by sending all items in collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual(
        '[{"id":1,"name":"foo"},{"id":2,"name":"bar"}]'
      );
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(request.getResponseHeader("Content-Range")).toEqual("items 0-1/2");
    });

    it("should respond to GET /foo?queryString by sending all items in collection foo satisfying query", () => {
      const server = new Server();
      server.addCollection(
        "foos",
        new Collection([
          { id: 0, name: "c", arg: false },
          { id: 1, name: "b", arg: true },
          { id: 2, name: "a", arg: true },
        ])
      );
      server.addCollection(
        "bars",
        new Collection([{ id: 0, name: "a", foo_id: 1 }])
      );
      const request = getFakeXMLHTTPRequest(
        "GET",
        '/foos?filter={"arg":true}&sort=name&slice=[0,10]&embed=["bars"]'
      );
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual(
        '[{"id":2,"name":"a","arg":true,"bars":[]},{"id":1,"name":"b","arg":true,"bars":[{"id":0,"name":"a","foo_id":1}]}]'
      );
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(request.getResponseHeader("Content-Range")).toEqual("items 0-1/2");
    });

    it("should respond to GET /foo?queryString with pagination by sending the correct content-range header", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}])
      ); // 11 items
      let request;
      request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 0-10/11"
      );
      request = getFakeXMLHTTPRequest("GET", "/foo?range=[0,4]");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 0-4/11"
      );
      request = getFakeXMLHTTPRequest("GET", "/foo?range=[5,9]");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 5-9/11"
      );
      request = getFakeXMLHTTPRequest("GET", "/foo?range=[10,14]");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 10-10/11"
      );
    });

    it("should respond to GET /foo on an empty collection with a []", () => {
      const server = new Server();
      server.addCollection("foo", new Collection());
      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual("[]");
      expect(request.getResponseHeader("Content-Range")).toEqual("items */0");
    });

    it("should respond to POST /foo by adding an item to collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest(
        "POST",
        "/foo",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(201);
      expect(request.responseText).toEqual('{"name":"baz","id":3}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(request.getResponseHeader("Location")).toEqual("/foo/3");
      expect(server.getAll("foo")).toEqual([
        { id: 1, name: "foo" },
        { id: 2, name: "bar" },
        { id: 3, name: "baz" },
      ]);
    });

    it("should respond to POST /foo by adding an item to collection foo, even if the collection does not exist", () => {
      const server = new Server();
      const request = getFakeXMLHTTPRequest(
        "POST",
        "/foo",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(201);
      expect(request.responseText).toEqual('{"name":"baz","id":0}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(request.getResponseHeader("Location")).toEqual("/foo/0");
      expect(server.getAll("foo")).toEqual([{ id: 0, name: "baz" }]);
    });

    it("should respond to GET /foo/:id by sending element of identifier id in collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest("GET", "/foo/2");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
    });

    it("should respond to GET /foo/:id on a non-existing id with a 404", () => {
      const server = new Server();
      server.addCollection("foo", new Collection());
      const request = getFakeXMLHTTPRequest("GET", "/foo/3");
      server.handle(request);
      expect(request.status).toEqual(404);
    });

    it("should respond to PUT /foo/:id by updating element of identifier id in collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest(
        "PUT",
        "/foo/2",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(server.getAll("foo")).toEqual([
        { id: 1, name: "foo" },
        { id: 2, name: "baz" },
      ]);
    });

    it("should respond to PUT /foo/:id on a non-existing id with a 404", () => {
      const server = new Server();
      server.addCollection("foo", new Collection([]));
      const request = getFakeXMLHTTPRequest(
        "PUT",
        "/foo/3",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(404);
    });

    it("should respond to PATCH /foo/:id by updating element of identifier id in collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest(
        "PATCH",
        "/foo/2",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"id":2,"name":"baz"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(server.getAll("foo")).toEqual([
        { id: 1, name: "foo" },
        { id: 2, name: "baz" },
      ]);
    });

    it("should respond to PATCH /foo/:id on a non-existing id with a 404", () => {
      const server = new Server();
      server.addCollection("foo", new Collection([]));
      const request = getFakeXMLHTTPRequest(
        "PATCH",
        "/foo/3",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(404);
    });

    it("should respond to DELETE /foo/:id by removing element of identifier id in collection foo", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([
          { id: 1, name: "foo" },
          { id: 2, name: "bar" },
        ])
      );
      const request = getFakeXMLHTTPRequest("DELETE", "/foo/2");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"id":2,"name":"bar"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(server.getAll("foo")).toEqual([{ id: 1, name: "foo" }]);
    });

    it("should respond to DELETE /foo/:id on a non-existing id with a 404", () => {
      const server = new Server();
      server.addCollection("foo", new Collection([]));
      const request = getFakeXMLHTTPRequest("DELETE", "/foo/3");
      server.handle(request);
      expect(request.status).toEqual(404);
    });

    it("should respond to GET /foo/ with single item", () => {
      const server = new Server();
      server.addSingle("foo", new Single({ name: "foo" }));

      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"name":"foo"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
    });

    it("should respond to PUT /foo/ by updating the singleton record", () => {
      const server = new Server();
      server.addSingle("foo", new Single({ name: "foo" }));

      const request = getFakeXMLHTTPRequest(
        "PUT",
        "/foo/",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"name":"baz"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(server.getOnly("foo")).toEqual({ name: "baz" });
    });

    it("should respond to PATCH /foo/ by updating the singleton record", () => {
      const server = new Server();
      server.addSingle("foo", new Single({ name: "foo" }));

      const request = getFakeXMLHTTPRequest(
        "PATCH",
        "/foo/",
        JSON.stringify({ name: "baz" })
      );
      server.handle(request);
      expect(request.status).toEqual(200);
      expect(request.responseText).toEqual('{"name":"baz"}');
      expect(request.getResponseHeader("Content-Type")).toEqual(
        "application/json"
      );
      expect(server.getOnly("foo")).toEqual({ name: "baz" });
    });
  });

  describe("setDefaultQuery", () => {
    it("should set the default query string", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}])
      ); // 10 items
      server.setDefaultQuery(() => {
        return { range: [2, 4] };
      });
      const request = getFakeXMLHTTPRequest("GET", "/foo");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 2-4/10"
      );
      const expected = [{ id: 2 }, { id: 3 }, { id: 4 }];
      expect(request.responseText).toEqual(JSON.stringify(expected));
    });

    it("should not override any provided query string", () => {
      const server = new Server();
      server.addCollection(
        "foo",
        new Collection([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}])
      ); // 10 items
      server.setDefaultQuery(function (name) {
        return { range: [2, 4] };
      });
      const request = getFakeXMLHTTPRequest("GET", "/foo?range=[0,4]");
      server.handle(request);
      expect(request.status).toEqual(206);
      expect(request.getResponseHeader("Content-Range")).toEqual(
        "items 0-4/10"
      );
      const expected = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
      expect(request.responseText).toEqual(JSON.stringify(expected));
    });
  });

  describe("batch", () => {
    it("should return batch response", () => {
      const server = new Server();
      server.init({
        foo: [{ a: 1 }, { a: 2 }, { a: 3 }],
        bar: [{ b: true }, { b: false }],
        biz: { name: "biz" },
      });
      server.setBatchUrl("/batch");
      const request = getFakeXMLHTTPRequest(
        "POST",
        "/batch",
        JSON.stringify({
          foo0: "/foo/0",
          allbar: "/bar",
          baz0: "/baz/0",
          biz: "/biz",
        })
      );
      server.handle(request);
      expect(request.responseText).toEqual(
        JSON.stringify({
          foo0: {
            code: 200,
            headers: [
              {
                name: "Content-Type",
                value: "application/json",
              },
            ],
            body: '{"a":1,"id":0}',
          },
          allbar: {
            code: 200,
            headers: [
              { name: "Content-Range", value: "items 0-1/2" },
              { name: "Content-Type", value: "application/json" },
            ],
            body: '[{"b":true,"id":0},{"b":false,"id":1}]',
          },
          baz0: {
            code: 404,
            headers: [],
            body: {},
          },
          biz: {
            code: 200,
            headers: [
              {
                name: "Content-Type",
                value: "application/json",
              },
            ],
            body: '{"name":"biz"}',
          },
        })
      );
    });
  });
});
