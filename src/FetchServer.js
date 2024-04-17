import { Server } from "./Server";
import { parseQueryString } from "./parseQueryString";

export class FetchServer extends Server {
	decode(request, opts) {
		const req =
			typeof request === "string" ? new Request(request, opts) : request;
		req.queryString = decodeURIComponent(
			req.url.slice(req.url.indexOf("?") + 1),
		);
		req.params = parseQueryString(req.queryString);
		return req
			.text()
			.then((text) => {
				req.requestBody = text;
				try {
					req.requestJson = JSON.parse(text);
				} catch (e) {
					// not JSON, no big deal
				}
			})
			.then(() =>
				this.requestInterceptors.reduce(
					(previous, current) => current(previous),
					req,
				),
			);
	}

	respond(response, request) {
		// biome-ignore lint: FIXME
		response = this.responseInterceptors.reduce(
			(previous, current) => current(previous, request),
			response,
		);
		this.log(request, response);
		response.headers = new Headers(response.headers);

		return response;
	}

	log(request, response) {
		if (!this.loggingEnabled) return;
		if (console.group) {
			// Better logging in Chrome
			console.groupCollapsed(request.method, request.url, "(FakeRest)");
			console.group("request");
			console.log(request.method, request.url);
			console.log("headers", request.headers);
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
				request.headers,
				"body",
				request.requestBody,
			);
			console.log(
				"FakeRest response",
				response.status,
				"headers",
				response.headers,
				"body",
				response.body,
			);
		}
	}

	batch(request) {
		throw new Error("not implemented");
	}

	/**
	 * @param {Request} fetch request
	 * @param {Object} options
	 *
	 */
	handle(req, opts) {
		return this.decode(req, opts).then((request) => {
			const response = {
				headers: { "Content-Type": "application/json" },
				status: 200,
			};

			// handle batch request
			if (
				this.batchUrl &&
				this.batchUrl === request.url &&
				request.method === "POST"
			) {
				return this.batch(request);
			}

			// Handle Single Objects
			for (const name of this.getSingleNames()) {
				const matches = request.url.match(
					new RegExp(`^${this.baseUrl}\\/(${name})(\\/?.*)?$`),
				);
				if (!matches) continue;

				if (request.method === "GET") {
					try {
						response.body = this.getOnly(name);
					} catch (error) {
						response.status = 404;
					}
					return this.respond(response, request);
				}
				if (request.method === "PUT") {
					try {
						response.body = this.updateOnly(name, request.requestJson);
					} catch (error) {
						response.status = 404;
					}
					return this.respond(response, request);
				}
				if (request.method === "PATCH") {
					try {
						response.body = this.updateOnly(name, request.requestJson);
					} catch (error) {
						response.status = 404;
					}
					return this.respond(response, request);
				}
			}

			// handle collections
			for (const name of this.getCollectionNames()) {
				const matches = request.url.match(
					new RegExp(`^${this.baseUrl}\\/(${name})(\\/(\\d+))?(\\?.*)?$`),
				);
				if (!matches) continue;
				const params = Object.assign(
					{},
					this.defaultQuery(name),
					request.params,
				);
				if (!matches[2]) {
					if (request.method === "GET") {
						const count = this.getCount(
							name,
							params.filter ? { filter: params.filter } : {},
						);
						if (count > 0) {
							const items = this.getAll(name, params);
							const first = params.range ? params.range[0] : 0;
							const last = params.range
								? Math.min(items.length - 1 + first, params.range[1])
								: items.length - 1;
							response.body = items;
							response.headers["Content-Range"] =
								`items ${first}-${last}/${count}`;
							response.status = items.length === count ? 200 : 206;
						} else {
							response.body = [];
							response.headers["Content-Range"] = "items */0";
						}
						return this.respond(response, request);
					}
					if (request.method === "POST") {
						const newResource = this.addOne(name, request.requestJson);
						const newResourceURI = `${this.baseUrl}/${name}/${
							newResource[this.getCollection(name).identifierName]
						}`;
						response.body = newResource;
						response.headers.Location = newResourceURI;
						response.status = 201;
						return this.respond(response, request);
					}
				} else {
					const id = matches[3];
					if (request.method === "GET") {
						try {
							response.body = this.getOne(name, id, params);
						} catch (error) {
							response.status = 404;
						}
						return this.respond(response, request);
					}
					if (request.method === "PUT") {
						try {
							response.body = this.updateOne(name, id, request.requestJson);
						} catch (error) {
							response.status = 404;
						}
						return this.respond(response, request);
					}
					if (request.method === "PATCH") {
						try {
							response.body = this.updateOne(name, id, request.requestJson);
						} catch (error) {
							response.status = 404;
						}
						return this.respond(response, request);
					}
					if (request.method === "DELETE") {
						try {
							response.body = this.removeOne(name, id);
						} catch (error) {
							response.status = 404;
						}
						return this.respond(response, request);
					}
				}
			}
			return this.respond(response, request);
		});
	}
}
