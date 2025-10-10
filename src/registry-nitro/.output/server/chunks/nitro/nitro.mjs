import http, { Server as Server$1 } from 'node:http';
import https, { Server } from 'node:https';
import { sqliteTable, text, numeric } from 'drizzle-orm/sqlite-core';
import { eq } from 'drizzle-orm';
import { text as text$1 } from 'stream/consumers';
import { drizzle } from 'drizzle-orm/libsql';
import { basename, resolve as resolve$1, join, dirname as dirname$1 } from 'node:path';
import { access } from 'node:fs/promises';
import { mkdirSync, createReadStream, createWriteStream, promises, existsSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const suspectProtoRx = /"(?:_|\\u0{2}5[Ff]){2}(?:p|\\u0{2}70)(?:r|\\u0{2}72)(?:o|\\u0{2}6[Ff])(?:t|\\u0{2}74)(?:o|\\u0{2}6[Ff])(?:_|\\u0{2}5[Ff]){2}"\s*:/;
const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
const JsonSigRx = /^\s*["[{]|^\s*-?\d{1,16}(\.\d{1,17})?([Ee][+-]?\d+)?\s*$/;
function jsonParseTransform(key, value) {
  if (key === "__proto__" || key === "constructor" && value && typeof value === "object" && "prototype" in value) {
    warnKeyDropped(key);
    return;
  }
  return value;
}
function warnKeyDropped(key) {
  console.warn(`[destr] Dropping "${key}" key to prevent prototype pollution.`);
}
function destr(value, options = {}) {
  if (typeof value !== "string") {
    return value;
  }
  if (value[0] === '"' && value[value.length - 1] === '"' && value.indexOf("\\") === -1) {
    return value.slice(1, -1);
  }
  const _value = value.trim();
  if (_value.length <= 9) {
    switch (_value.toLowerCase()) {
      case "true": {
        return true;
      }
      case "false": {
        return false;
      }
      case "undefined": {
        return void 0;
      }
      case "null": {
        return null;
      }
      case "nan": {
        return Number.NaN;
      }
      case "infinity": {
        return Number.POSITIVE_INFINITY;
      }
      case "-infinity": {
        return Number.NEGATIVE_INFINITY;
      }
    }
  }
  if (!JsonSigRx.test(value)) {
    if (options.strict) {
      throw new SyntaxError("[destr] Invalid JSON");
    }
    return value;
  }
  try {
    if (suspectProtoRx.test(value) || suspectConstructorRx.test(value)) {
      if (options.strict) {
        throw new Error("[destr] Possible prototype pollution");
      }
      return JSON.parse(value, jsonParseTransform);
    }
    return JSON.parse(value);
  } catch (error) {
    if (options.strict) {
      throw error;
    }
    return value;
  }
}

//#region src/_url.ts
/**
* Wrapper for URL with fast path access to `.pathname` and `.search` props.
*
* **NOTE:** It is assumed that the input URL is already ecoded and formatted from an HTTP request and contains no hash.
*
* **NOTE:** Triggering the setters or getters on other props will deoptimize to full URL parsing.
*/
const FastURL = /* @__PURE__ */ (() => {
	const FastURL$1 = class URL {
		#originalURL;
		#parsedURL;
		_pathname;
		_urlqindex;
		_query;
		_search;
		constructor(url) {
			this.#originalURL = url;
		}
		get _url() {
			if (!this.#parsedURL) this.#parsedURL = new globalThis.URL(this.#originalURL);
			return this.#parsedURL;
		}
		toString() {
			return this._url.toString();
		}
		toJSON() {
			return this.toString();
		}
		get pathname() {
			if (this.#parsedURL) return this.#parsedURL.pathname;
			if (this._pathname === void 0) {
				const url = this.#originalURL;
				const protoIndex = url.indexOf("://");
				if (protoIndex === -1) return this._url.pathname;
				const pIndex = url.indexOf("/", protoIndex + 4);
				if (pIndex === -1) return this._url.pathname;
				const qIndex = this._urlqindex = url.indexOf("?", pIndex);
				this._pathname = url.slice(pIndex, qIndex === -1 ? void 0 : qIndex);
			}
			return this._pathname;
		}
		set pathname(value) {
			this._pathname = void 0;
			this._url.pathname = value;
		}
		get searchParams() {
			if (this.#parsedURL) return this.#parsedURL.searchParams;
			if (!this._query) this._query = new URLSearchParams(this.search);
			return this._query;
		}
		get search() {
			if (this.#parsedURL) return this.#parsedURL.search;
			if (this._search === void 0) {
				const qIndex = this._urlqindex;
				if (qIndex === -1 || qIndex === this.#originalURL.length - 1) this._search = "";
				else this._search = qIndex === void 0 ? this._url.search : this.#originalURL.slice(qIndex);
			}
			return this._search;
		}
		set search(value) {
			this._search = void 0;
			this._query = void 0;
			this._url.search = value;
		}
	};
	const slowProps = [
		"hash",
		"host",
		"hostname",
		"href",
		"origin",
		"password",
		"port",
		"protocol",
		"username"
	];
	for (const prop of slowProps) Object.defineProperty(FastURL$1.prototype, prop, {
		get() {
			return this._url[prop];
		},
		set(value) {
			this._url[prop] = value;
		}
	});
	Object.setPrototypeOf(FastURL$1, globalThis.URL);
	return FastURL$1;
})();

function splitSetCookieString(cookiesString) {
  if (Array.isArray(cookiesString)) {
    return cookiesString.flatMap((c) => splitSetCookieString(c));
  }
  if (typeof cookiesString !== "string") {
    return [];
  }
  const cookiesStrings = [];
  let pos = 0;
  let start;
  let ch;
  let lastComma;
  let nextStart;
  let cookiesSeparatorFound;
  const skipWhitespace = () => {
    while (pos < cookiesString.length && /\s/.test(cookiesString.charAt(pos))) {
      pos += 1;
    }
    return pos < cookiesString.length;
  };
  const notSpecialChar = () => {
    ch = cookiesString.charAt(pos);
    return ch !== "=" && ch !== ";" && ch !== ",";
  };
  while (pos < cookiesString.length) {
    start = pos;
    cookiesSeparatorFound = false;
    while (skipWhitespace()) {
      ch = cookiesString.charAt(pos);
      if (ch === ",") {
        lastComma = pos;
        pos += 1;
        skipWhitespace();
        nextStart = pos;
        while (pos < cookiesString.length && notSpecialChar()) {
          pos += 1;
        }
        if (pos < cookiesString.length && cookiesString.charAt(pos) === "=") {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(cookiesString.slice(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }
    if (!cookiesSeparatorFound || pos >= cookiesString.length) {
      cookiesStrings.push(cookiesString.slice(start));
    }
  }
  return cookiesStrings;
}

//#region src/adapters/_node/_common.ts
const kNodeInspect = /* @__PURE__ */ Symbol.for("nodejs.util.inspect.custom");

//#endregion
//#region src/adapters/_node/headers.ts
const NodeRequestHeaders = /* @__PURE__ */ (() => {
	const _Headers = class Headers$1 {
		_node;
		constructor(nodeCtx) {
			this._node = nodeCtx;
		}
		append(name, value) {
			name = validateHeader(name);
			const _headers = this._node.req.headers;
			const _current = _headers[name];
			if (_current) if (Array.isArray(_current)) _current.push(value);
			else _headers[name] = [_current, value];
			else _headers[name] = value;
		}
		delete(name) {
			name = validateHeader(name);
			this._node.req.headers[name] = void 0;
		}
		get(name) {
			name = validateHeader(name);
			const rawValue = this._node.req.headers[name];
			if (rawValue === void 0) return null;
			return _normalizeValue(this._node.req.headers[name]);
		}
		getSetCookie() {
			const setCookie = this._node.req.headers["set-cookie"];
			if (!setCookie || setCookie.length === 0) return [];
			return splitSetCookieString(setCookie);
		}
		has(name) {
			name = validateHeader(name);
			return !!this._node.req.headers[name];
		}
		set(name, value) {
			name = validateHeader(name);
			this._node.req.headers[name] = value;
		}
		get count() {
			throw new Error("Method not implemented.");
		}
		getAll(_name) {
			throw new Error("Method not implemented.");
		}
		toJSON() {
			const _headers = this._node.req.headers;
			const result = {};
			for (const key in _headers) if (_headers[key]) result[key] = _normalizeValue(_headers[key]);
			return result;
		}
		forEach(cb, thisArg) {
			const _headers = this._node.req.headers;
			for (const key in _headers) if (_headers[key]) cb.call(thisArg, _normalizeValue(_headers[key]), key, this);
		}
		*entries() {
			const headers = this._node.req.headers;
			const isHttp2 = this._node.req.httpVersion === "2.0";
			for (const key in headers) if (!isHttp2 || key[0] !== ":") yield [key, _normalizeValue(headers[key])];
		}
		*keys() {
			const keys = Object.keys(this._node.req.headers);
			for (const key of keys) yield key;
		}
		*values() {
			const values = Object.values(this._node.req.headers);
			for (const value of values) yield _normalizeValue(value);
		}
		[Symbol.iterator]() {
			return this.entries()[Symbol.iterator]();
		}
		get [Symbol.toStringTag]() {
			return "Headers";
		}
		[kNodeInspect]() {
			return Object.fromEntries(this.entries());
		}
	};
	Object.setPrototypeOf(_Headers.prototype, globalThis.Headers.prototype);
	return _Headers;
})();
function _normalizeValue(value) {
	if (Array.isArray(value)) return value.join(", ");
	return typeof value === "string" ? value : String(value ?? "");
}
function validateHeader(name) {
	if (name[0] === ":") throw new TypeError(`${JSON.stringify(name)} is an invalid header name.`);
	return name.toLowerCase();
}

//#endregion
//#region src/adapters/_node/response.ts
/**
* Fast Response for Node.js runtime
*
* It is faster because in most cases it doesn't create a full Response instance.
*/
const NodeResponse = /* @__PURE__ */ (() => {
	const CONTENT_TYPE = "content-type";
	const JSON_TYPE = "application/json";
	const JSON_HEADER = [[CONTENT_TYPE, JSON_TYPE]];
	const _Response = class Response {
		#body;
		#init;
		constructor(body, init) {
			this.#body = body;
			this.#init = init;
		}
		static json(data, init) {
			if (init?.headers) {
				if (!init.headers[CONTENT_TYPE]) {
					const initHeaders = new Headers(init.headers);
					if (!initHeaders.has(CONTENT_TYPE)) initHeaders.set(CONTENT_TYPE, JSON_TYPE);
					init = {
						...init,
						headers: initHeaders
					};
				}
			} else {
				init = init ? { ...init } : {};
				init.headers = JSON_HEADER;
			}
			return new _Response(JSON.stringify(data), init);
		}
		static error() {
			return globalThis.Response.error();
		}
		static redirect(url, status) {
			return globalThis.Response.redirect(url, status);
		}
		/**
		* Prepare Node.js response object
		*/
		nodeResponse() {
			const status = this.#init?.status ?? 200;
			const statusText = this.#init?.statusText ?? "";
			const headers = [];
			const headersInit = this.#init?.headers;
			if (this.#headersObj) for (const [key, value] of this.#headersObj) if (key === "set-cookie") for (const setCookie of splitSetCookieString(value)) headers.push(["set-cookie", setCookie]);
			else headers.push([key, value]);
			else if (headersInit) {
				const headerEntries = Array.isArray(headersInit) ? headersInit : headersInit.entries ? headersInit.entries() : Object.entries(headersInit);
				for (const [key, value] of headerEntries) if (key === "set-cookie") for (const setCookie of splitSetCookieString(value)) headers.push(["set-cookie", setCookie]);
				else headers.push([key, value]);
			}
			const bodyInit = this.#body;
			let body;
			if (bodyInit) if (typeof bodyInit === "string") body = bodyInit;
			else if (bodyInit instanceof ReadableStream) body = bodyInit;
			else if (bodyInit instanceof ArrayBuffer) body = Buffer.from(bodyInit);
			else if (bodyInit instanceof Uint8Array) body = Buffer.from(bodyInit);
			else if (bodyInit instanceof DataView) body = Buffer.from(bodyInit.buffer);
			else if (bodyInit instanceof Blob) {
				body = bodyInit.stream();
				if (bodyInit.type) headers.push(["content-type", bodyInit.type]);
			} else if (typeof bodyInit.pipe === "function") body = bodyInit;
			else {
				const res = new globalThis.Response(bodyInit);
				body = res.body;
				for (const [key, value] of res.headers) headers.push([key, value]);
			}
			this.#body = void 0;
			this.#init = void 0;
			this.#headersObj = void 0;
			this.#responseObj = void 0;
			return {
				status,
				statusText,
				headers,
				body
			};
		}
		/** Lazy initialized response instance */
		#responseObj;
		/** Lazy initialized headers instance */
		#headersObj;
		clone() {
			if (this.#responseObj) return this.#responseObj.clone();
			if (this.#headersObj) return new _Response(this.#body, {
				...this.#init,
				headers: this.#headersObj
			});
			return new _Response(this.#body, this.#init);
		}
		get #response() {
			if (!this.#responseObj) {
				this.#responseObj = this.#headersObj ? new globalThis.Response(this.#body, {
					...this.#init,
					headers: this.#headersObj
				}) : new globalThis.Response(this.#body, this.#init);
				this.#body = void 0;
				this.#init = void 0;
				this.#headersObj = void 0;
			}
			return this.#responseObj;
		}
		get headers() {
			if (this.#responseObj) return this.#responseObj.headers;
			if (!this.#headersObj) this.#headersObj = new Headers(this.#init?.headers);
			return this.#headersObj;
		}
		get ok() {
			if (this.#responseObj) return this.#responseObj.ok;
			const status = this.#init?.status ?? 200;
			return status >= 200 && status < 300;
		}
		get redirected() {
			if (this.#responseObj) return this.#responseObj.redirected;
			return false;
		}
		get status() {
			if (this.#responseObj) return this.#responseObj.status;
			return this.#init?.status ?? 200;
		}
		get statusText() {
			if (this.#responseObj) return this.#responseObj.statusText;
			return this.#init?.statusText ?? "";
		}
		get type() {
			if (this.#responseObj) return this.#responseObj.type;
			return "default";
		}
		get url() {
			if (this.#responseObj) return this.#responseObj.url;
			return "";
		}
		#fastBody(as) {
			const bodyInit = this.#body;
			if (bodyInit === null || bodyInit === void 0) return null;
			if (bodyInit instanceof as) return bodyInit;
			return false;
		}
		get body() {
			if (this.#responseObj) return this.#responseObj.body;
			const fastBody = this.#fastBody(ReadableStream);
			if (fastBody !== false) return fastBody;
			return this.#response.body;
		}
		get bodyUsed() {
			if (this.#responseObj) return this.#responseObj.bodyUsed;
			return false;
		}
		arrayBuffer() {
			if (this.#responseObj) return this.#responseObj.arrayBuffer();
			const fastBody = this.#fastBody(ArrayBuffer);
			if (fastBody !== false) return Promise.resolve(fastBody || new ArrayBuffer(0));
			return this.#response.arrayBuffer();
		}
		blob() {
			if (this.#responseObj) return this.#responseObj.blob();
			const fastBody = this.#fastBody(Blob);
			if (fastBody !== false) return Promise.resolve(fastBody || new Blob());
			return this.#response.blob();
		}
		bytes() {
			if (this.#responseObj) return this.#responseObj.bytes();
			const fastBody = this.#fastBody(Uint8Array);
			if (fastBody !== false) return Promise.resolve(fastBody || new Uint8Array());
			return this.#response.bytes();
		}
		formData() {
			if (this.#responseObj) return this.#responseObj.formData();
			const fastBody = this.#fastBody(FormData);
			if (fastBody !== false) return Promise.resolve(fastBody || new FormData());
			return this.#response.formData();
		}
		text() {
			if (this.#responseObj) return this.#responseObj.text();
			const bodyInit = this.#body;
			if (bodyInit === null || bodyInit === void 0) return Promise.resolve("");
			if (typeof bodyInit === "string") return Promise.resolve(bodyInit);
			return this.#response.text();
		}
		json() {
			if (this.#responseObj) return this.#responseObj.json();
			return this.text().then((text) => JSON.parse(text));
		}
	};
	Object.setPrototypeOf(_Response.prototype, globalThis.Response.prototype);
	return _Response;
})();

//#region src/adapters/_node/send.ts
async function sendNodeResponse(nodeRes, webRes) {
	if (!webRes) {
		nodeRes.statusCode = 500;
		return endNodeResponse(nodeRes);
	}
	if (webRes.nodeResponse) {
		const res = webRes.nodeResponse();
		writeHead(nodeRes, res.status, res.statusText, res.headers.flat());
		if (res.body) {
			if (res.body instanceof ReadableStream) return streamBody(res.body, nodeRes);
			else if (typeof res.body?.pipe === "function") {
				res.body.pipe(nodeRes);
				return new Promise((resolve) => nodeRes.on("close", resolve));
			}
			nodeRes.write(res.body);
		}
		return endNodeResponse(nodeRes);
	}
	const headerEntries = [];
	for (const [key, value] of webRes.headers) if (key === "set-cookie") for (const setCookie of splitSetCookieString(value)) headerEntries.push(["set-cookie", setCookie]);
	else headerEntries.push([key, value]);
	writeHead(nodeRes, webRes.status, webRes.statusText, headerEntries.flat());
	return webRes.body ? streamBody(webRes.body, nodeRes) : endNodeResponse(nodeRes);
}
function writeHead(nodeRes, status, statusText, headers) {
	if (!nodeRes.headersSent) if (nodeRes.req?.httpVersion === "2.0") nodeRes.writeHead(status, headers.flat());
	else nodeRes.writeHead(status, statusText, headers.flat());
}
function endNodeResponse(nodeRes) {
	return new Promise((resolve) => nodeRes.end(resolve));
}
function streamBody(stream, nodeRes) {
	if (nodeRes.destroyed) {
		stream.cancel();
		return;
	}
	const reader = stream.getReader();
	function streamCancel(error) {
		reader.cancel(error).catch(() => {});
		if (error) nodeRes.destroy(error);
	}
	function streamHandle({ done, value }) {
		try {
			if (done) nodeRes.end();
			else if (nodeRes.write(value)) reader.read().then(streamHandle, streamCancel);
			else nodeRes.once("drain", () => reader.read().then(streamHandle, streamCancel));
		} catch (error) {
			streamCancel(error instanceof Error ? error : void 0);
		}
	}
	nodeRes.on("close", streamCancel);
	nodeRes.on("error", streamCancel);
	reader.read().then(streamHandle, streamCancel);
	return reader.closed.finally(() => {
		nodeRes.off("close", streamCancel);
		nodeRes.off("error", streamCancel);
	});
}

//#endregion
//#region src/adapters/_node/url.ts
const NodeRequestURL = /* @__PURE__ */ (() => {
	const _URL = class URL {
		_node;
		_hash = "";
		_username = "";
		_password = "";
		_protocol;
		_hostname;
		_port;
		_pathname;
		_search;
		_searchParams;
		constructor(nodeCtx) {
			this._node = nodeCtx;
		}
		get hash() {
			return this._hash;
		}
		set hash(value) {
			this._hash = value;
		}
		get username() {
			return this._username;
		}
		set username(value) {
			this._username = value;
		}
		get password() {
			return this._password;
		}
		set password(value) {
			this._password = value;
		}
		get host() {
			return this._node.req.headers.host || this._node.req.headers[":authority"] || "";
		}
		set host(value) {
			this._hostname = void 0;
			this._port = void 0;
			this._node.req.headers.host = value;
		}
		get hostname() {
			if (this._hostname === void 0) {
				const [hostname, port] = parseHost(this._node.req.headers.host);
				if (this._port === void 0 && port) this._port = String(Number.parseInt(port) || "");
				this._hostname = hostname || "localhost";
			}
			return this._hostname;
		}
		set hostname(value) {
			this._hostname = value;
		}
		get port() {
			if (this._port === void 0) {
				const [hostname, port] = parseHost(this._node.req.headers.host);
				if (this._hostname === void 0 && hostname) this._hostname = hostname;
				this._port = port || String(this._node.req.socket?.localPort || "");
			}
			return this._port;
		}
		set port(value) {
			this._port = String(Number.parseInt(value) || "");
		}
		get pathname() {
			if (this._pathname === void 0) {
				const [pathname, search] = parsePath$1(this._node.req.url || "/");
				this._pathname = pathname;
				if (this._search === void 0) this._search = search;
			}
			return this._pathname;
		}
		set pathname(value) {
			if (value[0] !== "/") value = "/" + value;
			if (value === this._pathname) return;
			this._pathname = value;
			this._node.req.url = value + this.search;
		}
		get search() {
			if (this._search === void 0) {
				const [pathname, search] = parsePath$1(this._node.req.url || "/");
				this._search = search;
				if (this._pathname === void 0) this._pathname = pathname;
			}
			return this._search;
		}
		set search(value) {
			if (value === "?") value = "";
			else if (value && value[0] !== "?") value = "?" + value;
			if (value === this._search) return;
			this._search = value;
			this._searchParams = void 0;
			this._node.req.url = this.pathname + value;
		}
		get searchParams() {
			if (!this._searchParams) this._searchParams = new URLSearchParams(this.search);
			return this._searchParams;
		}
		set searchParams(value) {
			this._searchParams = value;
			this._search = value.toString();
		}
		get protocol() {
			if (!this._protocol) this._protocol = this._node.req.socket?.encrypted || this._node.req.headers["x-forwarded-proto"] === "https" ? "https:" : "http:";
			return this._protocol;
		}
		set protocol(value) {
			this._protocol = value;
		}
		get origin() {
			return `${this.protocol}//${this.host}`;
		}
		set origin(_value) {}
		get href() {
			return `${this.protocol}//${this.host}${this.pathname}${this.search}`;
		}
		set href(value) {
			const _url = new globalThis.URL(value);
			this._protocol = _url.protocol;
			this.username = _url.username;
			this.password = _url.password;
			this._hostname = _url.hostname;
			this._port = _url.port;
			this.pathname = _url.pathname;
			this.search = _url.search;
			this.hash = _url.hash;
		}
		toString() {
			return this.href;
		}
		toJSON() {
			return this.href;
		}
		get [Symbol.toStringTag]() {
			return "URL";
		}
		[kNodeInspect]() {
			return this.href;
		}
	};
	Object.setPrototypeOf(_URL.prototype, globalThis.URL.prototype);
	return _URL;
})();
function parsePath$1(input) {
	const url = (input || "/").replace(/\\/g, "/");
	const qIndex = url.indexOf("?");
	if (qIndex === -1) return [url, ""];
	return [url.slice(0, qIndex), url.slice(qIndex)];
}
function parseHost(host) {
	const s = (host || "").split(":");
	return [s[0], String(Number.parseInt(s[1]) || "")];
}

//#endregion
//#region src/adapters/_node/request.ts
const NodeRequest = /* @__PURE__ */ (() => {
	const unsupportedGetters = [
		"cache",
		"credentials",
		"destination",
		"integrity",
		"keepalive",
		"mode",
		"redirect",
		"referrer",
		"referrerPolicy"
	];
	const _Request = class Request {
		#url;
		#headers;
		#bodyUsed = false;
		#abortSignal;
		#hasBody;
		#bodyBytes;
		#blobBody;
		#formDataBody;
		#jsonBody;
		#textBody;
		#bodyStream;
		_node;
		runtime;
		constructor(nodeCtx) {
			this._node = nodeCtx;
			this.runtime = {
				name: "node",
				node: nodeCtx
			};
		}
		get ip() {
			return this._node.req.socket?.remoteAddress;
		}
		get headers() {
			if (!this.#headers) this.#headers = new NodeRequestHeaders(this._node);
			return this.#headers;
		}
		clone() {
			return new _Request({ ...this._node });
		}
		get _url() {
			if (!this.#url) this.#url = new NodeRequestURL(this._node);
			return this.#url;
		}
		get url() {
			return this._url.href;
		}
		get method() {
			return this._node.req.method || "GET";
		}
		get signal() {
			if (!this.#abortSignal) {
				this.#abortSignal = new AbortController();
				this._node.req.once("close", () => {
					this.#abortSignal?.abort();
				});
			}
			return this.#abortSignal.signal;
		}
		get bodyUsed() {
			return this.#bodyUsed;
		}
		get _hasBody() {
			if (this.#hasBody !== void 0) return this.#hasBody;
			const method = this._node.req.method?.toUpperCase();
			if (!method || !(method === "PATCH" || method === "POST" || method === "PUT" || method === "DELETE")) {
				this.#hasBody = false;
				return false;
			}
			if (!Number.parseInt(this._node.req.headers["content-length"] || "")) {
				const isChunked = (this._node.req.headers["transfer-encoding"] || "").split(",").map((e) => e.trim()).filter(Boolean).includes("chunked");
				if (!isChunked) {
					this.#hasBody = false;
					return false;
				}
			}
			this.#hasBody = true;
			return true;
		}
		get body() {
			if (!this._hasBody) return null;
			if (!this.#bodyStream) {
				this.#bodyUsed = true;
				this.#bodyStream = new ReadableStream({ start: (controller) => {
					this._node.req.on("data", (chunk) => {
						controller.enqueue(chunk);
					}).once("error", (error) => {
						controller.error(error);
						this.#abortSignal?.abort();
					}).once("close", () => {
						this.#abortSignal?.abort();
					}).once("end", () => {
						controller.close();
					});
				} });
			}
			return this.#bodyStream;
		}
		bytes() {
			if (!this.#bodyBytes) {
				const _bodyStream = this.body;
				this.#bodyBytes = _bodyStream ? _readStream(_bodyStream) : Promise.resolve(new Uint8Array());
			}
			return this.#bodyBytes;
		}
		arrayBuffer() {
			return this.bytes().then((buff) => {
				return buff.buffer.slice(buff.byteOffset, buff.byteOffset + buff.byteLength);
			});
		}
		blob() {
			if (!this.#blobBody) this.#blobBody = this.bytes().then((bytes) => {
				return new Blob([bytes], { type: this._node.req.headers["content-type"] });
			});
			return this.#blobBody;
		}
		formData() {
			if (!this.#formDataBody) this.#formDataBody = new Response(this.body, { headers: this.headers }).formData();
			return this.#formDataBody;
		}
		text() {
			if (!this.#textBody) this.#textBody = this.bytes().then((bytes) => {
				return new TextDecoder().decode(bytes);
			});
			return this.#textBody;
		}
		json() {
			if (!this.#jsonBody) this.#jsonBody = this.text().then((txt) => {
				return JSON.parse(txt);
			});
			return this.#jsonBody;
		}
		get [Symbol.toStringTag]() {
			return "Request";
		}
		[kNodeInspect]() {
			return {
				method: this.method,
				url: this.url,
				headers: this.headers
			};
		}
	};
	for (const key of unsupportedGetters) Object.defineProperty(_Request.prototype, key, {
		enumerable: true,
		configurable: false
	});
	Object.setPrototypeOf(_Request.prototype, globalThis.Request.prototype);
	return _Request;
})();
async function _readStream(stream) {
	const chunks = [];
	await stream.pipeTo(new WritableStream({ write(chunk) {
		chunks.push(chunk);
	} }));
	return Buffer.concat(chunks);
}
function toNodeHandler(fetchHandler) {
	return (nodeReq, nodeRes) => {
		const request = new NodeRequest({
			req: nodeReq,
			res: nodeRes
		});
		const res = fetchHandler(request);
		return res instanceof Promise ? res.then((resolvedRes) => sendNodeResponse(nodeRes, resolvedRes)) : sendNodeResponse(nodeRes, res);
	};
}

//#region src/object.ts
const NullProtoObj$1 = /* @__PURE__ */ (() => {
	const e = function() {};
	return e.prototype = Object.create(null), Object.freeze(e.prototype), e;
})();

//#endregion
//#region src/context.ts
/**
* Create a new router context.
*/
function createRouter$1() {
	const ctx = {
		root: { key: "" },
		static: new NullProtoObj$1()
	};
	return ctx;
}

//#endregion
//#region src/operations/_utils.ts
function splitPath$1(path) {
	const [_, ...s] = path.split("/");
	return s[s.length - 1] === "" ? s.slice(0, -1) : s;
}
function getMatchParams$1(segments, paramsMap) {
	const params = new NullProtoObj$1();
	for (const [index, name] of paramsMap) {
		const segment = index < 0 ? segments.slice(-1 * index).join("/") : segments[index];
		if (typeof name === "string") params[name] = segment;
		else {
			const match = segment.match(name);
			if (match) for (const key in match.groups) params[key] = match.groups[key];
		}
	}
	return params;
}

//#endregion
//#region src/operations/add.ts
/**
* Add a route to the router context.
*/
function addRoute$1(ctx, method = "", path, data) {
	const segments = splitPath$1(path);
	let node = ctx.root;
	let _unnamedParamIndex = 0;
	const paramsMap = [];
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment.startsWith("**")) {
			if (!node.wildcard) node.wildcard = { key: "**" };
			node = node.wildcard;
			paramsMap.push([
				-i,
				segment.split(":")[1] || "_",
				segment.length === 2
			]);
			break;
		}
		if (segment === "*" || segment.includes(":")) {
			if (!node.param) node.param = { key: "*" };
			node = node.param;
			const isOptional = segment === "*";
			paramsMap.push([
				i,
				isOptional ? `_${_unnamedParamIndex++}` : _getParamMatcher$1(segment),
				isOptional
			]);
			continue;
		}
		const child = node.static?.[segment];
		if (child) node = child;
		else {
			const staticNode = { key: segment };
			if (!node.static) node.static = new NullProtoObj$1();
			node.static[segment] = staticNode;
			node = staticNode;
		}
	}
	const hasParams = paramsMap.length > 0;
	if (!node.methods) node.methods = new NullProtoObj$1();
	if (!node.methods[method]) node.methods[method] = [];
	node.methods[method].push({
		data: data || null,
		paramsMap: hasParams ? paramsMap : void 0
	});
	if (!hasParams) ctx.static[path] = node;
}
function _getParamMatcher$1(segment) {
	if (!segment.includes(":", 1)) return segment.slice(1);
	const regex = segment.replace(/:(\w+)/g, (_, id) => `(?<${id}>[^/]+)`).replace(/\./g, "\\.");
	return new RegExp(`^${regex}$`);
}

//#endregion
//#region src/operations/find.ts
/**
* Find a route by path.
*/
function findRoute(ctx, method = "", path, opts) {
	if (path[path.length - 1] === "/") path = path.slice(0, -1);
	const staticNode = ctx.static[path];
	if (staticNode && staticNode.methods) {
		const staticMatch = staticNode.methods[method] || staticNode.methods[""];
		if (staticMatch !== void 0) return staticMatch[0];
	}
	const segments = splitPath$1(path);
	const match = _lookupTree(ctx, ctx.root, method, segments, 0)?.[0];
	if (match === void 0) return;
	return {
		data: match.data,
		params: match.paramsMap ? getMatchParams$1(segments, match.paramsMap) : void 0
	};
}
function _lookupTree(ctx, node, method, segments, index) {
	if (index === segments.length) {
		if (node.methods) {
			const match = node.methods[method] || node.methods[""];
			if (match) return match;
		}
		if (node.param && node.param.methods) {
			const match = node.param.methods[method] || node.param.methods[""];
			if (match) {
				const pMap = match[0].paramsMap;
				if (pMap?.[pMap?.length - 1]?.[2]) return match;
			}
		}
		if (node.wildcard && node.wildcard.methods) {
			const match = node.wildcard.methods[method] || node.wildcard.methods[""];
			if (match) {
				const pMap = match[0].paramsMap;
				if (pMap?.[pMap?.length - 1]?.[2]) return match;
			}
		}
		return void 0;
	}
	const segment = segments[index];
	if (node.static) {
		const staticChild = node.static[segment];
		if (staticChild) {
			const match = _lookupTree(ctx, staticChild, method, segments, index + 1);
			if (match) return match;
		}
	}
	if (node.param) {
		const match = _lookupTree(ctx, node.param, method, segments, index + 1);
		if (match) return match;
	}
	if (node.wildcard && node.wildcard.methods) return node.wildcard.methods[method] || node.wildcard.methods[""];
	return;
}

//#endregion
//#region src/regexp.ts
function routeToRegExp(route = "/") {
	const reSegments = [];
	let idCtr = 0;
	for (const segment of route.split("/")) {
		if (!segment) continue;
		if (segment === "*") reSegments.push(`(?<_${idCtr++}>[^/]*)`);
		else if (segment.startsWith("**")) reSegments.push(segment === "**" ? "?(?<_>.*)" : `?(?<${segment.slice(3)}>.+)`);
		else if (segment.includes(":")) reSegments.push(segment.replace(/:(\w+)/g, (_, id) => `(?<${id}>[^/]+)`).replace(/\./g, "\\."));
		else reSegments.push(segment);
	}
	return new RegExp(`^/${reSegments.join("/")}/?$`);
}

//#endregion
//#region src/event.ts
var H3Event = class {
	/**
	* Access to the H3 application instance.
	*/
	app;
	/**
	* Incoming HTTP request info.
	*
	* [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/Request)
	*/
	req;
	/**
	* Access to the parsed request URL.
	*
	* [MDN Reference](https://developer.mozilla.org/en-US/docs/Web/API/URL)
	*/
	url;
	/**
	* Event context.
	*/
	context;
	/**
	* @internal
	*/
	static __is_event__ = true;
	/**
	* @internal
	*/
	_res;
	constructor(req, context, app) {
		this.context = context || req.context || new NullProtoObj$1();
		this.req = req;
		this.app = app;
		const _url = req._url;
		this.url = _url && _url instanceof URL ? _url : new FastURL(req.url);
	}
	/**
	* Prepared HTTP response.
	*/
	get res() {
		if (!this._res) this._res = new H3EventResponse();
		return this._res;
	}
	/**
	* Access to runtime specific additional context.
	*
	*/
	get runtime() {
		return this.req.runtime;
	}
	/**
	* Tell the runtime about an ongoing operation that shouldn't close until the promise resolves.
	*/
	waitUntil(promise) {
		this.req.waitUntil?.(promise);
	}
	toString() {
		return `[${this.req.method}] ${this.req.url}`;
	}
	toJSON() {
		return this.toString();
	}
	/**
	* Access to the raw Node.js req/res objects.
	*
	* @deprecated Use `event.runtime.{node|deno|bun|...}.` instead.
	*/
	get node() {
		return this.req.runtime?.node;
	}
	/**
	* Access to the incoming request headers.
	*
	* @deprecated Use `event.req.headers` instead.
	*
	*/
	get headers() {
		return this.req.headers;
	}
	/**
	* Access to the incoming request url (pathname+search).
	*
	* @deprecated Use `event.url.pathname + event.url.search` instead.
	*
	* Example: `/api/hello?name=world`
	* */
	get path() {
		return this.url.pathname + this.url.search;
	}
	/**
	* Access to the incoming request method.
	*
	* @deprecated Use `event.req.method` instead.
	*/
	get method() {
		return this.req.method;
	}
};
var H3EventResponse = class {
	status;
	statusText;
	_headers;
	get headers() {
		if (!this._headers) this._headers = new Headers();
		return this._headers;
	}
};

//#endregion
//#region src/utils/sanitize.ts
const DISALLOWED_STATUS_CHARS = /[^\u0009\u0020-\u007E]/g;
/**
* Make sure the status message is safe to use in a response.
*
* Allowed characters: horizontal tabs, spaces or visible ascii characters: https://www.rfc-editor.org/rfc/rfc7230#section-3.1.2
*/
function sanitizeStatusMessage(statusMessage = "") {
	return statusMessage.replace(DISALLOWED_STATUS_CHARS, "");
}
/**
* Make sure the status code is a valid HTTP status code.
*/
function sanitizeStatusCode(statusCode, defaultStatusCode = 200) {
	if (!statusCode) return defaultStatusCode;
	if (typeof statusCode === "string") statusCode = +statusCode;
	if (statusCode < 100 || statusCode > 599) return defaultStatusCode;
	return statusCode;
}

//#endregion
//#region src/error.ts
/**
* HTTPError
*/
var HTTPError = class HTTPError extends Error {
	get name() {
		return "HTTPError";
	}
	/**
	* HTTP status code in range [200...599]
	*/
	status;
	/**
	* HTTP status text
	*
	* **NOTE:** This should be short (max 512 to 1024 characters).
	* Allowed characters are tabs, spaces, visible ASCII characters, and extended characters (byte value 128–255).
	*
	* **TIP:** Use `message` for longer error descriptions in JSON body.
	*/
	statusText;
	/**
	* Additional HTTP headers to be sent in error response.
	*/
	headers;
	/**
	* Original error object that caused this error.
	*/
	cause;
	/**
	* Additional data attached in the error JSON body under `data` key.
	*/
	data;
	/**
	* Additional top level JSON body properties to attach in the error JSON body.
	*/
	body;
	/**
	* Flag to indicate that the error was not handled by the application.
	*
	* Unhandled error stack trace, data and message are hidden in non debug mode for security reasons.
	*/
	unhandled;
	/**
	* Check if the input is an instance of HTTPError using its constructor name.
	*
	* It is safer than using `instanceof` because it works across different contexts (e.g., if the error was thrown in a different module).
	*/
	static isError(input) {
		return input instanceof Error && input?.name === "HTTPError";
	}
	/**
	* Create a new HTTPError with the given status code and optional status text and details.
	*
	* @example
	*
	* HTTPError.status(404)
	* HTTPError.status(418, "I'm a teapot")
	* HTTPError.status(403, "Forbidden", { message: "Not authenticated" })
	*/
	static status(status, statusText, details) {
		return new HTTPError({
			...details,
			statusText,
			status
		});
	}
	constructor(arg1, arg2) {
		let messageInput;
		let details;
		if (typeof arg1 === "string") {
			messageInput = arg1;
			details = arg2;
		} else details = arg1;
		const status = sanitizeStatusCode(details?.status || (details?.cause)?.status || details?.status || details?.statusCode, 500);
		const statusText = sanitizeStatusMessage(details?.statusText || (details?.cause)?.statusText || details?.statusText || details?.statusMessage);
		const message = messageInput || details?.message || (details?.cause)?.message || details?.statusText || details?.statusMessage || [
			"HTTPError",
			status,
			statusText
		].filter(Boolean).join(" ");
		super(message, { cause: details });
		this.cause = details;
		Error.captureStackTrace?.(this, this.constructor);
		this.status = status;
		this.statusText = statusText || void 0;
		const rawHeaders = details?.headers || (details?.cause)?.headers;
		this.headers = rawHeaders ? new Headers(rawHeaders) : void 0;
		this.unhandled = details?.unhandled ?? (details?.cause)?.unhandled ?? void 0;
		this.data = details?.data;
		this.body = details?.body;
	}
	/**
	* @deprecated Use `status`
	*/
	get statusCode() {
		return this.status;
	}
	/**
	* @deprecated Use `statusText`
	*/
	get statusMessage() {
		return this.statusText;
	}
	toJSON() {
		const unhandled = this.unhandled;
		return {
			status: this.status,
			statusText: this.statusText,
			unhandled,
			message: unhandled ? "HTTPError" : this.message,
			data: unhandled ? void 0 : this.data,
			...unhandled ? void 0 : this.body
		};
	}
};
function isJSONSerializable$1(value, _type) {
	if (value === null || value === void 0) return true;
	if (_type !== "object") return _type === "boolean" || _type === "number" || _type === "string";
	if (typeof value.toJSON === "function") return true;
	if (Array.isArray(value)) return true;
	if (typeof value.pipe === "function" || typeof value.pipeTo === "function") return false;
	if (value instanceof NullProtoObj$1) return true;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

//#endregion
//#region src/response.ts
const kNotFound = /* @__PURE__ */ Symbol.for("h3.notFound");
const kHandled = /* @__PURE__ */ Symbol.for("h3.handled");
function toResponse(val, event, config = {}) {
	if (typeof val?.then === "function") return (val.catch?.((error) => error) || Promise.resolve(val)).then((resolvedVal) => toResponse(resolvedVal, event, config));
	const response = prepareResponse(val, event, config);
	if (typeof response?.then === "function") return toResponse(response, event, config);
	const { onResponse: onResponse$1 } = config;
	return onResponse$1 ? Promise.resolve(onResponse$1(response, event)).then(() => response) : response;
}
function prepareResponse(val, event, config, nested) {
	if (val === kHandled) return new NodeResponse(null);
	if (val === kNotFound) val = new HTTPError({
		status: 404,
		message: `Cannot find any route matching [${event.req.method}] ${event.url}`
	});
	if (val && val instanceof Error) {
		const isHTTPError = HTTPError.isError(val);
		const error = isHTTPError ? val : new HTTPError(val);
		if (!isHTTPError) {
			error.unhandled = true;
			if (val?.stack) error.stack = val.stack;
		}
		if (error.unhandled && !config.silent) console.error(error);
		const { onError: onError$1 } = config;
		return onError$1 && !nested ? Promise.resolve(onError$1(error, event)).catch((error$1) => error$1).then((newVal) => prepareResponse(newVal ?? val, event, config, true)) : errorResponse(error, config.debug);
	}
	const eventHeaders = event.res._headers;
	if (!(val instanceof Response)) {
		const res = prepareResponseBody(val, event, config);
		const status = event.res.status;
		return new NodeResponse(nullBody(event.req.method, status) ? null : res.body, {
			status,
			statusText: event.res.statusText,
			headers: res.headers && eventHeaders ? mergeHeaders$1(res.headers, eventHeaders) : res.headers || eventHeaders
		});
	}
	if (!eventHeaders) return val;
	return new NodeResponse(nullBody(event.req.method, val.status) ? null : val.body, {
		status: val.status,
		statusText: val.statusText,
		headers: mergeHeaders$1(eventHeaders, val.headers)
	});
}
function mergeHeaders$1(base, merge) {
	const mergedHeaders = new Headers(base);
	for (const [name, value] of merge) if (name === "set-cookie") mergedHeaders.append(name, value);
	else mergedHeaders.set(name, value);
	return mergedHeaders;
}
const emptyHeaders = /* @__PURE__ */ new Headers({ "content-length": "0" });
const jsonHeaders = /* @__PURE__ */ new Headers({ "content-type": "application/json;charset=UTF-8" });
function prepareResponseBody(val, event, config) {
	if (val === null || val === void 0) return {
		body: "",
		headers: emptyHeaders
	};
	const valType = typeof val;
	if (valType === "string") return { body: val };
	if (val instanceof Uint8Array) {
		event.res.headers.set("content-length", val.byteLength.toString());
		return { body: val };
	}
	if (isJSONSerializable$1(val, valType)) return {
		body: JSON.stringify(val, void 0, config.debug ? 2 : void 0),
		headers: jsonHeaders
	};
	if (valType === "bigint") return {
		body: val.toString(),
		headers: jsonHeaders
	};
	if (val instanceof Blob) {
		const headers = {
			"content-type": val.type,
			"content-length": val.size.toString()
		};
		let filename = val.name;
		if (filename) {
			filename = encodeURIComponent(filename);
			headers["content-disposition"] = `filename="${filename}"; filename*=UTF-8''${filename}`;
		}
		return {
			body: val.stream(),
			headers
		};
	}
	if (valType === "symbol") return { body: val.toString() };
	if (valType === "function") return { body: `${val.name}()` };
	return { body: val };
}
function nullBody(method, status) {
	return method === "HEAD" || status === 100 || status === 101 || status === 102 || status === 204 || status === 205 || status === 304;
}
function errorResponse(error, debug) {
	return new NodeResponse(JSON.stringify({
		...error.toJSON(),
		stack: debug && error.stack ? error.stack.split("\n").map((l) => l.trim()) : void 0
	}, void 0, debug ? 2 : void 0), {
		status: error.status,
		statusText: error.statusText,
		headers: error.headers ? mergeHeaders$1(jsonHeaders, error.headers) : jsonHeaders
	});
}
function normalizeMiddleware(input, opts = {}) {
	const matcher = createMatcher(opts);
	if (!matcher && (input.length > 1 || input.constructor?.name === "AsyncFunction")) return input;
	return (event, next) => {
		if (matcher && !matcher(event)) return next();
		const res = input(event, next);
		return res === void 0 || res === kNotFound ? next() : res;
	};
}
function createMatcher(opts) {
	if (!opts.route && !opts.method && !opts.match) return void 0;
	const routeMatcher = opts.route ? routeToRegExp(opts.route) : void 0;
	const method = opts.method?.toUpperCase();
	return (event) => {
		if (method && event.req.method !== method) return false;
		if (opts.match && !opts.match(event)) return false;
		if (!routeMatcher) return true;
		const match = event.url.pathname.match(routeMatcher);
		if (!match) return false;
		if (match.groups) event.context.middlewareParams = {
			...event.context.middlewareParams,
			...match.groups
		};
		return true;
	};
}
function callMiddleware(event, middleware, handler, index = 0) {
	if (index === middleware.length) return handler(event);
	const fn = middleware[index];
	let nextCalled;
	let nextResult;
	const next = () => {
		if (nextCalled) return nextResult;
		nextCalled = true;
		nextResult = callMiddleware(event, middleware, handler, index + 1);
		return nextResult;
	};
	const ret = fn(event, next);
	return ret === void 0 || ret === kNotFound ? next() : typeof ret?.then === "function" ? ret.then((resolved) => resolved === void 0 || resolved === kNotFound ? next() : resolved) : ret;
}
/**
* Checks if the input is an object with `{ req: Request }` signature.
* @param input - The input to check.
* @returns True if the input is is `{ req: Request }`
*/
function isHTTPEvent(input) {
	return input?.req instanceof Request;
}
/**
* Gets the context of the event, if it does not exists, initializes a new context on `req.context`.
*/
function getEventContext(event) {
	if (event.context) return event.context;
	event.req.context ??= {};
	return event.req.context;
}

//#endregion
//#region src/utils/request.ts
/**
* Convert input into a web [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request).
*
* If input is a relative URL, it will be normalized into a full path based on headers.
*
* If input is already a Request and no options are provided, it will be returned as-is.
*/
function toRequest(input, options) {
	if (typeof input === "string") {
		let url = input;
		if (url[0] === "/") {
			const headers = options?.headers ? new Headers(options.headers) : void 0;
			const host = headers?.get("host") || "localhost";
			const proto = headers?.get("x-forwarded-proto") === "https" ? "https" : "http";
			url = `${proto}://${host}${url}`;
		}
		return new Request(url, options);
	} else if (options || input instanceof URL) return new Request(input, options);
	return input;
}
/**
* Get matched route params.
*
* If `decode` option is `true`, it will decode the matched route params using `decodeURIComponent`.
*
* @example
* app.get("/", (event) => {
*   const params = getRouterParams(event); // { key: "value" }
* });
*/
function getRouterParams(event, opts = {}) {
	const context = getEventContext(event);
	let params = context.params || {};
	if (opts.decode) {
		params = { ...params };
		for (const key in params) params[key] = decodeURIComponent(params[key]);
	}
	return params;
}
/**
* Get a matched route param by name.
*
* If `decode` option is `true`, it will decode the matched route param using `decodeURI`.
*
* @example
* app.get("/", (event) => {
*   const param = getRouterParam(event, "key");
* });
*/
function getRouterParam(event, name, opts = {}) {
	const params = getRouterParams(event, opts);
	return params[name];
}
/**
* Get the request hostname.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If no host header is found, it will default to "localhost".
*
* @example
* app.get("/", (event) => {
*   const host = getRequestHost(event); // "example.com"
* });
*/
function getRequestHost(event, opts = {}) {
	if (opts.xForwardedHost) {
		const _header = event.req.headers.get("x-forwarded-host");
		const xForwardedHost = (_header || "").split(",").shift()?.trim();
		if (xForwardedHost) return xForwardedHost;
	}
	return event.req.headers.get("host") || "";
}
/**
* Get the request protocol.
*
* If `x-forwarded-proto` header is set to "https", it will return "https". You can disable this behavior by setting `xForwardedProto` to `false`.
*
* If protocol cannot be determined, it will default to "http".
*
* @example
* app.get("/", (event) => {
*   const protocol = getRequestProtocol(event); // "https"
* });
*/
function getRequestProtocol(event, opts = {}) {
	if (opts.xForwardedProto !== false) {
		const forwardedProto = event.req.headers.get("x-forwarded-proto");
		if (forwardedProto === "https") return "https";
		if (forwardedProto === "http") return "http";
	}
	const url = event.url || new URL(event.req.url);
	return url.protocol.slice(0, -1);
}
/**
* Generated the full incoming request URL.
*
* If `xForwardedHost` is `true`, it will use the `x-forwarded-host` header if it exists.
*
* If `xForwardedProto` is `false`, it will not use the `x-forwarded-proto` header.
*
* @example
* app.get("/", (event) => {
*   const url = getRequestURL(event); // "https://example.com/path"
* });
*/
function getRequestURL(event, opts = {}) {
	const url = new URL(event.url || event.req.url);
	url.protocol = getRequestProtocol(event, opts);
	if (opts.xForwardedHost) {
		const host = getRequestHost(event, opts);
		if (host) {
			url.host = host;
			if (!host.includes(":")) url.port = "";
		}
	}
	return url;
}

//#endregion
//#region src/h3.ts
const H3Core = /* @__PURE__ */ (() => {
	const HTTPMethods = [
		"GET",
		"POST",
		"PUT",
		"DELETE",
		"PATCH",
		"HEAD",
		"OPTIONS",
		"CONNECT",
		"TRACE"
	];
	class H3Core$1 {
		_middleware;
		_routes = [];
		config;
		constructor(config = {}) {
			this._middleware = [];
			this.config = config;
			this.fetch = this.fetch.bind(this);
			this.request = this.request.bind(this);
			this.handler = this.handler.bind(this);
			config.plugins?.forEach((plugin) => plugin(this));
		}
		fetch(request) {
			return this._request(request);
		}
		request(_req, _init, context) {
			return this._request(toRequest(_req, _init), context);
		}
		_request(request, context) {
			const event = new H3Event(request, context, this);
			let handlerRes;
			try {
				if (this.config.onRequest) {
					const hookRes = this.config.onRequest(event);
					handlerRes = typeof hookRes?.then === "function" ? hookRes.then(() => this.handler(event)) : this.handler(event);
				} else handlerRes = this.handler(event);
			} catch (error) {
				handlerRes = Promise.reject(error);
			}
			return toResponse(handlerRes, event, this.config);
		}
		/**
		* Immediately register an H3 plugin.
		*/
		register(plugin) {
			plugin(this);
			return this;
		}
		_findRoute(_event) {}
		_addRoute(_route) {
			this._routes.push(_route);
		}
		handler(event) {
			const route = this._findRoute(event);
			if (route) {
				event.context.params = route.params;
				event.context.matchedRoute = route.data;
			}
			const middleware = route?.data.middleware ? [...this._middleware, ...route.data.middleware] : this._middleware;
			return callMiddleware(event, middleware, () => {
				return route ? route.data.handler(event) : kNotFound;
			});
		}
		mount(base, input) {
			if ("handler" in input) {
				if (input._middleware.length > 0) this._middleware.push((event, next) => {
					return event.url.pathname.startsWith(base) ? callMiddleware(event, input._middleware, next) : next();
				});
				for (const r of input._routes) this._addRoute({
					...r,
					route: base + r.route
				});
			} else {
				const fetchHandler = "fetch" in input ? input.fetch : input;
				this.all(`${base}/**`, (event) => {
					const url = new URL(event.url);
					url.pathname = url.pathname.slice(base.length) || "/";
					return fetchHandler(new Request(url, event.req));
				});
			}
			return this;
		}
		all(route, handler, opts) {
			return this.on("", route, handler, opts);
		}
		on(method, route, handler, opts) {
			const _method = (method || "").toUpperCase();
			route = new URL(route, "http://_").pathname;
			this._addRoute({
				method: _method,
				route,
				handler,
				middleware: opts?.middleware,
				meta: {
					...handler.meta,
					...opts?.meta
				}
			});
			return this;
		}
		use(arg1, arg2, arg3) {
			let route;
			let fn;
			let opts;
			if (typeof arg1 === "string") {
				route = arg1;
				fn = arg2;
				opts = arg3;
			} else {
				fn = arg1;
				opts = arg2;
			}
			this._middleware.push(normalizeMiddleware(fn, route ? {
				...opts,
				route
			} : opts));
			return this;
		}
	}
	for (const method of HTTPMethods) H3Core$1.prototype[method.toLowerCase()] = function(route, handler, opts) {
		return this.on(method, route, handler, opts);
	};
	return H3Core$1;
})();
var H3 = class extends H3Core {
	/**
	* @internal
	*/
	_rou3;
	constructor(config = {}) {
		super(config);
		this._rou3 = createRouter$1();
	}
	_findRoute(_event) {
		return findRoute(this._rou3, _event.req.method, _event.url.pathname);
	}
	_addRoute(_route) {
		addRoute$1(this._rou3, _route.method, _route.route, _route);
		super._addRoute(_route);
	}
};

//#endregion
//#region src/handler.ts
function defineHandler(arg1) {
	if (typeof arg1 === "function") return handlerWithFetch(arg1);
	const { middleware, handler, meta } = arg1;
	const _handler = handlerWithFetch(middleware?.length ? (event) => callMiddleware(event, middleware, handler) : handler);
	_handler.meta = meta;
	return _handler;
}
function handlerWithFetch(handler) {
	return Object.assign(handler, { fetch: (req) => {
		if (typeof req === "string") req = new URL(req, "http://_");
		if (req instanceof URL) req = new Request(req);
		const event = new H3Event(req);
		try {
			return Promise.resolve(toResponse(handler(event), event));
		} catch (error) {
			return Promise.resolve(toResponse(error, event));
		}
	} });
}
function defineLazyEventHandler(load) {
	let _promise;
	let _resolved;
	const resolveHandler = () => {
		if (_resolved) return Promise.resolve(_resolved);
		if (!_promise) _promise = Promise.resolve(load()).then((r) => {
			const handler = r.default || r;
			if (typeof handler !== "function") throw new TypeError("Invalid lazy handler result. It should be a function:", handler);
			_resolved = { handler: r.default || r };
			return _resolved;
		});
		return _promise;
	};
	return defineHandler((event) => {
		if (_resolved) return _resolved.handler(event);
		return resolveHandler().then((r) => r.handler(event));
	});
}
/**
* Send a redirect response to the client.
*
* It adds the `location` header to the response and sets the status code to 302 by default.
*
* In the body, it sends a simple HTML page with a meta refresh tag to redirect the client in case the headers are ignored.
*
* @example
* app.get("/", (event) => {
*   return redirect(event, "https://example.com");
* });
*
* @example
* app.get("/", (event) => {
*   return redirect(event, "https://example.com", 301); // Permanent redirect
* });
*/
function redirect(event, location, code = 302) {
	event.res.status = sanitizeStatusCode(code, event.res.status);
	event.res.headers.set("location", location);
	const encodedLoc = location.replace(/"/g, "%22");
	return html(event, `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0; url=${encodedLoc}"></head></html>`);
}
/**
* Respond with HTML content.
*
* @example
* app.get("/", (event) => html(event, "<h1>Hello, World!</h1>"));
*/
function html(event, content) {
	if (!event.res.headers.has("content-type")) event.res.headers.set("content-type", "text/html; charset=utf-8");
	return content;
}

//#endregion
//#region src/utils/internal/proxy.ts
const PayloadMethods = new Set([
	"PATCH",
	"POST",
	"PUT",
	"DELETE"
]);
const ignoredHeaders = new Set([
	"transfer-encoding",
	"connection",
	"keep-alive",
	"upgrade",
	"expect",
	"host",
	"accept"
]);
function rewriteCookieProperty(header, map, property) {
	const _map = typeof map === "string" ? { "*": map } : map;
	return header.replace(new RegExp(`(;\\s*${property}=)([^;]+)`, "gi"), (match, prefix, previousValue) => {
		let newValue;
		if (previousValue in _map) newValue = _map[previousValue];
		else if ("*" in _map) newValue = _map["*"];
		else return match;
		return newValue ? prefix + newValue : "";
	});
}
function mergeHeaders$2(defaults$1, ...inputs) {
	const _inputs = inputs.filter(Boolean);
	if (_inputs.length === 0) return defaults$1;
	const merged = new Headers(defaults$1);
	for (const input of _inputs) {
		const entries = Array.isArray(input) ? input : typeof input.entries === "function" ? input.entries() : Object.entries(input);
		for (const [key, value] of entries) if (value !== void 0) merged.set(key, value);
	}
	return merged;
}

//#endregion
//#region src/utils/proxy.ts
/**
* Proxy the incoming request to a target URL.
*/
async function proxyRequest(event, target, opts = {}) {
	const requestBody = PayloadMethods.has(event.req.method) ? event.req.body : void 0;
	const method = opts.fetchOptions?.method || event.req.method;
	const fetchHeaders = mergeHeaders$2(getProxyRequestHeaders(event, {
		host: target.startsWith("/"),
		forwardHeaders: opts.forwardHeaders,
		filterHeaders: opts.filterHeaders
	}), opts.fetchOptions?.headers, opts.headers);
	return proxy(event, target, {
		...opts,
		fetchOptions: {
			method,
			body: requestBody,
			duplex: requestBody ? "half" : void 0,
			...opts.fetchOptions,
			headers: fetchHeaders
		}
	});
}
/**
* Make a proxy request to a target URL and send the response back to the client.
*/
async function proxy(event, target, opts = {}) {
	const fetchOptions = {
		headers: opts.headers,
		...opts.fetchOptions
	};
	let response;
	try {
		response = target[0] === "/" ? await event.app.fetch(createSubRequest(event, target, fetchOptions)) : await fetch(target, fetchOptions);
	} catch (error) {
		throw new HTTPError({
			status: 502,
			cause: error
		});
	}
	event.res.statusText = sanitizeStatusMessage(response.statusText);
	const cookies = [];
	for (const [key, value] of response.headers.entries()) {
		if (key === "content-encoding") continue;
		if (key === "content-length") continue;
		if (key === "set-cookie") {
			cookies.push(...splitSetCookieString(value));
			continue;
		}
		event.res.headers.set(key, value);
	}
	if (cookies.length > 0) {
		const _cookies = cookies.map((cookie) => {
			if (opts.cookieDomainRewrite) cookie = rewriteCookieProperty(cookie, opts.cookieDomainRewrite, "domain");
			if (opts.cookiePathRewrite) cookie = rewriteCookieProperty(cookie, opts.cookiePathRewrite, "path");
			return cookie;
		});
		for (const cookie of _cookies) event.res.headers.append("set-cookie", cookie);
	}
	if (opts.onResponse) await opts.onResponse(event, response);
	return response.body;
}
/**
* Get the request headers object without headers known to cause issues when proxying.
*/
function getProxyRequestHeaders(event, opts) {
	const headers = new NullProtoObj$1();
	for (const [name, value] of event.req.headers.entries()) {
		if (opts?.filterHeaders?.includes(name)) continue;
		if (opts?.forwardHeaders?.includes(name)) {
			headers[name] = value;
			continue;
		}
		if (!ignoredHeaders.has(name) || name === "host" && opts?.host) {
			headers[name] = value;
			continue;
		}
	}
	return headers;
}
function createSubRequest(event, path, init) {
	const url = new URL(path, event.url);
	const req = new Request(url, init);
	req.runtime = event.req.runtime;
	req.waitUntil = event.req.waitUntil;
	req.ip = event.req.ip;
	return req;
}

//#endregion
//#region src/utils/cache.ts
/**
* Check request caching headers (`If-Modified-Since`) and add caching headers (Last-Modified, Cache-Control)
* Note: `public` cache control will be added by default
* @returns `true` when cache headers are matching. When `true` is returned, no response should be sent anymore
*/
function handleCacheHeaders(event, opts) {
	const cacheControls = ["public", ...opts.cacheControls || []];
	let cacheMatched = false;
	if (opts.maxAge !== void 0) cacheControls.push(`max-age=${+opts.maxAge}`, `s-maxage=${+opts.maxAge}`);
	if (opts.modifiedTime) {
		const modifiedTime = new Date(opts.modifiedTime);
		const ifModifiedSince = event.req.headers.get("if-modified-since");
		event.res.headers.set("last-modified", modifiedTime.toUTCString());
		if (ifModifiedSince && new Date(ifModifiedSince) >= modifiedTime) cacheMatched = true;
	}
	if (opts.etag) {
		event.res.headers.set("etag", opts.etag);
		const ifNonMatch = event.req.headers.get("if-none-match");
		if (ifNonMatch === opts.etag) cacheMatched = true;
	}
	event.res.headers.set("cache-control", cacheControls.join(", "));
	if (cacheMatched) {
		event.res.status = 304;
		return true;
	}
	return false;
}
/** Please use `defineHandler`  */
const eventHandler = defineHandler;
/** Please use `defineLazyEventHandler` */
const lazyEventHandler = defineLazyEventHandler;

// https://github.com/node-fetch/node-fetch
// Native browser APIs
const fetch$2 = (...args) => globalThis.fetch(...args);
const Headers$2 = globalThis.Headers;
const AbortController$2 = globalThis.AbortController;
// Top-level exported helpers (from node-fetch v3)
const redirectStatus = new Set([
	301,
	302,
	303,
	307,
	308
]);
const isRedirect = (code) => redirectStatus.has(code);
// node-fetch v2
fetch$2.Promise = globalThis.Promise;
fetch$2.isRedirect = isRedirect;

const HASH_RE = /#/g;
const AMPERSAND_RE = /&/g;
const SLASH_RE = /\//g;
const EQUAL_RE = /=/g;
const PLUS_RE = /\+/g;
const ENC_CARET_RE = /%5e/gi;
const ENC_BACKTICK_RE = /%60/gi;
const ENC_PIPE_RE = /%7c/gi;
const ENC_SPACE_RE = /%20/gi;
const ENC_SLASH_RE = /%2f/gi;
function encode(text) {
  return encodeURI("" + text).replace(ENC_PIPE_RE, "|");
}
function encodeQueryValue(input) {
  return encode(typeof input === "string" ? input : JSON.stringify(input)).replace(PLUS_RE, "%2B").replace(ENC_SPACE_RE, "+").replace(HASH_RE, "%23").replace(AMPERSAND_RE, "%26").replace(ENC_BACKTICK_RE, "`").replace(ENC_CARET_RE, "^").replace(SLASH_RE, "%2F");
}
function encodeQueryKey(text) {
  return encodeQueryValue(text).replace(EQUAL_RE, "%3D");
}
function decode(text = "") {
  try {
    return decodeURIComponent("" + text);
  } catch {
    return "" + text;
  }
}
function decodePath(text) {
  return decode(text.replace(ENC_SLASH_RE, "%252F"));
}
function decodeQueryKey(text) {
  return decode(text.replace(PLUS_RE, " "));
}
function decodeQueryValue(text) {
  return decode(text.replace(PLUS_RE, " "));
}

function parseQuery(parametersString = "") {
  const object = /* @__PURE__ */ Object.create(null);
  if (parametersString[0] === "?") {
    parametersString = parametersString.slice(1);
  }
  for (const parameter of parametersString.split("&")) {
    const s = parameter.match(/([^=]+)=?(.*)/) || [];
    if (s.length < 2) {
      continue;
    }
    const key = decodeQueryKey(s[1]);
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = decodeQueryValue(s[2] || "");
    if (object[key] === void 0) {
      object[key] = value;
    } else if (Array.isArray(object[key])) {
      object[key].push(value);
    } else {
      object[key] = [object[key], value];
    }
  }
  return object;
}
function encodeQueryItem(key, value) {
  if (typeof value === "number" || typeof value === "boolean") {
    value = String(value);
  }
  if (!value) {
    return encodeQueryKey(key);
  }
  if (Array.isArray(value)) {
    return value.map(
      (_value) => `${encodeQueryKey(key)}=${encodeQueryValue(_value)}`
    ).join("&");
  }
  return `${encodeQueryKey(key)}=${encodeQueryValue(value)}`;
}
function stringifyQuery(query) {
  return Object.keys(query).filter((k) => query[k] !== void 0).map((k) => encodeQueryItem(k, query[k])).filter(Boolean).join("&");
}

const PROTOCOL_STRICT_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{1,2})/;
const PROTOCOL_REGEX = /^[\s\w\0+.-]{2,}:([/\\]{2})?/;
const PROTOCOL_RELATIVE_REGEX = /^([/\\]\s*){2,}[^/\\]/;
const JOIN_LEADING_SLASH_RE = /^\.?\//;
function hasProtocol(inputString, opts = {}) {
  if (typeof opts === "boolean") {
    opts = { acceptRelative: opts };
  }
  if (opts.strict) {
    return PROTOCOL_STRICT_REGEX.test(inputString);
  }
  return PROTOCOL_REGEX.test(inputString) || (opts.acceptRelative ? PROTOCOL_RELATIVE_REGEX.test(inputString) : false);
}
function hasTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/");
  }
}
function withoutTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return (hasTrailingSlash(input) ? input.slice(0, -1) : input) || "/";
  }
}
function withTrailingSlash(input = "", respectQueryAndFragment) {
  {
    return input.endsWith("/") ? input : input + "/";
  }
}
function hasLeadingSlash(input = "") {
  return input.startsWith("/");
}
function withLeadingSlash(input = "") {
  return hasLeadingSlash(input) ? input : "/" + input;
}
function withBase(input, base) {
  if (isEmptyURL(base) || hasProtocol(input)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (input.startsWith(_base)) {
    return input;
  }
  return joinURL(_base, input);
}
function withoutBase(input, base) {
  if (isEmptyURL(base)) {
    return input;
  }
  const _base = withoutTrailingSlash(base);
  if (!input.startsWith(_base)) {
    return input;
  }
  const trimmed = input.slice(_base.length);
  return trimmed[0] === "/" ? trimmed : "/" + trimmed;
}
function withQuery(input, query) {
  const parsed = parseURL(input);
  const mergedQuery = { ...parseQuery(parsed.search), ...query };
  parsed.search = stringifyQuery(mergedQuery);
  return stringifyParsedURL(parsed);
}
function isEmptyURL(url) {
  return !url || url === "/";
}
function isNonEmptyURL(url) {
  return url && url !== "/";
}
function joinURL(base, ...input) {
  let url = base || "";
  for (const segment of input.filter((url2) => isNonEmptyURL(url2))) {
    if (url) {
      const _segment = segment.replace(JOIN_LEADING_SLASH_RE, "");
      url = withTrailingSlash(url) + _segment;
    } else {
      url = segment;
    }
  }
  return url;
}

const protocolRelative = Symbol.for("ufo:protocolRelative");
function parseURL(input = "", defaultProto) {
  const _specialProtoMatch = input.match(
    /^[\s\0]*(blob:|data:|javascript:|vbscript:)(.*)/i
  );
  if (_specialProtoMatch) {
    const [, _proto, _pathname = ""] = _specialProtoMatch;
    return {
      protocol: _proto.toLowerCase(),
      pathname: _pathname,
      href: _proto + _pathname,
      auth: "",
      host: "",
      search: "",
      hash: ""
    };
  }
  if (!hasProtocol(input, { acceptRelative: true })) {
    return parsePath(input);
  }
  const [, protocol = "", auth, hostAndPath = ""] = input.replace(/\\/g, "/").match(/^[\s\0]*([\w+.-]{2,}:)?\/\/([^/@]+@)?(.*)/) || [];
  let [, host = "", path = ""] = hostAndPath.match(/([^#/?]*)(.*)?/) || [];
  if (protocol === "file:") {
    path = path.replace(/\/(?=[A-Za-z]:)/, "");
  }
  const { pathname, search, hash } = parsePath(path);
  return {
    protocol: protocol.toLowerCase(),
    auth: auth ? auth.slice(0, Math.max(0, auth.length - 1)) : "",
    host,
    pathname,
    search,
    hash,
    [protocolRelative]: !protocol
  };
}
function parsePath(input = "") {
  const [pathname = "", search = "", hash = ""] = (input.match(/([^#?]*)(\?[^#]*)?(#.*)?/) || []).splice(1);
  return {
    pathname,
    search,
    hash
  };
}
function stringifyParsedURL(parsed) {
  const pathname = parsed.pathname || "";
  const search = parsed.search ? (parsed.search.startsWith("?") ? "" : "?") + parsed.search : "";
  const hash = parsed.hash || "";
  const auth = parsed.auth ? parsed.auth + "@" : "";
  const host = parsed.host || "";
  const proto = parsed.protocol || parsed[protocolRelative] ? (parsed.protocol || "") + "//" : "";
  return proto + auth + host + pathname + search + hash;
}

class FetchError extends Error {
  constructor(message, opts) {
    super(message, opts);
    this.name = "FetchError";
    if (opts?.cause && !this.cause) {
      this.cause = opts.cause;
    }
  }
}
function createFetchError(ctx) {
  const errorMessage = ctx.error?.message || ctx.error?.toString() || "";
  const method = ctx.request?.method || ctx.options?.method || "GET";
  const url = ctx.request?.url || String(ctx.request) || "/";
  const requestStr = `[${method}] ${JSON.stringify(url)}`;
  const statusStr = ctx.response ? `${ctx.response.status} ${ctx.response.statusText}` : "<no response>";
  const message = `${requestStr}: ${statusStr}${errorMessage ? ` ${errorMessage}` : ""}`;
  const fetchError = new FetchError(
    message,
    ctx.error ? { cause: ctx.error } : void 0
  );
  for (const key of ["request", "options", "response"]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx[key];
      }
    });
  }
  for (const [key, refKey] of [
    ["data", "_data"],
    ["status", "status"],
    ["statusCode", "status"],
    ["statusText", "statusText"],
    ["statusMessage", "statusText"]
  ]) {
    Object.defineProperty(fetchError, key, {
      get() {
        return ctx.response && ctx.response[refKey];
      }
    });
  }
  return fetchError;
}

const payloadMethods = new Set(
  Object.freeze(["PATCH", "POST", "PUT", "DELETE"])
);
function isPayloadMethod(method = "GET") {
  return payloadMethods.has(method.toUpperCase());
}
function isJSONSerializable(value) {
  if (value === void 0) {
    return false;
  }
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean" || t === null) {
    return true;
  }
  if (t !== "object") {
    return false;
  }
  if (Array.isArray(value)) {
    return true;
  }
  if (value.buffer) {
    return false;
  }
  return value.constructor && value.constructor.name === "Object" || typeof value.toJSON === "function";
}
const textTypes = /* @__PURE__ */ new Set([
  "image/svg",
  "application/xml",
  "application/xhtml",
  "application/html"
]);
const JSON_RE = /^application\/(?:[\w!#$%&*.^`~-]*\+)?json(;.+)?$/i;
function detectResponseType(_contentType = "") {
  if (!_contentType) {
    return "json";
  }
  const contentType = _contentType.split(";").shift() || "";
  if (JSON_RE.test(contentType)) {
    return "json";
  }
  if (textTypes.has(contentType) || contentType.startsWith("text/")) {
    return "text";
  }
  return "blob";
}
function resolveFetchOptions(request, input, defaults, Headers) {
  const headers = mergeHeaders(
    input?.headers ?? request?.headers,
    defaults?.headers,
    Headers
  );
  let query;
  if (defaults?.query || defaults?.params || input?.params || input?.query) {
    query = {
      ...defaults?.params,
      ...defaults?.query,
      ...input?.params,
      ...input?.query
    };
  }
  return {
    ...defaults,
    ...input,
    query,
    params: query,
    headers
  };
}
function mergeHeaders(input, defaults, Headers) {
  if (!defaults) {
    return new Headers(input);
  }
  const headers = new Headers(defaults);
  if (input) {
    for (const [key, value] of Symbol.iterator in input || Array.isArray(input) ? input : new Headers(input)) {
      headers.set(key, value);
    }
  }
  return headers;
}
async function callHooks(context, hooks) {
  if (hooks) {
    if (Array.isArray(hooks)) {
      for (const hook of hooks) {
        await hook(context);
      }
    } else {
      await hooks(context);
    }
  }
}

const retryStatusCodes = /* @__PURE__ */ new Set([
  408,
  // Request Timeout
  409,
  // Conflict
  425,
  // Too Early (Experimental)
  429,
  // Too Many Requests
  500,
  // Internal Server Error
  502,
  // Bad Gateway
  503,
  // Service Unavailable
  504
  // Gateway Timeout
]);
const nullBodyResponses = /* @__PURE__ */ new Set([101, 204, 205, 304]);
function createFetch(globalOptions = {}) {
  const {
    fetch = globalThis.fetch,
    Headers = globalThis.Headers,
    AbortController = globalThis.AbortController
  } = globalOptions;
  async function onError(context) {
    const isAbort = context.error && context.error.name === "AbortError" && !context.options.timeout || false;
    if (context.options.retry !== false && !isAbort) {
      let retries;
      if (typeof context.options.retry === "number") {
        retries = context.options.retry;
      } else {
        retries = isPayloadMethod(context.options.method) ? 0 : 1;
      }
      const responseCode = context.response && context.response.status || 500;
      if (retries > 0 && (Array.isArray(context.options.retryStatusCodes) ? context.options.retryStatusCodes.includes(responseCode) : retryStatusCodes.has(responseCode))) {
        const retryDelay = typeof context.options.retryDelay === "function" ? context.options.retryDelay(context) : context.options.retryDelay || 0;
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
        return $fetchRaw(context.request, {
          ...context.options,
          retry: retries - 1
        });
      }
    }
    const error = createFetchError(context);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(error, $fetchRaw);
    }
    throw error;
  }
  const $fetchRaw = async function $fetchRaw2(_request, _options = {}) {
    const context = {
      request: _request,
      options: resolveFetchOptions(
        _request,
        _options,
        globalOptions.defaults,
        Headers
      ),
      response: void 0,
      error: void 0
    };
    if (context.options.method) {
      context.options.method = context.options.method.toUpperCase();
    }
    if (context.options.onRequest) {
      await callHooks(context, context.options.onRequest);
    }
    if (typeof context.request === "string") {
      if (context.options.baseURL) {
        context.request = withBase(context.request, context.options.baseURL);
      }
      if (context.options.query) {
        context.request = withQuery(context.request, context.options.query);
        delete context.options.query;
      }
      if ("query" in context.options) {
        delete context.options.query;
      }
      if ("params" in context.options) {
        delete context.options.params;
      }
    }
    if (context.options.body && isPayloadMethod(context.options.method)) {
      if (isJSONSerializable(context.options.body)) {
        context.options.body = typeof context.options.body === "string" ? context.options.body : JSON.stringify(context.options.body);
        context.options.headers = new Headers(context.options.headers || {});
        if (!context.options.headers.has("content-type")) {
          context.options.headers.set("content-type", "application/json");
        }
        if (!context.options.headers.has("accept")) {
          context.options.headers.set("accept", "application/json");
        }
      } else if (
        // ReadableStream Body
        "pipeTo" in context.options.body && typeof context.options.body.pipeTo === "function" || // Node.js Stream Body
        typeof context.options.body.pipe === "function"
      ) {
        if (!("duplex" in context.options)) {
          context.options.duplex = "half";
        }
      }
    }
    let abortTimeout;
    if (!context.options.signal && context.options.timeout) {
      const controller = new AbortController();
      abortTimeout = setTimeout(() => {
        const error = new Error(
          "[TimeoutError]: The operation was aborted due to timeout"
        );
        error.name = "TimeoutError";
        error.code = 23;
        controller.abort(error);
      }, context.options.timeout);
      context.options.signal = controller.signal;
    }
    try {
      context.response = await fetch(
        context.request,
        context.options
      );
    } catch (error) {
      context.error = error;
      if (context.options.onRequestError) {
        await callHooks(
          context,
          context.options.onRequestError
        );
      }
      return await onError(context);
    } finally {
      if (abortTimeout) {
        clearTimeout(abortTimeout);
      }
    }
    const hasBody = (context.response.body || // https://github.com/unjs/ofetch/issues/324
    // https://github.com/unjs/ofetch/issues/294
    // https://github.com/JakeChampion/fetch/issues/1454
    context.response._bodyInit) && !nullBodyResponses.has(context.response.status) && context.options.method !== "HEAD";
    if (hasBody) {
      const responseType = (context.options.parseResponse ? "json" : context.options.responseType) || detectResponseType(context.response.headers.get("content-type") || "");
      switch (responseType) {
        case "json": {
          const data = await context.response.text();
          const parseFunction = context.options.parseResponse || destr;
          context.response._data = parseFunction(data);
          break;
        }
        case "stream": {
          context.response._data = context.response.body || context.response._bodyInit;
          break;
        }
        default: {
          context.response._data = await context.response[responseType]();
        }
      }
    }
    if (context.options.onResponse) {
      await callHooks(
        context,
        context.options.onResponse
      );
    }
    if (!context.options.ignoreResponseError && context.response.status >= 400 && context.response.status < 600) {
      if (context.options.onResponseError) {
        await callHooks(
          context,
          context.options.onResponseError
        );
      }
      return await onError(context);
    }
    return context.response;
  };
  const $fetch = async function $fetch2(request, options) {
    const r = await $fetchRaw(request, options);
    return r._data;
  };
  $fetch.raw = $fetchRaw;
  $fetch.native = (...args) => fetch(...args);
  $fetch.create = (defaultOptions = {}, customGlobalOptions = {}) => createFetch({
    ...globalOptions,
    ...customGlobalOptions,
    defaults: {
      ...globalOptions.defaults,
      ...customGlobalOptions.defaults,
      ...defaultOptions
    }
  });
  return $fetch;
}

function createNodeFetch() {
  const useKeepAlive = JSON.parse(process.env.FETCH_KEEP_ALIVE || "false");
  if (!useKeepAlive) {
    return fetch$2;
  }
  const agentOptions = { keepAlive: true };
  const httpAgent = new http.Agent(agentOptions);
  const httpsAgent = new https.Agent(agentOptions);
  const nodeFetchOptions = {
    agent(parsedURL) {
      return parsedURL.protocol === "http:" ? httpAgent : httpsAgent;
    }
  };
  return function nodeFetchWithKeepAlive(input, init) {
    return fetch$2(input, { ...nodeFetchOptions, ...init });
  };
}
const fetch$1 = globalThis.fetch ? (...args) => globalThis.fetch(...args) : createNodeFetch();
const Headers$1 = globalThis.Headers || Headers$2;
const AbortController$1 = globalThis.AbortController || AbortController$2;
createFetch({ fetch: fetch$1, Headers: Headers$1, AbortController: AbortController$1 });

function wrapToPromise(value) {
  if (!value || typeof value.then !== "function") {
    return Promise.resolve(value);
  }
  return value;
}
function asyncCall(function_, ...arguments_) {
  try {
    return wrapToPromise(function_(...arguments_));
  } catch (error) {
    return Promise.reject(error);
  }
}
function isPrimitive(value) {
  const type = typeof value;
  return value === null || type !== "object" && type !== "function";
}
function isPureObject(value) {
  const proto = Object.getPrototypeOf(value);
  return !proto || proto.isPrototypeOf(Object);
}
function stringify(value) {
  if (isPrimitive(value)) {
    return String(value);
  }
  if (isPureObject(value) || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value.toJSON === "function") {
    return stringify(value.toJSON());
  }
  throw new Error("[unstorage] Cannot stringify value!");
}
const BASE64_PREFIX = "base64:";
function serializeRaw(value) {
  if (typeof value === "string") {
    return value;
  }
  return BASE64_PREFIX + base64Encode(value);
}
function deserializeRaw(value) {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.startsWith(BASE64_PREFIX)) {
    return value;
  }
  return base64Decode(value.slice(BASE64_PREFIX.length));
}
function base64Decode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input, "base64");
  }
  return Uint8Array.from(
    globalThis.atob(input),
    (c) => c.codePointAt(0)
  );
}
function base64Encode(input) {
  if (globalThis.Buffer) {
    return Buffer.from(input).toString("base64");
  }
  return globalThis.btoa(String.fromCodePoint(...input));
}

const storageKeyProperties = [
  "has",
  "hasItem",
  "get",
  "getItem",
  "getItemRaw",
  "set",
  "setItem",
  "setItemRaw",
  "del",
  "remove",
  "removeItem",
  "getMeta",
  "setMeta",
  "removeMeta",
  "getKeys",
  "clear",
  "mount",
  "unmount"
];
function prefixStorage(storage, base) {
  base = normalizeBaseKey(base);
  if (!base) {
    return storage;
  }
  const nsStorage = { ...storage };
  for (const property of storageKeyProperties) {
    nsStorage[property] = (key = "", ...args) => (
      // @ts-ignore
      storage[property](base + key, ...args)
    );
  }
  nsStorage.getKeys = (key = "", ...arguments_) => storage.getKeys(base + key, ...arguments_).then((keys) => keys.map((key2) => key2.slice(base.length)));
  nsStorage.keys = nsStorage.getKeys;
  nsStorage.getItems = async (items, commonOptions) => {
    const prefixedItems = items.map(
      (item) => typeof item === "string" ? base + item : { ...item, key: base + item.key }
    );
    const results = await storage.getItems(prefixedItems, commonOptions);
    return results.map((entry) => ({
      key: entry.key.slice(base.length),
      value: entry.value
    }));
  };
  nsStorage.setItems = async (items, commonOptions) => {
    const prefixedItems = items.map((item) => ({
      key: base + item.key,
      value: item.value,
      options: item.options
    }));
    return storage.setItems(prefixedItems, commonOptions);
  };
  return nsStorage;
}
function normalizeKey$1(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
}
function joinKeys(...keys) {
  return normalizeKey$1(keys.join(":"));
}
function normalizeBaseKey(base) {
  base = normalizeKey$1(base);
  return base ? base + ":" : "";
}
function filterKeyByDepth(key, depth) {
  if (depth === void 0) {
    return true;
  }
  let substrCount = 0;
  let index = key.indexOf(":");
  while (index > -1) {
    substrCount++;
    index = key.indexOf(":", index + 1);
  }
  return substrCount <= depth;
}
function filterKeyByBase(key, base) {
  if (base) {
    return key.startsWith(base) && key[key.length - 1] !== "$";
  }
  return key[key.length - 1] !== "$";
}

function defineDriver$1(factory) {
  return factory;
}

const DRIVER_NAME$1 = "memory";
const memory = defineDriver$1(() => {
  const data = /* @__PURE__ */ new Map();
  return {
    name: DRIVER_NAME$1,
    getInstance: () => data,
    hasItem(key) {
      return data.has(key);
    },
    getItem(key) {
      return data.get(key) ?? null;
    },
    getItemRaw(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    setItemRaw(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    },
    getKeys() {
      return [...data.keys()];
    },
    clear() {
      data.clear();
    },
    dispose() {
      data.clear();
    }
  };
});

function createStorage(options = {}) {
  const context = {
    mounts: { "": options.driver || memory() },
    mountpoints: [""],
    watching: false,
    watchListeners: [],
    unwatch: {}
  };
  const getMount = (key) => {
    for (const base of context.mountpoints) {
      if (key.startsWith(base)) {
        return {
          base,
          relativeKey: key.slice(base.length),
          driver: context.mounts[base]
        };
      }
    }
    return {
      base: "",
      relativeKey: key,
      driver: context.mounts[""]
    };
  };
  const getMounts = (base, includeParent) => {
    return context.mountpoints.filter(
      (mountpoint) => mountpoint.startsWith(base) || includeParent && base.startsWith(mountpoint)
    ).map((mountpoint) => ({
      relativeBase: base.length > mountpoint.length ? base.slice(mountpoint.length) : void 0,
      mountpoint,
      driver: context.mounts[mountpoint]
    }));
  };
  const onChange = (event, key) => {
    if (!context.watching) {
      return;
    }
    key = normalizeKey$1(key);
    for (const listener of context.watchListeners) {
      listener(event, key);
    }
  };
  const startWatch = async () => {
    if (context.watching) {
      return;
    }
    context.watching = true;
    for (const mountpoint in context.mounts) {
      context.unwatch[mountpoint] = await watch(
        context.mounts[mountpoint],
        onChange,
        mountpoint
      );
    }
  };
  const stopWatch = async () => {
    if (!context.watching) {
      return;
    }
    for (const mountpoint in context.unwatch) {
      await context.unwatch[mountpoint]();
    }
    context.unwatch = {};
    context.watching = false;
  };
  const runBatch = (items, commonOptions, cb) => {
    const batches = /* @__PURE__ */ new Map();
    const getBatch = (mount) => {
      let batch = batches.get(mount.base);
      if (!batch) {
        batch = {
          driver: mount.driver,
          base: mount.base,
          items: []
        };
        batches.set(mount.base, batch);
      }
      return batch;
    };
    for (const item of items) {
      const isStringItem = typeof item === "string";
      const key = normalizeKey$1(isStringItem ? item : item.key);
      const value = isStringItem ? void 0 : item.value;
      const options2 = isStringItem || !item.options ? commonOptions : { ...commonOptions, ...item.options };
      const mount = getMount(key);
      getBatch(mount).items.push({
        key,
        value,
        relativeKey: mount.relativeKey,
        options: options2
      });
    }
    return Promise.all([...batches.values()].map((batch) => cb(batch))).then(
      (r) => r.flat()
    );
  };
  const storage = {
    // Item
    hasItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.hasItem, relativeKey, opts);
    },
    getItem(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => destr(value)
      );
    },
    getItems(items, commonOptions = {}) {
      return runBatch(items, commonOptions, (batch) => {
        if (batch.driver.getItems) {
          return asyncCall(
            batch.driver.getItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              options: item.options
            })),
            commonOptions
          ).then(
            (r) => r.map((item) => ({
              key: joinKeys(batch.base, item.key),
              value: destr(item.value)
            }))
          );
        }
        return Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.getItem,
              item.relativeKey,
              item.options
            ).then((value) => ({
              key: item.key,
              value: destr(value)
            }));
          })
        );
      });
    },
    getItemRaw(key, opts = {}) {
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.getItemRaw) {
        return asyncCall(driver.getItemRaw, relativeKey, opts);
      }
      return asyncCall(driver.getItem, relativeKey, opts).then(
        (value) => deserializeRaw(value)
      );
    },
    async setItem(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.setItem) {
        return;
      }
      await asyncCall(driver.setItem, relativeKey, stringify(value), opts);
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async setItems(items, commonOptions) {
      await runBatch(items, commonOptions, async (batch) => {
        if (batch.driver.setItems) {
          return asyncCall(
            batch.driver.setItems,
            batch.items.map((item) => ({
              key: item.relativeKey,
              value: stringify(item.value),
              options: item.options
            })),
            commonOptions
          );
        }
        if (!batch.driver.setItem) {
          return;
        }
        await Promise.all(
          batch.items.map((item) => {
            return asyncCall(
              batch.driver.setItem,
              item.relativeKey,
              stringify(item.value),
              item.options
            );
          })
        );
      });
    },
    async setItemRaw(key, value, opts = {}) {
      if (value === void 0) {
        return storage.removeItem(key, opts);
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (driver.setItemRaw) {
        await asyncCall(driver.setItemRaw, relativeKey, value, opts);
      } else if (driver.setItem) {
        await asyncCall(driver.setItem, relativeKey, serializeRaw(value), opts);
      } else {
        return;
      }
      if (!driver.watch) {
        onChange("update", key);
      }
    },
    async removeItem(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { removeMeta: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      if (!driver.removeItem) {
        return;
      }
      await asyncCall(driver.removeItem, relativeKey, opts);
      if (opts.removeMeta || opts.removeMata) {
        await asyncCall(driver.removeItem, relativeKey + "$", opts);
      }
      if (!driver.watch) {
        onChange("remove", key);
      }
    },
    // Meta
    async getMeta(key, opts = {}) {
      if (typeof opts === "boolean") {
        opts = { nativeOnly: opts };
      }
      key = normalizeKey$1(key);
      const { relativeKey, driver } = getMount(key);
      const meta = /* @__PURE__ */ Object.create(null);
      if (driver.getMeta) {
        Object.assign(meta, await asyncCall(driver.getMeta, relativeKey, opts));
      }
      if (!opts.nativeOnly) {
        const value = await asyncCall(
          driver.getItem,
          relativeKey + "$",
          opts
        ).then((value_) => destr(value_));
        if (value && typeof value === "object") {
          if (typeof value.atime === "string") {
            value.atime = new Date(value.atime);
          }
          if (typeof value.mtime === "string") {
            value.mtime = new Date(value.mtime);
          }
          Object.assign(meta, value);
        }
      }
      return meta;
    },
    setMeta(key, value, opts = {}) {
      return this.setItem(key + "$", value, opts);
    },
    removeMeta(key, opts = {}) {
      return this.removeItem(key + "$", opts);
    },
    // Keys
    async getKeys(base, opts = {}) {
      base = normalizeBaseKey(base);
      const mounts = getMounts(base, true);
      let maskedMounts = [];
      const allKeys = [];
      let allMountsSupportMaxDepth = true;
      for (const mount of mounts) {
        if (!mount.driver.flags?.maxDepth) {
          allMountsSupportMaxDepth = false;
        }
        const rawKeys = await asyncCall(
          mount.driver.getKeys,
          mount.relativeBase,
          opts
        );
        for (const key of rawKeys) {
          const fullKey = mount.mountpoint + normalizeKey$1(key);
          if (!maskedMounts.some((p) => fullKey.startsWith(p))) {
            allKeys.push(fullKey);
          }
        }
        maskedMounts = [
          mount.mountpoint,
          ...maskedMounts.filter((p) => !p.startsWith(mount.mountpoint))
        ];
      }
      const shouldFilterByDepth = opts.maxDepth !== void 0 && !allMountsSupportMaxDepth;
      return allKeys.filter(
        (key) => (!shouldFilterByDepth || filterKeyByDepth(key, opts.maxDepth)) && filterKeyByBase(key, base)
      );
    },
    // Utils
    async clear(base, opts = {}) {
      base = normalizeBaseKey(base);
      await Promise.all(
        getMounts(base, false).map(async (m) => {
          if (m.driver.clear) {
            return asyncCall(m.driver.clear, m.relativeBase, opts);
          }
          if (m.driver.removeItem) {
            const keys = await m.driver.getKeys(m.relativeBase || "", opts);
            return Promise.all(
              keys.map((key) => m.driver.removeItem(key, opts))
            );
          }
        })
      );
    },
    async dispose() {
      await Promise.all(
        Object.values(context.mounts).map((driver) => dispose(driver))
      );
    },
    async watch(callback) {
      await startWatch();
      context.watchListeners.push(callback);
      return async () => {
        context.watchListeners = context.watchListeners.filter(
          (listener) => listener !== callback
        );
        if (context.watchListeners.length === 0) {
          await stopWatch();
        }
      };
    },
    async unwatch() {
      context.watchListeners = [];
      await stopWatch();
    },
    // Mount
    mount(base, driver) {
      base = normalizeBaseKey(base);
      if (base && context.mounts[base]) {
        throw new Error(`already mounted at ${base}`);
      }
      if (base) {
        context.mountpoints.push(base);
        context.mountpoints.sort((a, b) => b.length - a.length);
      }
      context.mounts[base] = driver;
      if (context.watching) {
        Promise.resolve(watch(driver, onChange, base)).then((unwatcher) => {
          context.unwatch[base] = unwatcher;
        }).catch(console.error);
      }
      return storage;
    },
    async unmount(base, _dispose = true) {
      base = normalizeBaseKey(base);
      if (!base || !context.mounts[base]) {
        return;
      }
      if (context.watching && base in context.unwatch) {
        context.unwatch[base]?.();
        delete context.unwatch[base];
      }
      if (_dispose) {
        await dispose(context.mounts[base]);
      }
      context.mountpoints = context.mountpoints.filter((key) => key !== base);
      delete context.mounts[base];
    },
    getMount(key = "") {
      key = normalizeKey$1(key) + ":";
      const m = getMount(key);
      return {
        driver: m.driver,
        base: m.base
      };
    },
    getMounts(base = "", opts = {}) {
      base = normalizeKey$1(base);
      const mounts = getMounts(base, opts.parents);
      return mounts.map((m) => ({
        driver: m.driver,
        base: m.mountpoint
      }));
    },
    // Aliases
    keys: (base, opts = {}) => storage.getKeys(base, opts),
    get: (key, opts = {}) => storage.getItem(key, opts),
    set: (key, value, opts = {}) => storage.setItem(key, value, opts),
    has: (key, opts = {}) => storage.hasItem(key, opts),
    del: (key, opts = {}) => storage.removeItem(key, opts),
    remove: (key, opts = {}) => storage.removeItem(key, opts)
  };
  return storage;
}
function watch(driver, onChange, base) {
  return driver.watch ? driver.watch((event, key) => onChange(event, base + key)) : () => {
  };
}
async function dispose(driver) {
  if (typeof driver.dispose === "function") {
    await asyncCall(driver.dispose);
  }
}

const _assets = {

};

const normalizeKey = function normalizeKey(key) {
  if (!key) {
    return "";
  }
  return key.split("?")[0]?.replace(/[/\\]/g, ":").replace(/:+/g, ":").replace(/^:|:$/g, "") || "";
};

const assets$1 = {
  getKeys() {
    return Promise.resolve(Object.keys(_assets))
  },
  hasItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(id in _assets)
  },
  getItem (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].import() : null)
  },
  getMeta (id) {
    id = normalizeKey(id);
    return Promise.resolve(_assets[id] ? _assets[id].meta : {})
  }
};

const packageResponses = sqliteTable("package_responses", {
  key: text("key").primaryKey().notNull(),
  value: text("value").$type().notNull(),
  expires: numeric("expires").notNull(),
  mtime: numeric("mtime").notNull(),
  integrity: text("integrity").notNull(),
  package_name: text("package_name").notNull(),
  package_version: text("package_version")
});
const tarballResponses = sqliteTable("tarball_responses", {
  key: text("key").primaryKey().notNull(),
  value: text("value").$type().notNull(),
  expires: numeric("expires").notNull(),
  mtime: numeric("mtime").notNull(),
  integrity: text("integrity").notNull()
});
const packages = sqliteTable("packages", {
  name: text("name").primaryKey().notNull(),
  packument: text("packument").$type().notNull()
});
const versions = sqliteTable("versions", {
  spec: text("spec").primaryKey().notNull(),
  manifest: text("manifest").$type().notNull()
});
sqliteTable("tokens", {
  token: text("token").primaryKey(),
  uuid: text("uuid").notNull(),
  scope: text("scope").$type()
});

const definePackagesDriver = (getDb) => defineDriver$1(() => {
  return {
    name: "packages-storage",
    options: {},
    async getItem(key) {
      console.log("[cache] req", key);
      const keyId = key.split(":").pop();
      const isPackage = keyId.startsWith("npm___package___");
      const isVersion = keyId.startsWith("npm___version___");
      console.time(`[cache] read package ${key}`);
      const [response] = await getDb().select().from(packageResponses).where(eq(packageResponses.key, key)).limit(1).execute();
      console.timeEnd(`[cache] read package ${key}`);
      if (!response) {
        return void 0;
      }
      const packageName = response.package_name;
      let body;
      if (isPackage) {
        console.time(`[cache] read packument ${key}`);
        const [packumentRow] = await getDb().select().from(packages).where(eq(packages.name, packageName)).limit(1).execute();
        console.timeEnd(`[cache] read packument ${key}`);
        if (!packumentRow) {
          return void 0;
        }
        const packument = JSON.parse(packumentRow.packument);
        body = {
          ...packument
          // versions: Object.fromEntries(
          //   versionRows.map(version => [
          //     version.spec.split('@').pop()!,
          //     JSON.parse(version.manifest),
          //   ]),
          // ),
        };
      } else if (isVersion) {
        const packageVersion = response.package_version;
        const [version] = await getDb().select().from(versions).where(
          eq(
            versions.spec,
            `${packageName}@${packageVersion}`
          )
        ).limit(1).execute();
        if (!version) {
          return void 0;
        }
        body = JSON.parse(version.manifest);
      }
      const x = {
        expires: response.expires,
        mtime: response.mtime,
        integrity: response.integrity,
        value: {
          ...JSON.parse(response.value),
          body: JSON.stringify(body)
        }
      };
      console.log("[cache] hit", key);
      return x;
    },
    async setItemRaw(key, { expires, mtime, integrity, value }) {
      console.log("[cache] set", key);
      const keyId = key.split(":").pop();
      const isPackage = keyId.startsWith("npm___package___");
      const isVersion = keyId.startsWith("npm___version___");
      const { body: bodyStream, ...valueWithoutBody } = value;
      const bodyText = await text$1(bodyStream);
      const body = JSON.parse(bodyText);
      const name = body.name;
      const stringifiedValueWithoutBody = JSON.stringify(valueWithoutBody);
      await getDb().insert(packageResponses).values({
        key,
        value: stringifiedValueWithoutBody,
        expires,
        mtime,
        integrity,
        package_name: name,
        package_version: isVersion ? body.version : null
      }).onConflictDoUpdate({
        target: packageResponses.key,
        set: {
          value: stringifiedValueWithoutBody,
          expires,
          mtime,
          integrity
        }
      });
      if (isPackage) {
        const stringifiedPackument = JSON.stringify(body);
        await getDb().insert(packages).values({
          name,
          packument: stringifiedPackument
        }).onConflictDoUpdate({
          target: packages.name,
          set: {
            packument: stringifiedPackument
          }
        });
      }
      if (isVersion) {
        const spec = `${name}@${body.version}`;
        const stringifiedManifest = JSON.stringify(body);
        await getDb().insert(versions).values({
          spec,
          manifest: stringifiedManifest
        }).onConflictDoUpdate({
          target: versions.spec,
          set: {
            manifest: stringifiedManifest
          }
        });
      }
      console.log("[cache] set done", key);
    },
    // Not implemented since the Nitro's cache event handler does not use them
    async hasItem(key, _opts) {
      return false;
    },
    async removeItem(key, _opts) {
    },
    async getKeys(base, _opts) {
      return [];
    },
    async clear(base, _opts) {
    },
    async dispose() {
    },
    async watch() {
      return () => {
      };
    }
  };
});

const getDb = () => drizzle({
  connection: {
    url: "file:.data/db.sqlite"
  }
});

const _47Users_47lukekarrys_47projects_47vltpkg_47vltpkg_47src_47registry_45nitro_47src_47drivers_47packages_45node_46ts = definePackagesDriver(getDb);

const defineTarballsDriver = (getDb, fsDriver) => defineDriver$1(() => {
  const getFilePath = (key) => {
    const keyId = key.split(":").pop().replace("npm___tarball___", "");
    const keyBase = basename(keyId, ".json");
    return keyBase + ".tgz";
  };
  return {
    name: "tarballs-storage",
    async getItem(key) {
      console.log("[cache] req", key);
      console.time(`[cache] read tarball ${key}`);
      const [[response], exists] = await Promise.all([
        getDb().select().from(tarballResponses).where(eq(tarballResponses.key, key)).limit(1).execute(),
        fsDriver.hasItem(getFilePath(key))
      ]);
      console.timeEnd(`[cache] read tarball ${key}`);
      if (!response || !exists) {
        return void 0;
      }
      console.log("[cache] hit", key);
      return {
        expires: response.expires,
        mtime: response.mtime,
        integrity: response.integrity,
        value: {
          ...JSON.parse(response.value),
          body: await fsDriver.getItemRaw(getFilePath(key))
        }
      };
    },
    async setItemRaw(key, { expires, mtime, integrity, value }) {
      console.log("[cache] set", key);
      const { body, ...valueWithoutBody } = value;
      const stringifiedValueWithoutBody = JSON.stringify(valueWithoutBody);
      await Promise.all([
        getDb().insert(tarballResponses).values({
          key,
          value: stringifiedValueWithoutBody,
          expires,
          mtime,
          integrity
        }).onConflictDoUpdate({
          target: tarballResponses.key,
          set: {
            value: stringifiedValueWithoutBody,
            expires,
            mtime,
            integrity
          }
        }),
        fsDriver.setItemRaw(getFilePath(key), body)
      ]);
      console.log("[cache] set done", key);
    },
    // Not implemented since the Nitro's cache event handler does not use them
    async hasItem(key) {
      return false;
    },
    async removeItem(key) {
    },
    async getKeys(base) {
      return [];
    },
    async clear(base) {
    },
    async dispose() {
    },
    async watch() {
      return () => {
      };
    }
  };
});

const base = resolve$1(process.cwd(), ".data/tarballs");
mkdirSync(base, { recursive: true });
const fsDriver = {
  hasItem: (key) => access(join(base, key)).then(() => true).catch(() => false),
  getItemRaw: async (key) => createReadStream(join(base, key)),
  setItemRaw: (key, value) => {
    return pipeline(value, createWriteStream(key));
  }
};
const _47Users_47lukekarrys_47projects_47vltpkg_47vltpkg_47src_47registry_45nitro_47src_47drivers_47tarballs_45node_46ts = defineTarballsDriver(getDb, fsDriver);

function defineDriver(factory) {
  return factory;
}
function createError(driver, message, opts) {
  const err = new Error(`[unstorage] [${driver}] ${message}`, opts);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(err, createError);
  }
  return err;
}
function createRequiredError(driver, name) {
  if (Array.isArray(name)) {
    return createError(
      driver,
      `Missing some of the required options ${name.map((n) => "`" + n + "`").join(", ")}`
    );
  }
  return createError(driver, `Missing required option \`${name}\`.`);
}

function ignoreNotfound(err) {
  return err.code === "ENOENT" || err.code === "EISDIR" ? null : err;
}
function ignoreExists(err) {
  return err.code === "EEXIST" ? null : err;
}
async function writeFile(path, data, encoding) {
  await ensuredir(dirname$1(path));
  return promises.writeFile(path, data, encoding);
}
function readFile(path, encoding) {
  return promises.readFile(path, encoding).catch(ignoreNotfound);
}
function unlink(path) {
  return promises.unlink(path).catch(ignoreNotfound);
}
function readdir(dir) {
  return promises.readdir(dir, { withFileTypes: true }).catch(ignoreNotfound).then((r) => r || []);
}
async function ensuredir(dir) {
  if (existsSync(dir)) {
    return;
  }
  await ensuredir(dirname$1(dir)).catch(ignoreExists);
  await promises.mkdir(dir).catch(ignoreExists);
}
async function readdirRecursive(dir, ignore, maxDepth) {
  if (ignore && ignore(dir)) {
    return [];
  }
  const entries = await readdir(dir);
  const files = [];
  await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        if (maxDepth === void 0 || maxDepth > 0) {
          const dirFiles = await readdirRecursive(
            entryPath,
            ignore,
            maxDepth === void 0 ? void 0 : maxDepth - 1
          );
          files.push(...dirFiles.map((f) => entry.name + "/" + f));
        }
      } else {
        if (!(ignore && ignore(entry.name))) {
          files.push(entry.name);
        }
      }
    })
  );
  return files;
}
async function rmRecursive(dir) {
  const entries = await readdir(dir);
  await Promise.all(
    entries.map((entry) => {
      const entryPath = resolve$1(dir, entry.name);
      if (entry.isDirectory()) {
        return rmRecursive(entryPath).then(() => promises.rmdir(entryPath));
      } else {
        return promises.unlink(entryPath);
      }
    })
  );
}

const PATH_TRAVERSE_RE = /\.\.:|\.\.$/;
const DRIVER_NAME = "fs-lite";
const unstorage_47drivers_47fs_45lite = defineDriver((opts = {}) => {
  if (!opts.base) {
    throw createRequiredError(DRIVER_NAME, "base");
  }
  opts.base = resolve$1(opts.base);
  const r = (key) => {
    if (PATH_TRAVERSE_RE.test(key)) {
      throw createError(
        DRIVER_NAME,
        `Invalid key: ${JSON.stringify(key)}. It should not contain .. segments`
      );
    }
    const resolved = join(opts.base, key.replace(/:/g, "/"));
    return resolved;
  };
  return {
    name: DRIVER_NAME,
    options: opts,
    flags: {
      maxDepth: true
    },
    hasItem(key) {
      return existsSync(r(key));
    },
    getItem(key) {
      return readFile(r(key), "utf8");
    },
    getItemRaw(key) {
      return readFile(r(key));
    },
    async getMeta(key) {
      const { atime, mtime, size, birthtime, ctime } = await promises.stat(r(key)).catch(() => ({}));
      return { atime, mtime, size, birthtime, ctime };
    },
    setItem(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value, "utf8");
    },
    setItemRaw(key, value) {
      if (opts.readOnly) {
        return;
      }
      return writeFile(r(key), value);
    },
    removeItem(key) {
      if (opts.readOnly) {
        return;
      }
      return unlink(r(key));
    },
    getKeys(_base, topts) {
      return readdirRecursive(r("."), opts.ignore, topts?.maxDepth);
    },
    async clear() {
      if (opts.readOnly || opts.noClear) {
        return;
      }
      await rmRecursive(r("."));
    }
  };
});

const storage = createStorage({});

storage.mount('/assets', assets$1);

storage.mount('packages', _47Users_47lukekarrys_47projects_47vltpkg_47vltpkg_47src_47registry_45nitro_47src_47drivers_47packages_45node_46ts({"driver":"/Users/lukekarrys/projects/vltpkg/vltpkg/src/registry-nitro/src/drivers/packages-node.ts"}));
storage.mount('tarballs', _47Users_47lukekarrys_47projects_47vltpkg_47vltpkg_47src_47registry_45nitro_47src_47drivers_47tarballs_45node_46ts({"driver":"/Users/lukekarrys/projects/vltpkg/vltpkg/src/registry-nitro/src/drivers/tarballs-node.ts"}));
storage.mount('data', unstorage_47drivers_47fs_45lite({"driver":"fsLite","base":"./.data/kv"}));

function useStorage(base = "") {
  return base ? prefixStorage(storage, base) : storage;
}

function serialize(o){return typeof o=="string"?`'${o}'`:new c().serialize(o)}const c=/*@__PURE__*/function(){class o{#t=new Map;compare(t,r){const e=typeof t,n=typeof r;return e==="string"&&n==="string"?t.localeCompare(r):e==="number"&&n==="number"?t-r:String.prototype.localeCompare.call(this.serialize(t,true),this.serialize(r,true))}serialize(t,r){if(t===null)return "null";switch(typeof t){case "string":return r?t:`'${t}'`;case "bigint":return `${t}n`;case "object":return this.$object(t);case "function":return this.$function(t)}return String(t)}serializeObject(t){const r=Object.prototype.toString.call(t);if(r!=="[object Object]")return this.serializeBuiltInType(r.length<10?`unknown:${r}`:r.slice(8,-1),t);const e=t.constructor,n=e===Object||e===void 0?"":e.name;if(n!==""&&globalThis[n]===e)return this.serializeBuiltInType(n,t);if(typeof t.toJSON=="function"){const i=t.toJSON();return n+(i!==null&&typeof i=="object"?this.$object(i):`(${this.serialize(i)})`)}return this.serializeObjectEntries(n,Object.entries(t))}serializeBuiltInType(t,r){const e=this["$"+t];if(e)return e.call(this,r);if(typeof r?.entries=="function")return this.serializeObjectEntries(t,r.entries());throw new Error(`Cannot serialize ${t}`)}serializeObjectEntries(t,r){const e=Array.from(r).sort((i,a)=>this.compare(i[0],a[0]));let n=`${t}{`;for(let i=0;i<e.length;i++){const[a,l]=e[i];n+=`${this.serialize(a,true)}:${this.serialize(l)}`,i<e.length-1&&(n+=",");}return n+"}"}$object(t){let r=this.#t.get(t);return r===void 0&&(this.#t.set(t,`#${this.#t.size}`),r=this.serializeObject(t),this.#t.set(t,r)),r}$function(t){const r=Function.prototype.toString.call(t);return r.slice(-15)==="[native code] }"?`${t.name||""}()[native]`:`${t.name}(${t.length})${r.replace(/\s*\n\s*/g,"")}`}$Array(t){let r="[";for(let e=0;e<t.length;e++)r+=this.serialize(t[e]),e<t.length-1&&(r+=",");return r+"]"}$Date(t){try{return `Date(${t.toISOString()})`}catch{return "Date(null)"}}$ArrayBuffer(t){return `ArrayBuffer[${new Uint8Array(t).join(",")}]`}$Set(t){return `Set${this.$Array(Array.from(t).sort((r,e)=>this.compare(r,e)))}`}$Map(t){return this.serializeObjectEntries("Map",t.entries())}}for(const s of ["Error","RegExp","URL"])o.prototype["$"+s]=function(t){return `${s}(${t})`};for(const s of ["Int8Array","Uint8Array","Uint8ClampedArray","Int16Array","Uint16Array","Int32Array","Uint32Array","Float32Array","Float64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join(",")}]`};for(const s of ["BigInt64Array","BigUint64Array"])o.prototype["$"+s]=function(t){return `${s}[${t.join("n,")}${t.length>0?"n":""}]`};return o}();

const e=globalThis.process?.getBuiltinModule?.("crypto")?.hash,r="sha256",s="base64url";function digest(t){if(e)return e(r,t,s);const o=createHash(r).update(t);return globalThis.process?.versions?.webcontainer?o.digest().toString(s):o.digest(s)}

function hash(input) {
  return digest(serialize(input));
}

function defaultCacheOptions() {
  return {
    name: "_",
    base: "/cache",
    swr: true,
    maxAge: 1
  };
}
function defineCachedFunction(fn, opts = {}) {
  opts = { ...defaultCacheOptions(), ...opts };
  const pending = {};
  const group = opts.group || "nitro/functions";
  const name = opts.name || fn.name || "_";
  const integrity = opts.integrity || hash([fn, opts]);
  const validate = opts.validate || ((entry) => entry.value !== void 0);
  async function get(key, resolver, shouldInvalidateCache, event) {
    const cacheKey = [opts.base, group, name, key + ".json"].filter(Boolean).join(":").replace(/:\/$/, ":index");
    let entry = await useStorage().getItem(cacheKey).catch((error) => {
      console.error(`[cache] Cache read error.`, error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }) || {};
    if (typeof entry !== "object") {
      entry = {};
      const error = new Error("Malformed data read from cache.");
      console.error("[cache]", error);
      useNitroApp().captureError(error, { event, tags: ["cache"] });
    }
    const ttl = (opts.maxAge ?? 0) * 1e3;
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    const expired = shouldInvalidateCache || entry.integrity !== integrity || ttl && Date.now() - (entry.mtime || 0) > ttl || validate(entry) === false;
    const _resolve = async () => {
      const isPending = pending[key];
      if (!isPending) {
        if (entry.value !== void 0 && (opts.staleMaxAge || 0) >= 0 && opts.swr === false) {
          entry.value = void 0;
          entry.integrity = void 0;
          entry.mtime = void 0;
          entry.expires = void 0;
        }
        pending[key] = Promise.resolve(resolver());
      }
      try {
        entry.value = await pending[key];
      } catch (error) {
        if (!isPending) {
          delete pending[key];
        }
        throw error;
      }
      if (!isPending) {
        entry.mtime = Date.now();
        entry.integrity = integrity;
        delete pending[key];
        if (validate(entry) !== false) {
          let setOpts;
          if (opts.maxAge && !opts.swr) {
            setOpts = { ttl: opts.maxAge };
          }
          let cacheEntry = entry;
          let setItem = useStorage().setItem;
          if (opts.streaming && entry.value?.body instanceof ReadableStream) {
            const [streamForCache, streamForResponse] = entry.value.body.tee();
            cacheEntry = {
              ...entry,
              value: {
                ...entry.value,
                body: streamForCache
              }
            };
            entry.value.body = streamForResponse;
            setItem = useStorage().setItemRaw;
          }
          const promise = setItem(cacheKey, cacheEntry, setOpts).catch((error) => {
            console.error(`[cache] Cache write error.`, error);
            useNitroApp().captureError(error, { event, tags: ["cache"] });
          });
          if (typeof event?.req?.waitUntil === "function") {
            event.req.waitUntil(promise);
          } else if (typeof event?.context?.waitUntil === "function") {
            event.context.waitUntil(promise);
          }
        }
      }
    };
    const _resolvePromise = expired ? _resolve() : Promise.resolve();
    if (entry.value === void 0) {
      await _resolvePromise;
    } else if (expired && event && event.req.waitUntil) {
      event.req.waitUntil(_resolvePromise);
    } else if (expired && event && event.context.waitUntil) {
      event.context.waitUntil(_resolvePromise);
    }
    if (opts.swr && validate(entry) !== false) {
      _resolvePromise.catch((error) => {
        console.error(`[cache] SWR handler error.`, error);
        useNitroApp().captureError(error, { event, tags: ["cache"] });
      });
      return entry;
    }
    return _resolvePromise.then(() => entry);
  }
  return async (...args) => {
    const shouldBypassCache = await opts.shouldBypassCache?.(...args);
    if (shouldBypassCache) {
      return fn(...args);
    }
    const key = await (opts.getKey || getKey)(...args);
    const shouldInvalidateCache = await opts.shouldInvalidateCache?.(...args);
    const entry = await get(
      key,
      () => fn(...args),
      shouldInvalidateCache,
      args[0] && isHTTPEvent(args[0]) ? args[0] : void 0
    );
    let value = entry.value;
    if (opts.transform) {
      value = await opts.transform(entry, ...args) || value;
    }
    return value;
  };
}
function cachedFunction(fn, opts = {}) {
  return defineCachedFunction(fn, opts);
}
function getKey(...args) {
  return args.length > 0 ? hash(args) : "";
}
function escapeKey(key) {
  return String(key).replace(/\W/g, "");
}
function defineCachedEventHandler(handler, opts = defaultCacheOptions()) {
  const variableHeaderNames = (opts.varies || []).filter(Boolean).map((h) => h.toLowerCase()).sort();
  const _opts = {
    ...opts,
    shouldBypassCache: (event) => {
      return event.req.method !== "GET" && event.req.method !== "HEAD";
    },
    getKey: async (event) => {
      const customKey = await opts.getKey?.(event);
      if (customKey) {
        return escapeKey(customKey);
      }
      const _path = event.url.pathname + event.url.search;
      let _pathname;
      try {
        _pathname = escapeKey(decodeURI(parseURL(_path).pathname)).slice(0, 16) || "index";
      } catch {
        _pathname = "-";
      }
      const _hashedPath = `${_pathname}.${hash(_path)}`;
      const _headers = variableHeaderNames.map((header) => [header, event.req.headers.get(header)]).map(([name, value]) => `${escapeKey(name)}.${hash(value)}`);
      return [_hashedPath, ..._headers].join(":");
    },
    validate: (entry) => {
      if (!entry.value) {
        return false;
      }
      if (entry.value.status >= 400) {
        return false;
      }
      if (entry.value.body === void 0) {
        return false;
      }
      if (entry.value.headers.etag === "undefined" || entry.value.headers["last-modified"] === "undefined") {
        return false;
      }
      return true;
    },
    group: opts.group || "nitro/handlers",
    integrity: opts.integrity || hash([handler, opts])
  };
  const _cachedHandler = cachedFunction(
    async (event) => {
      const filteredHeaders = [...event.req.headers.entries()].filter(
        ([key]) => !variableHeaderNames.includes(key.toLowerCase())
      );
      try {
        event.req = new Request(event.req.url, {
          method: event.req.method,
          headers: filteredHeaders
        });
      } catch (error) {
        console.error("[cache] Failed to filter headers:", error);
      }
      const rawValue = await handler(event);
      const res = await toResponse(rawValue, event);
      const body = opts.streaming 
        ? res.body
        : await res.text();
      if (!res.headers.has("etag") && !(body instanceof ReadableStream)) {
        res.headers.set("etag", `W/"${hash(body)}"`);
      }
      if (!res.headers.has("last-modified")) {
        res.headers.set("last-modified", (/* @__PURE__ */ new Date()).toUTCString());
      }
      const cacheControl = [];
      if (opts.swr) {
        if (opts.maxAge) {
          cacheControl.push(`s-maxage=${opts.maxAge}`);
        }
        if (opts.staleMaxAge) {
          cacheControl.push(`stale-while-revalidate=${opts.staleMaxAge}`);
        } else {
          cacheControl.push("stale-while-revalidate");
        }
      } else if (opts.maxAge) {
        cacheControl.push(`max-age=${opts.maxAge}`);
      }
      if (cacheControl.length > 0) {
        res.headers.set("cache-control", cacheControl.join(", "));
      }
      const cacheEntry = {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body
      };
      return cacheEntry;
    },
    _opts
  );
  return defineHandler(async (event) => {
    if (opts.headersOnly) {
      if (handleCacheHeaders(event, { maxAge: opts.maxAge })) {
        return;
      }
      return handler(event);
    }
    const response = await _cachedHandler(event);
    if (handleCacheHeaders(event, {
      modifiedTime: new Date(response.headers["last-modified"]),
      etag: response.headers.etag,
      maxAge: opts.maxAge
    })) {
      return;
    }
    return new NodeResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  });
}
const cachedEventHandler = defineCachedEventHandler;

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype && Object.getPrototypeOf(prototype) !== null) {
    return false;
  }
  if (Symbol.iterator in value) {
    return false;
  }
  if (Symbol.toStringTag in value) {
    return Object.prototype.toString.call(value) === "[object Module]";
  }
  return true;
}

function _defu(baseObject, defaults, namespace = ".", merger) {
  if (!isPlainObject(defaults)) {
    return _defu(baseObject, {}, namespace, merger);
  }
  const object = Object.assign({}, defaults);
  for (const key in baseObject) {
    if (key === "__proto__" || key === "constructor") {
      continue;
    }
    const value = baseObject[key];
    if (value === null || value === void 0) {
      continue;
    }
    if (merger && merger(object, key, value, namespace)) {
      continue;
    }
    if (Array.isArray(value) && Array.isArray(object[key])) {
      object[key] = [...value, ...object[key]];
    } else if (isPlainObject(value) && isPlainObject(object[key])) {
      object[key] = _defu(
        value,
        object[key],
        (namespace ? `${namespace}.` : "") + key.toString(),
        merger
      );
    } else {
      object[key] = value;
    }
  }
  return object;
}
function createDefu(merger) {
  return (...arguments_) => (
    // eslint-disable-next-line unicorn/no-array-reduce
    arguments_.reduce((p, c) => _defu(p, c, "", merger), {})
  );
}
const defu = createDefu();

//#region src/object.ts
const NullProtoObj = /* @__PURE__ */ (() => {
	const e = function() {};
	return e.prototype = Object.create(null), Object.freeze(e.prototype), e;
})();

//#endregion
//#region src/context.ts
/**
* Create a new router context.
*/
function createRouter() {
	const ctx = {
		root: { key: "" },
		static: new NullProtoObj()
	};
	return ctx;
}

//#endregion
//#region src/operations/_utils.ts
function splitPath(path) {
	const [_, ...s] = path.split("/");
	return s[s.length - 1] === "" ? s.slice(0, -1) : s;
}
function getMatchParams(segments, paramsMap) {
	const params = new NullProtoObj();
	for (const [index, name] of paramsMap) {
		const segment = index < 0 ? segments.slice(-1 * index).join("/") : segments[index];
		if (typeof name === "string") params[name] = segment;
		else {
			const match = segment.match(name);
			if (match) for (const key in match.groups) params[key] = match.groups[key];
		}
	}
	return params;
}

//#endregion
//#region src/operations/add.ts
/**
* Add a route to the router context.
*/
function addRoute(ctx, method = "", path, data) {
	const segments = splitPath(path);
	let node = ctx.root;
	let _unnamedParamIndex = 0;
	const paramsMap = [];
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment.startsWith("**")) {
			if (!node.wildcard) node.wildcard = { key: "**" };
			node = node.wildcard;
			paramsMap.push([
				-i,
				segment.split(":")[1] || "_",
				segment.length === 2
			]);
			break;
		}
		if (segment === "*" || segment.includes(":")) {
			if (!node.param) node.param = { key: "*" };
			node = node.param;
			const isOptional = segment === "*";
			paramsMap.push([
				i,
				isOptional ? `_${_unnamedParamIndex++}` : _getParamMatcher(segment),
				isOptional
			]);
			continue;
		}
		const child = node.static?.[segment];
		if (child) node = child;
		else {
			const staticNode = { key: segment };
			if (!node.static) node.static = new NullProtoObj();
			node.static[segment] = staticNode;
			node = staticNode;
		}
	}
	const hasParams = paramsMap.length > 0;
	if (!node.methods) node.methods = new NullProtoObj();
	if (!node.methods[method]) node.methods[method] = [];
	node.methods[method].push({
		data: data || null,
		paramsMap: hasParams ? paramsMap : void 0
	});
	if (!hasParams) ctx.static[path] = node;
}
function _getParamMatcher(segment) {
	if (!segment.includes(":", 1)) return segment.slice(1);
	const regex = segment.replace(/:(\w+)/g, (_, id) => `(?<${id}>[^/]+)`).replace(/\./g, "\\.");
	return new RegExp(`^${regex}$`);
}

//#endregion
//#region src/operations/find-all.ts
/**
* Find all route patterns that match the given path.
*/
function findAllRoutes(ctx, method = "", path, opts) {
	if (path[path.length - 1] === "/") path = path.slice(0, -1);
	const segments = splitPath(path);
	const matches = _findAll(ctx, ctx.root, method, segments, 0);
	return matches.map((m) => {
		return {
			data: m.data,
			params: m.paramsMap ? getMatchParams(segments, m.paramsMap) : void 0
		};
	});
}
function _findAll(ctx, node, method, segments, index, matches = []) {
	const segment = segments[index];
	if (node.wildcard && node.wildcard.methods) {
		const match = node.wildcard.methods[method] || node.wildcard.methods[""];
		if (match) matches.push(...match);
	}
	if (node.param) {
		_findAll(ctx, node.param, method, segments, index + 1, matches);
		if (index === segments.length && node.param.methods) {
			const match = node.param.methods[method] || node.param.methods[""];
			if (match) {
				const pMap = match[0].paramsMap;
				if (pMap?.[pMap?.length - 1]?.[2]) matches.push(...match);
			}
		}
	}
	const staticChild = node.static?.[segment];
	if (staticChild) _findAll(ctx, staticChild, method, segments, index + 1, matches);
	if (index === segments.length && node.methods) {
		const match = node.methods[method] || node.methods[""];
		if (match) matches.push(...match);
	}
	return matches;
}

function klona(x) {
	if (typeof x !== 'object') return x;

	var k, tmp, str=Object.prototype.toString.call(x);

	if (str === '[object Object]') {
		if (x.constructor !== Object && typeof x.constructor === 'function') {
			tmp = new x.constructor();
			for (k in x) {
				if (x.hasOwnProperty(k) && tmp[k] !== x[k]) {
					tmp[k] = klona(x[k]);
				}
			}
		} else {
			tmp = {}; // null
			for (k in x) {
				if (k === '__proto__') {
					Object.defineProperty(tmp, k, {
						value: klona(x[k]),
						configurable: true,
						enumerable: true,
						writable: true,
					});
				} else {
					tmp[k] = klona(x[k]);
				}
			}
		}
		return tmp;
	}

	if (str === '[object Array]') {
		k = x.length;
		for (tmp=Array(k); k--;) {
			tmp[k] = klona(x[k]);
		}
		return tmp;
	}

	if (str === '[object Set]') {
		tmp = new Set;
		x.forEach(function (val) {
			tmp.add(klona(val));
		});
		return tmp;
	}

	if (str === '[object Map]') {
		tmp = new Map;
		x.forEach(function (val, key) {
			tmp.set(klona(key), klona(val));
		});
		return tmp;
	}

	if (str === '[object Date]') {
		return new Date(+x);
	}

	if (str === '[object RegExp]') {
		tmp = new RegExp(x.source, x.flags);
		tmp.lastIndex = x.lastIndex;
		return tmp;
	}

	if (str === '[object DataView]') {
		return new x.constructor( klona(x.buffer) );
	}

	if (str === '[object ArrayBuffer]') {
		return x.slice(0);
	}

	// ArrayBuffer.isView(x)
	// ~> `new` bcuz `Buffer.slice` => ref
	if (str.slice(-6) === 'Array]') {
		return new x.constructor(x);
	}

	return x;
}

const NUMBER_CHAR_RE = /\d/;
const STR_SPLITTERS = ["-", "_", "/", "."];
function isUppercase(char = "") {
  if (NUMBER_CHAR_RE.test(char)) {
    return void 0;
  }
  return char !== char.toLowerCase();
}
function splitByCase(str, separators) {
  const splitters = STR_SPLITTERS;
  const parts = [];
  if (!str || typeof str !== "string") {
    return parts;
  }
  let buff = "";
  let previousUpper;
  let previousSplitter;
  for (const char of str) {
    const isSplitter = splitters.includes(char);
    if (isSplitter === true) {
      parts.push(buff);
      buff = "";
      previousUpper = void 0;
      continue;
    }
    const isUpper = isUppercase(char);
    if (previousSplitter === false) {
      if (previousUpper === false && isUpper === true) {
        parts.push(buff);
        buff = char;
        previousUpper = isUpper;
        continue;
      }
      if (previousUpper === true && isUpper === false && buff.length > 1) {
        const lastChar = buff.at(-1);
        parts.push(buff.slice(0, Math.max(0, buff.length - 1)));
        buff = lastChar + char;
        previousUpper = isUpper;
        continue;
      }
    }
    buff += char;
    previousUpper = isUpper;
    previousSplitter = isSplitter;
  }
  parts.push(buff);
  return parts;
}
function kebabCase(str, joiner) {
  return str ? (Array.isArray(str) ? str : splitByCase(str)).map((p) => p.toLowerCase()).join(joiner) : "";
}
function snakeCase(str) {
  return kebabCase(str || "", "_");
}

function getEnv(key, opts) {
  const envKey = snakeCase(key).toUpperCase();
  return destr(
    process.env[opts.prefix + envKey] ?? process.env[opts.altPrefix + envKey]
  );
}
function _isObject(input) {
  return typeof input === "object" && !Array.isArray(input);
}
function applyEnv(obj, opts, parentKey = "") {
  for (const key in obj) {
    const subKey = parentKey ? `${parentKey}_${key}` : key;
    const envValue = getEnv(subKey, opts);
    if (_isObject(obj[key])) {
      if (_isObject(envValue)) {
        obj[key] = { ...obj[key], ...envValue };
        applyEnv(obj[key], opts, subKey);
      } else if (envValue === void 0) {
        applyEnv(obj[key], opts, subKey);
      } else {
        obj[key] = envValue ?? obj[key];
      }
    } else {
      obj[key] = envValue ?? obj[key];
    }
    if (opts.envExpansion && typeof obj[key] === "string") {
      obj[key] = _expandFromEnv(obj[key]);
    }
  }
  return obj;
}
const envExpandRx = /\{\{([^{}]*)\}\}/g;
function _expandFromEnv(value) {
  return value.replace(envExpandRx, (match, key) => {
    return process.env[key] || match;
  });
}

const _inlineRuntimeConfig = globalThis.__NITRO_RUNTIME_CONFIG__ || {
  "app": {
    "baseURL": "/"
  },
  "nitro": {
    "routeRules": {}
  }
};
const envOptions = {
  prefix: "NITRO_",
  altPrefix: _inlineRuntimeConfig.nitro.envPrefix ?? process.env.NITRO_ENV_PREFIX ?? "_",
  envExpansion: _inlineRuntimeConfig.nitro.envExpansion ?? process.env.NITRO_ENV_EXPANSION ?? false
};
const _sharedRuntimeConfig = _deepFreeze(
  applyEnv(klona(_inlineRuntimeConfig), envOptions)
);
function useRuntimeConfig(event) {
  {
    return _sharedRuntimeConfig;
  }
}
function _deepFreeze(object) {
  const propNames = Object.getOwnPropertyNames(object);
  for (const name of propNames) {
    const value = object[name];
    if (value && typeof value === "object") {
      _deepFreeze(value);
    }
  }
  return Object.freeze(object);
}
new Proxy(/* @__PURE__ */ Object.create(null), {
  get: (_, prop) => {
    console.warn(
      "Please use `useRuntimeConfig()` instead of accessing config directly."
    );
    const runtimeConfig = useRuntimeConfig();
    if (prop in runtimeConfig) {
      return runtimeConfig[prop];
    }
    return void 0;
  }
});

const config = useRuntimeConfig();
const routeRules = createRouter();
for (const [route, rules] of Object.entries(config.nitro.routeRules)) {
  addRoute(routeRules, void 0, route, rules);
}
function createRouteRulesHandler() {
  return defineHandler((event) => {
    const routeRules2 = getRouteRules(event);
    if (!routeRules2) {
      return;
    }
    if (routeRules2.headers) {
      for (const [key, value] of Object.entries(routeRules2.headers)) {
        event.res.headers.set(key, value);
      }
    }
    if (routeRules2.redirect) {
      let target = routeRules2.redirect.to;
      if (target.endsWith("/**")) {
        let targetPath = event.url.pathname + event.url.search;
        const strpBase = routeRules2.redirect._redirectStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.url.search) {
        target = withQuery(target, Object.fromEntries(event.url.searchParams));
      }
      return redirect(event, target, routeRules2.redirect.status);
    }
    if (routeRules2.proxy) {
      let target = routeRules2.proxy.to;
      if (target.endsWith("/**")) {
        let targetPath = event.url.pathname + event.url.search;
        const strpBase = routeRules2.proxy._proxyStripBase;
        if (strpBase) {
          targetPath = withoutBase(targetPath, strpBase);
        }
        target = joinURL(target.slice(0, -3), targetPath);
      } else if (event.url.search) {
        target = withQuery(target, Object.fromEntries(event.url.searchParams));
      }
      return proxyRequest(event, target, {
        ...routeRules2.proxy
      });
    }
  });
}
function getRouteRules(event) {
  const context = getEventContext(event);
  context._nitro ??= {};
  if (!context._nitro.routeRules) {
    const url = event.url || new URL(event.req.url);
    context._nitro.routeRules = getRouteRulesForPath(
      withoutBase(url.pathname, useRuntimeConfig().app.baseURL)
    );
  }
  return context._nitro?.routeRules;
}
function getRouteRulesForPath(path) {
  return defu(
    {},
    ...findAllRoutes(routeRules, void 0, path).map((m) => m.data).reverse()
  );
}

function defineNitroErrorHandler(handler) {
  return handler;
}

const errorHandler$0 = defineNitroErrorHandler(
  function defaultNitroErrorHandler(error, event) {
    const res = defaultHandler(error, event);
    return new NodeResponse(JSON.stringify(res.body, null, 2), res);
  }
);
function defaultHandler(error, event, opts) {
  const isSensitive = error.unhandled;
  const status = error.status || 500;
  const url = getRequestURL(event, { xForwardedHost: true, xForwardedProto: true });
  if (status === 404) {
    const baseURL = "/";
    if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) {
      const redirectTo = `${baseURL}${url.pathname.slice(1)}${url.search}`;
      return {
        status: 302,
        statusText: "Found",
        headers: { location: redirectTo },
        body: `Redirecting...`
      };
    }
  }
  if (isSensitive && !opts?.silent) {
    const tags = [error.unhandled && "[unhandled]"].filter(Boolean).join(" ");
    console.error(
      `[request error] ${tags} [${event.req.method}] ${url}
`,
      error
    );
  }
  const headers = {
    "content-type": "application/json",
    // Prevent browser from guessing the MIME types of resources.
    "x-content-type-options": "nosniff",
    // Prevent error page from being embedded in an iframe
    "x-frame-options": "DENY",
    // Prevent browsers from sending the Referer header
    "referrer-policy": "no-referrer",
    // Disable the execution of any js
    "content-security-policy": "script-src 'none'; frame-ancestors 'none';"
  };
  if (status === 404 || !event.res.headers.has("cache-control")) {
    headers["cache-control"] = "no-cache";
  }
  const body = {
    error: true,
    url: url.href,
    status,
    statusText: error.statusText,
    message: isSensitive ? "Server Error" : error.message,
    data: isSensitive ? void 0 : error.data
  };
  return {
    status,
    statusText: error.statusText,
    headers,
    body
  };
}

const errorHandlers = [errorHandler$0];

async function errorHandler(error, event) {
  for (const handler of errorHandlers) {
    try {
      const response = await handler(error, event, { defaultHandler });
      if (response) {
        return response;
      }
    } catch(error) {
      // Handler itself thrown, log and continue
      console.error(error);
    }
  }
  // H3 will handle fallback
}

const _9zZCeN_RdLW7l9eWCPZBv45_8j71JRHUs5_R0lRXqaQ = defineNitroPlugin((nitro) => {
  nitro.hooks.hook("request", (event) => {
    console.log(event.req.method, event.req.url);
  });
  nitro.hooks.hook("error", (err) => {
    console.log("Nitro error", err);
  });
});

const plugins = [
    _9zZCeN_RdLW7l9eWCPZBv45_8j71JRHUs5_R0lRXqaQ
  ];

const assets = {};

const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}
const resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "";
  let resolvedAbsolute = false;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    const path = index >= 0 ? arguments_[index] : cwd();
    if (!path || path.length === 0) {
      continue;
    }
    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);
  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }
  return resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path, allowAboveRoot) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) ; else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}
const isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
const dirname = function(p) {
  const segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

function readAsset (id) {
  const serverDir = dirname(fileURLToPath(globalThis.__nitro_main__));
  return promises.readFile(resolve(serverDir, assets[id].path))
}

const publicAssetBases = {};

function isPublicAssetURL(id = '') {
  if (assets[id]) {
    return true
  }
  for (const base in publicAssetBases) {
    if (id.startsWith(base)) { return true }
  }
  return false
}

function getAsset (id) {
  return assets[id]
}

const METHODS = /* @__PURE__ */ new Set(["HEAD", "GET"]);
const EncodingMap = { gzip: ".gz", br: ".br" };
const _uaUpq9 = defineHandler((event) => {
  if (event.req.method && !METHODS.has(event.req.method)) {
    return;
  }
  let id = decodePath(
    withLeadingSlash(withoutTrailingSlash(event.url.pathname))
  );
  let asset;
  const encodingHeader = event.req.headers.get("accept-encoding") || "";
  const encodings = [
    ...encodingHeader.split(",").map((e) => EncodingMap[e.trim()]).filter(Boolean).sort(),
    ""
  ];
  if (encodings.length > 1) {
    event.res.headers.append("Vary", "Accept-Encoding");
  }
  for (const encoding of encodings) {
    for (const _id of [id + encoding, joinURL(id, "index.html" + encoding)]) {
      const _asset = getAsset(_id);
      if (_asset) {
        asset = _asset;
        id = _id;
        break;
      }
    }
  }
  if (!asset) {
    if (isPublicAssetURL(id)) {
      event.res.headers.delete("Cache-Control");
      throw new HTTPError({ status: 404 });
    }
    return;
  }
  const ifNotMatch = event.req.headers.get("if-none-match") === asset.etag;
  if (ifNotMatch) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  const ifModifiedSinceH = event.req.headers.get("if-modified-since");
  const mtimeDate = new Date(asset.mtime);
  if (ifModifiedSinceH && asset.mtime && new Date(ifModifiedSinceH) >= mtimeDate) {
    event.res.status = 304;
    event.res.statusText = "Not Modified";
    return "";
  }
  if (asset.type) {
    event.res.headers.set("Content-Type", asset.type);
  }
  if (asset.etag && !event.res.headers.has("ETag")) {
    event.res.headers.set("ETag", asset.etag);
  }
  if (asset.mtime && !event.res.headers.has("Last-Modified")) {
    event.res.headers.set("Last-Modified", mtimeDate.toUTCString());
  }
  if (asset.encoding && !event.res.headers.has("Content-Encoding")) {
    event.res.headers.set("Content-Encoding", asset.encoding);
  }
  if (asset.size > 0 && !event.res.headers.has("Content-Length")) {
    event.res.headers.set("Content-Length", asset.size.toString());
  }
  return readAsset(id);
});

const _lazy_l7nkkR = () => import('../routes/_..._.mjs');

const handlers = [
  { route: '', handler: _uaUpq9, lazy: false, middleware: true, method: undefined },
  { route: '/**', handler: _lazy_l7nkkR, lazy: true, middleware: false, method: undefined }
];

function flatHooks(configHooks, hooks = {}, parentName) {
  for (const key in configHooks) {
    const subHook = configHooks[key];
    const name = parentName ? `${parentName}:${key}` : key;
    if (typeof subHook === "object" && subHook !== null) {
      flatHooks(subHook, hooks, name);
    } else if (typeof subHook === "function") {
      hooks[name] = subHook;
    }
  }
  return hooks;
}
const defaultTask = { run: (function_) => function_() };
const _createTask = () => defaultTask;
const createTask = typeof console.createTask !== "undefined" ? console.createTask : _createTask;
function serialTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return hooks.reduce(
    (promise, hookFunction) => promise.then(() => task.run(() => hookFunction(...args))),
    Promise.resolve()
  );
}
function parallelTaskCaller(hooks, args) {
  const name = args.shift();
  const task = createTask(name);
  return Promise.all(hooks.map((hook) => task.run(() => hook(...args))));
}
function callEachWith(callbacks, arg0) {
  for (const callback of [...callbacks]) {
    callback(arg0);
  }
}

