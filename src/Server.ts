import { Collection } from "./Collection";
import { Single } from "./Single";
import { parseQueryString } from "./parseQueryString";

export class Server {
  baseUrl: string;
  loggingEnabled = false;
  defaultQuery = (name: string) => {};
  batchUrl: string | null = null;
  collections: Record<string, Collection> = {};
  singles: Record<string, Single> = {};
  requestInterceptors: any = [];
  responseInterceptors: any = [];

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  /**
   * Shortcut for adding several collections if identifierName is always 'id'
   */
  init(data: Record<string, any>): void {
    for (let name in data) {
      if (Array.isArray(data[name])) {
        this.addCollection(name, new Collection(data[name], "id"));
      } else {
        this.addSingle(name, new Single(data[name]));
      }
    }
  }

  toggleLogging(): void {
    this.loggingEnabled = !this.loggingEnabled;
  }

  /**
   * @param Function ResourceName => object
   */
  setDefaultQuery(query: any): void {
    this.defaultQuery = query;
  }

  setBatchUrl(batchUrl: string): void {
    this.batchUrl = batchUrl;
  }

  /**
   * @deprecated use setBatchUrl instead
   */
  setBatch(url: string): void {
    console.warn(
      "Server.setBatch() is deprecated, use Server.setBatchUrl() instead"
    );
    this.batchUrl = url;
  }

  addCollection(name: string, collection: Collection): void {
    this.collections[name] = collection;
    collection.setServer(this);
    collection.setName(name);
  }

  getCollection(name: string): Collection {
    return this.collections[name];
  }

  getCollectionNames(): string[] {
    return Object.keys(this.collections);
  }

  addSingle(name: string, single: Single): void {
    this.singles[name] = single;
    single.setServer(this);
    single.setName(name);
  }

  getSingle(name: string): Single {
    return this.singles[name];
  }

  getSingleNames(): string[] {
    return Object.keys(this.singles);
  }