class Hookable {
  constructor() {
    this._hooks = {};
    this._before = void 0;
    this._after = void 0;
    this._deprecatedMessages = void 0;
    this._deprecatedHooks = {};
    this.hook = this.hook.bind(this);
    this.callHook = this.callHook.bind(this);
    this.callHookWith = this.callHookWith.bind(this);
  }
  hook(name, function_, options = {}) {
    if (!name || typeof function_ !== "function") {
      return () => {
      };
    }
    const originalName = name;
    let dep;
    while (this._deprecatedHooks[name]) {
      dep = this._deprecatedHooks[name];
      name = dep.to;
    }
    if (dep && !options.allowDeprecated) {
      let message = dep.message;
      if (!message) {
        message = `${originalName} hook has been deprecated` + (dep.to ? `, please use ${dep.to}` : "");
      }
      if (!this._deprecatedMessages) {
        this._deprecatedMessages = /* @__PURE__ */ new Set();
      }
      if (!this._deprecatedMessages.has(message)) {
        console.warn(message);
        this._deprecatedMessages.add(message);
      }
    }
    if (!function_.name) {
      try {
        Object.defineProperty(function_, "name", {
          get: () => "_" + name.replace(/\W+/g, "_") + "_hook_cb",
          configurable: true
        });
      } catch {
      }
    }
    this._hooks[name] = this._hooks[name] || [];
    this._hooks[name].push(function_);
    return () => {
      if (function_) {
        this.removeHook(name, function_);
        function_ = void 0;
      }
    };
  }
  hookOnce(name, function_) {
    let _unreg;
    let _function = (...arguments_) => {
      if (typeof _unreg === "function") {
        _unreg();
      }
      _unreg = void 0;
      _function = void 0;
      return function_(...arguments_);
    };
    _unreg = this.hook(name, _function);
    return _unreg;
  }
  removeHook(name, function_) {
    if (this._hooks[name]) {
      const index = this._hooks[name].indexOf(function_);
      if (index !== -1) {
        this._hooks[name].splice(index, 1);
      }
      if (this._hooks[name].length === 0) {
        delete this._hooks[name];
      }
    }
  }
  deprecateHook(name, deprecated) {
    this._deprecatedHooks[name] = typeof deprecated === "string" ? { to: deprecated } : deprecated;
    const _hooks = this._hooks[name] || [];
    delete this._hooks[name];
    for (const hook of _hooks) {
      this.hook(name, hook);
    }
  }
  deprecateHooks(deprecatedHooks) {
    Object.assign(this._deprecatedHooks, deprecatedHooks);
    for (const name in deprecatedHooks) {
      this.deprecateHook(name, deprecatedHooks[name]);
    }
  }
  addHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    const removeFns = Object.keys(hooks).map(
      (key) => this.hook(key, hooks[key])
    );
    return () => {
      for (const unreg of removeFns.splice(0, removeFns.length)) {
        unreg();
      }
    };
  }
  removeHooks(configHooks) {
    const hooks = flatHooks(configHooks);
    for (const key in hooks) {
      this.removeHook(key, hooks[key]);
    }
  }
  removeAllHooks() {
    for (const key in this._hooks) {
      delete this._hooks[key];
    }
  }
  callHook(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(serialTaskCaller, name, ...arguments_);
  }
  callHookParallel(name, ...arguments_) {
    arguments_.unshift(name);
    return this.callHookWith(parallelTaskCaller, name, ...arguments_);
  }
  callHookWith(caller, name, ...arguments_) {
    const event = this._before || this._after ? { name, args: arguments_, context: {} } : void 0;
    if (this._before) {
      callEachWith(this._before, event);
    }
    const result = caller(
      name in this._hooks ? [...this._hooks[name]] : [],
      arguments_
    );
    if (result instanceof Promise) {
      return result.finally(() => {
        if (this._after && event) {
          callEachWith(this._after, event);
        }
      });
    }
    if (this._after && event) {
      callEachWith(this._after, event);
    }
    return result;
  }
  beforeEach(function_) {
    this._before = this._before || [];
    this._before.push(function_);
    return () => {
      if (this._before !== void 0) {
        const index = this._before.indexOf(function_);
        if (index !== -1) {
          this._before.splice(index, 1);
        }
      }
    };
  }
  afterEach(function_) {
    this._after = this._after || [];
    this._after.push(function_);
    return () => {
      if (this._after !== void 0) {
        const index = this._after.indexOf(function_);
        if (index !== -1) {
          this._after.splice(index, 1);
        }
      }
    };
  }
}
function createHooks() {
  return new Hookable();
}

function createContext(opts = {}) {
  let currentInstance;
  let isSingleton = false;
  const checkConflict = (instance) => {
    if (currentInstance && currentInstance !== instance) {
      throw new Error("Context conflict");
    }
  };
  let als;
  if (opts.asyncContext) {
    const _AsyncLocalStorage = opts.AsyncLocalStorage || globalThis.AsyncLocalStorage;
    if (_AsyncLocalStorage) {
      als = new _AsyncLocalStorage();
    } else {
      console.warn("[unctx] `AsyncLocalStorage` is not provided.");
    }
  }
  const _getCurrentInstance = () => {
    if (als) {
      const instance = als.getStore();
      if (instance !== void 0) {
        return instance;
      }
    }
    return currentInstance;
  };
  return {
    use: () => {
      const _instance = _getCurrentInstance();
      if (_instance === void 0) {
        throw new Error("Context is not available");
      }
      return _instance;
    },
    tryUse: () => {
      return _getCurrentInstance();
    },
    set: (instance, replace) => {
      if (!replace) {
        checkConflict(instance);
      }
      currentInstance = instance;
      isSingleton = true;
    },
    unset: () => {
      currentInstance = void 0;
      isSingleton = false;
    },
    call: (instance, callback) => {
      checkConflict(instance);
      currentInstance = instance;
      try {
        return als ? als.run(instance, callback) : callback();
      } finally {
        if (!isSingleton) {
          currentInstance = void 0;
        }
      }
    },
    async callAsync(instance, callback) {
      currentInstance = instance;
      const onRestore = () => {
        currentInstance = instance;
      };
      const onLeave = () => currentInstance === instance ? onRestore : void 0;
      asyncHandlers.add(onLeave);
      try {
        const r = als ? als.run(instance, callback) : callback();
        if (!isSingleton) {
          currentInstance = void 0;
        }
        return await r;
      } finally {
        asyncHandlers.delete(onLeave);
      }
    }
  };
}
function createNamespace(defaultOpts = {}) {
  const contexts = {};
  return {
    get(key, opts = {}) {
      if (!contexts[key]) {
        contexts[key] = createContext({ ...defaultOpts, ...opts });
      }
      return contexts[key];
    }
  };
}
const _globalThis = typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof global !== "undefined" ? global : {};
const globalKey = "__unctx__";
const defaultNamespace = _globalThis[globalKey] || (_globalThis[globalKey] = createNamespace());
const getContext = (key, opts = {}) => defaultNamespace.get(key, opts);
const asyncHandlersKey = "__unctx_async_handlers__";
const asyncHandlers = _globalThis[asyncHandlersKey] || (_globalThis[asyncHandlersKey] = /* @__PURE__ */ new Set());