  addRequestInterceptor(interceptor: any): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: any): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * @param {string} name
   * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
   */
  getCount(name: string, params?: any): number {
    return this.collections[name].getCount(params);
  }

  /**
   * @param {string} name
   * @param {string} params As decoded from the query string, e.g. { sort: "name", filter: {enabled:true}, slice: [10, 20] }
   */
  getAll(name: string, params?: any): any[] {
    return this.collections[name].getAll(params);
  }

  getOne(name: string, identifier: any, params?: any): any {
    return this.collections[name].getOne(identifier, params);
  }

  addOne(name: string, item: any):any {
    if (!this.collections.hasOwnProperty(name)) {
      this.addCollection(name, new Collection([], "id"));
    }
    return this.collections[name].addOne(item);
  }

  updateOne(name: string, identifier: string, item: any): any {
    return this.collections[name].updateOne(identifier, item);
  }

  removeOne(name: string, identifier: any): any {
    return this.collections[name].removeOne(identifier);
  }

  getOnly(name: string, params?: any): any {
    return this.singles[name].getOnly(params);
  }

  updateOnly(name: string, item: any): any {
    return this.singles[name].updateOnly(item);
  }

  decode(request: any): any {
    request.queryString = decodeURIComponent(
      request.url.slice(request.url.indexOf("?") + 1)
    );
    request.params = parseQueryString(request.queryString);
    if (request.requestBody) {
      try {
        request.json = JSON.parse(request.requestBody);
      } catch (error) {
        // body isn't JSON, skipping
      }
    }
    return this.requestInterceptors.reduce(function (previous: any, current: any) {
      return current(previous);
    }, request);
  }

  respond(body: any, headers: any, request: any, status = 200): any {
    if (!headers) {
      headers = {};
    }
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    let response = { status: status, headers: headers, body: body };
    response = this.responseInterceptors.reduce(function (previous: any, current: any) {
      return current(previous, request);
    }, response);
    this.log(request, response);

    return request.respond(
      response.status,
      response.headers,
      JSON.stringify(response.body)
    );
  }

  log(request: any, response: any): void {
    if (!this.loggingEnabled) return;
    if (console.group) {
      // Better logging in Chrome
      console.groupCollapsed(request.method, request.url, "(FakeRest)");
      console.group("request");
      console.log(request.method, request.url);
      console.log("headers", request.requestHeaders);
      console.log("body   ", request.requestBody);
      console.groupEnd();
      console.group("response", response.status);
      console.log("headers", response.headers);
      console.log("body   ", response.body);
      console.groupEnd();
      console.groupEnd();
    } else {
      console.log(
        "FakeRest request ",
        request.method,
        request.url,
        "headers",
        request.requestHeaders,
        "body",
        request.requestBody
      );
      console.log(
        "FakeRest response",
        response.status,
        "headers",
        response.headers,
        "body",
        response.body
      );
    }
  }

  batch(request: any): any {
    var json = request.json;
    var handle = this.handle.bind(this);

    var jsonResponse = Object.keys(json).reduce<any>(function (
      jsonResponse,
      requestName
    ) {
      var subResponse;
      var sub = {
        url: json[requestName],
        method: "GET",
        params: {},
        respond: function (code: any, headers: any, body: any) {
          subResponse = {
            code: code,
            headers: Object.keys(headers || {}).map(function (headerName) {
              return {
                name: headerName,
                value: headers[headerName],
              };
            }),
            body: body || {},
          };
        },
      };
      handle(sub);

      jsonResponse[requestName] = subResponse || {
        code: 404,
        headers: [],
        body: {},
      };

      return jsonResponse;
    },
    {});

    return this.respond(jsonResponse, {}, request, 200);
  }

  /**
   * @param {FakeXMLHttpRequest} request
   *
   * String request.url The URL set on the request object.
   * String request.method The request method as a string.
   * Object request.requestHeaders An object of all request headers, i.e.:
   *     {
   *         "Accept": "text/html",
   *         "Connection": "keep-alive"
   *     }
   * String request.requestBody The request body
   * String request.username Username, if any.
   * String request.password Password, if any.
   */
  handle(request: any) {
    request = this.decode(request);

    if (
      this.batchUrl &&
      this.batchUrl === request.url &&
      request.method === "POST"
    ) {
      return this.batch(request);
    }

    // Handle Single Objects
    for (let name of this.getSingleNames()) {
      let matches = request.url.match(
        new RegExp("^" + this.baseUrl + "\\/(" + name + ")(\\/?.*)?$")
      );
      if (!matches) continue;

      if (request.method == "GET") {
        try {
          let item = this.getOnly(name);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
      if (request.method == "PUT") {
        try {
          let item = this.updateOnly(name, request.json);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
      if (request.method == "PATCH") {
        try {
          let item = this.updateOnly(name, request.json);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
    }

    // Handle collections
    let matches = request.url.match(
      new RegExp("^" + this.baseUrl + "\\/([^\\/?]+)(\\/(\\d+))?(\\?.*)?$")
    );
    if (!matches) return;
    let name = matches[1];
    let params = Object.assign({}, this.defaultQuery(name), request.params);
    if (!matches[2]) {
      if (request.method == "GET") {
        if (!this.getCollection(name)) {
          return;
        }
        let count = this.getCount(
          name,
          params.filter ? { filter: params.filter } : {}
        );
        let items, contentRange, status;
        if (count > 0) {
          items = this.getAll(name, params);
          let first = params.range ? params.range[0] : 0;
          let last = params.range
            ? Math.min(items.length - 1 + first, params.range[1])
            : items.length - 1;
          contentRange = `items ${first}-${last}/${count}`;
          status = items.length == count ? 200 : 206;
        } else {
          items = [];
          contentRange = "items */0";
          status = 200;
        }
        return this.respond(
          items,
          { "Content-Range": contentRange },
          request,
          status
        );
      }
      if (request.method == "POST") {
        let newResource = this.addOne(name, request.json);
        let newResourceURI =
          this.baseUrl +
          "/" +
          name +
          "/" +
          newResource[this.getCollection(name).identifierName];
        return this.respond(
          newResource,
          { Location: newResourceURI },
          request,
          201
        );
      }
    } else {
      if (!this.getCollection(name)) {
        return;
      }
      let id = matches[3];
      if (request.method == "GET") {
        try {
          let item = this.getOne(name, id, params);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
      if (request.method == "PUT") {
        try {
          let item = this.updateOne(name, id, request.json);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
      if (request.method == "PATCH") {
        try {
          let item = this.updateOne(name, id, request.json);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
      if (request.method == "DELETE") {
        try {
          let item = this.removeOne(name, id);
          return this.respond(item, null, request);
        } catch (error) {
          return request.respond(404);
        }
      }
    }
  }

  getHandler() {
    return this.handle.bind(this);
  }
}