getContext("nitro-app", {
  asyncContext: undefined,
  AsyncLocalStorage: void 0
});

function useNitroApp() {
  return useNitroApp.__instance__ ??= initNitroApp();
}
function initNitroApp() {
  const nitroApp = createNitroApp();
  for (const plugin of plugins) {
    try {
      plugin(nitroApp);
    } catch (error) {
      nitroApp.captureError(error, { tags: ["plugin"] });
      throw error;
    }
  }
  return nitroApp;
}
function createNitroApp() {
  const hooks = createHooks();
  const captureError = (error, errorCtx) => {
    const promise = hooks.callHookParallel("error", error, errorCtx).catch((hookError) => {
      console.error("Error while capturing another error", hookError);
    });
    if (errorCtx?.event) {
      const errors = errorCtx.event.req.context?.nitro?.errors;
      if (errors) {
        errors.push({ error, context: errorCtx });
      }
      if (typeof errorCtx.event.req.waitUntil === "function") {
        errorCtx.event.req.waitUntil(promise);
      }
    }
  };
  const h3App = createH3App(captureError);
  let fetchHandler = async (req) => {
    req.context ??= {};
    req.context.nitro = req.context.nitro || { errors: [] };
    const event = { req };
    const nitroApp = useNitroApp();
    await nitroApp.hooks.callHook("request", event).catch((error) => {
      captureError(error, { event, tags: ["request"] });
    });
    const response = await h3App.request(req, void 0, req.context);
    await nitroApp.hooks.callHook("response", response, event).catch((error) => {
      captureError(error, { event, tags: ["request", "response"] });
    });
    return response;
  };
  const requestHandler = (input, init, context) => {
    const req = toRequest(input, init);
    req.context = { ...req.context, ...context };
    return Promise.resolve(fetchHandler(req));
  };
  const $fetch = createFetch({
    fetch: (input, init) => {
      if (!input.toString().startsWith("/")) {
        return globalThis.fetch(input, init);
      }
      return requestHandler(input, init);
    }
  });
  globalThis.$fetch = $fetch;
  const app = {
    _h3: h3App,
    hooks,
    fetch: requestHandler,
    captureError
  };
  return app;
}
function createH3App(captureError) {
  const DEBUG_MODE = ["1", "true", "TRUE"].includes(false + "");
  const h3App = new H3({
    debug: DEBUG_MODE,
    onError: (error, event) => {
      captureError(error, {
        event,
        tags: ["request"]
      });
      return errorHandler(error, event);
    }
  });
  h3App.use(createRouteRulesHandler());
  for (const h of handlers) {
    let handler = h.lazy ? lazyEventHandler(h.handler) : h.handler;
    if (!h.route) {
      h3App.use(handler);
    } else if (h.middleware) {
      h3App.use(h.route, handler, { method: h.method });
    } else {
      const routeRules = getRouteRulesForPath(
        h.route.replace(/:\w+|\*\*/g, "_")
      );
      if (routeRules.cache) {
        handler = cachedEventHandler(handler, {
          group: "nitro/routes",
          ...routeRules.cache
        });
      }
      h3App.on(h.method, h.route, handler);
    }
  }
  return h3App;
}

function defineNitroPlugin(def) {
  return def;
}

function _captureError(error, type) {
  console.error(`[${type}]`, error);
  useNitroApp().captureError(error, { tags: [type] });
}
function trapUnhandledNodeErrors() {
  process.on(
    "unhandledRejection",
    (error) => _captureError(error, "unhandledRejection")
  );
  process.on(
    "uncaughtException",
    (error) => _captureError(error, "uncaughtException")
  );
}

const debug = (...args) => {
};
function GracefulShutdown(server, opts) {
  opts = opts || {};
  const options = Object.assign(
    {
      signals: "SIGINT SIGTERM",
      timeout: 3e4,
      development: false,
      forceExit: true,
      onShutdown: (signal) => Promise.resolve(signal),
      preShutdown: (signal) => Promise.resolve(signal)
    },
    opts
  );
  let isShuttingDown = false;
  const connections = {};
  let connectionCounter = 0;
  const secureConnections = {};
  let secureConnectionCounter = 0;
  let failed = false;
  let finalRun = false;
  function onceFactory() {
    let called = false;
    return (emitter, events, callback) => {
      function call() {
        if (!called) {
          called = true;
          return Reflect.apply(callback, this, arguments);
        }
      }
      for (const e of events) {
        emitter.on(e, call);
      }
    };
  }
  const signals = options.signals.split(" ").map((s) => s.trim()).filter((s) => s.length > 0);
  const once = onceFactory();
  once(process, signals, (signal) => {
    debug("received shut down signal", signal);
    shutdown(signal).then(() => {
      if (options.forceExit) {
        process.exit(failed ? 1 : 0);
      }
    }).catch((error) => {
      debug("server shut down error occurred", error);
      process.exit(1);
    });
  });
  function isFunction(functionToCheck) {
    const getType = Object.prototype.toString.call(functionToCheck);
    return /^\[object\s([A-Za-z]+)?Function]$/.test(getType);
  }
  function destroy(socket, force = false) {
    if (socket._isIdle && isShuttingDown || force) {
      socket.destroy();
      if (socket.server instanceof http.Server) {
        delete connections[socket._connectionId];
      } else {
        delete secureConnections[socket._connectionId];
      }
    }
  }
  function destroyAllConnections(force = false) {
    debug("Destroy Connections : " + (force ? "forced close" : "close"));
    let counter = 0;
    let secureCounter = 0;
    for (const key of Object.keys(connections)) {
      const socket = connections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        counter++;
        destroy(socket);
      }
    }
    debug("Connections destroyed : " + counter);
    debug("Connection Counter    : " + connectionCounter);
    for (const key of Object.keys(secureConnections)) {
      const socket = secureConnections[key];
      const serverResponse = socket._httpMessage;
      if (serverResponse && !force) {
        if (!serverResponse.headersSent) {
          serverResponse.setHeader("connection", "close");
        }
      } else {
        secureCounter++;
        destroy(socket);
      }
    }
    debug("Secure Connections destroyed : " + secureCounter);
    debug("Secure Connection Counter    : " + secureConnectionCounter);
  }
  server.on("request", (req, res) => {
    req.socket._isIdle = false;
    if (isShuttingDown && !res.headersSent) {
      res.setHeader("connection", "close");
    }
    res.on("finish", () => {
      req.socket._isIdle = true;
      destroy(req.socket);
    });
  });
  server.on("connection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = connectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      connections[id] = socket;
      socket.once("close", () => {
        delete connections[socket._connectionId];
      });
    }
  });
  server.on("secureConnection", (socket) => {
    if (isShuttingDown) {
      socket.destroy();
    } else {
      const id = secureConnectionCounter++;
      socket._isIdle = true;
      socket._connectionId = id;
      secureConnections[id] = socket;
      socket.once("close", () => {
        delete secureConnections[socket._connectionId];
      });
    }
  });
  process.on("close", () => {
    debug("closed");
  });
  function shutdown(sig) {
    function cleanupHttp() {
      destroyAllConnections();
      debug("Close http server");
      return new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) {
            return reject(err);
          }
          return resolve(true);
        });
      });
    }
    debug("shutdown signal - " + sig);
    if (options.development) {
      debug("DEV-Mode - immediate forceful shutdown");
      return process.exit(0);
    }
    function finalHandler() {
      if (!finalRun) {
        finalRun = true;
        if (options.finally && isFunction(options.finally)) {
          debug("executing finally()");
          options.finally();
        }
      }
      return Promise.resolve();
    }
    function waitForReadyToShutDown(totalNumInterval) {
      debug(`waitForReadyToShutDown... ${totalNumInterval}`);
      if (totalNumInterval === 0) {
        debug(
          `Could not close connections in time (${options.timeout}ms), will forcefully shut down`
        );
        return Promise.resolve(true);
      }
      const allConnectionsClosed = Object.keys(connections).length === 0 && Object.keys(secureConnections).length === 0;
      if (allConnectionsClosed) {
        debug("All connections closed. Continue to shutting down");
        return Promise.resolve(false);
      }
      debug("Schedule the next waitForReadyToShutdown");
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(waitForReadyToShutDown(totalNumInterval - 1));
        }, 250);
      });
    }
    if (isShuttingDown) {
      return Promise.resolve();
    }
    debug("shutting down");
    return options.preShutdown(sig).then(() => {
      isShuttingDown = true;
      cleanupHttp();
    }).then(() => {
      const pollIterations = options.timeout ? Math.round(options.timeout / 250) : 0;
      return waitForReadyToShutDown(pollIterations);
    }).then((force) => {
      debug("Do onShutdown now");
      if (force) {
        destroyAllConnections(force);
      }
      return options.onShutdown(sig);
    }).then(finalHandler).catch((error) => {
      const errString = typeof error === "string" ? error : JSON.stringify(error);
      debug(errString);
      failed = true;
      throw errString;
    });
  }
  function shutdownManual() {
    return shutdown("manual");
  }
  return shutdownManual;
}

function getGracefulShutdownConfig() {
  return {
    disabled: !!process.env.NITRO_SHUTDOWN_DISABLED,
    signals: (process.env.NITRO_SHUTDOWN_SIGNALS || "SIGTERM SIGINT").split(" ").map((s) => s.trim()),
    timeout: Number.parseInt(process.env.NITRO_SHUTDOWN_TIMEOUT || "", 10) || 3e4,
    forceExit: !process.env.NITRO_SHUTDOWN_NO_FORCE_EXIT
  };
}
function setupGracefulShutdown(listener, nitroApp) {
  const shutdownConfig = getGracefulShutdownConfig();
  if (shutdownConfig.disabled) {
    return;
  }
  GracefulShutdown(listener, {
    signals: shutdownConfig.signals.join(" "),
    timeout: shutdownConfig.timeout,
    forceExit: shutdownConfig.forceExit,
    onShutdown: async () => {
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Graceful shutdown timeout, force exiting...");
          resolve();
        }, shutdownConfig.timeout);
        nitroApp.hooks.callHook("close").catch((error) => {
          console.error(error);
        }).finally(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }
  });
}

const cert = process.env.NITRO_SSL_CERT;
const key = process.env.NITRO_SSL_KEY;
const nitroApp = useNitroApp();
const server = cert && key ? new Server({ key, cert }, toNodeHandler(nitroApp.fetch)) : new Server$1(toNodeHandler(nitroApp.fetch));
const port = destr(process.env.NITRO_PORT || process.env.PORT) || 3e3;
const host = process.env.NITRO_HOST || process.env.HOST;
const path = process.env.NITRO_UNIX_SOCKET;
const listener = server.listen(path ? { path } : { port, host }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  const protocol = cert && key ? "https" : "http";
  const addressInfo = listener.address();
  if (typeof addressInfo === "string") {
    console.log(`Listening on unix socket ${addressInfo}`);
    return;
  }
  const baseURL = (useRuntimeConfig().app.baseURL || "").replace(/\/$/, "");
  const url = `${protocol}://${addressInfo.family === "IPv6" ? `[${addressInfo.address}]` : addressInfo.address}:${addressInfo.port}${baseURL}`;
  console.log(`Listening on ${url}`);
});
trapUnhandledNodeErrors();
setupGracefulShutdown(listener, nitroApp);
const nodeServer = {};

export { H3 as H, cachedEventHandler as c, eventHandler as e, getRouterParam as g, nodeServer as n, proxyRequest as p };
//# sourceMappingURL=nitro.mjs.map
