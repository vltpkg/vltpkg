import { c as cachedEventHandler, e as eventHandler, g as getRouterParam, p as proxyRequest, H as H3 } from '../nitro/nitro.mjs';
import assert from 'node:assert';
import 'node:http';
import 'node:https';
import 'drizzle-orm/sqlite-core';
import 'drizzle-orm';
import 'stream/consumers';
import 'drizzle-orm/libsql';
import 'node:path';
import 'node:fs/promises';
import 'node:fs';
import 'node:stream/promises';
import 'node:crypto';
import 'node:url';

const CACHE_MANIFESTS = process.env.VSR_NO_CACHE_MANIFESTS !== "1";
const CACHE_TARBALLS = process.env.VSR_NO_CACHE_TARBALLS !== "1";
const assertParam = (event, name) => {
  const param = getRouterParam(event, name);
  assert(param, `${name} parameter is required`);
  return param;
};
const joinParams = (sep, ...params) => {
  return params.filter(Boolean).join(sep);
};
const proxyToNpm = (event, url) => {
  return proxyRequest(event, `https://registry.npmjs.org${url}`, {
    onResponse: (event2, response) => {
      event2.res.status = response.status;
      event2.res.statusText = response.statusText;
    }
  });
};
const packageOrVersionOptions = {
  base: "packages",
  integrity: "packages.1",
  // @ts-expect-error - Patched Nitro to support streaming mode
  streaming: true,
  // TODO: If Nitro could make this take a function with the same event signature
  // then we could have different max ages for packages vs versions. Ideally packages
  // should be cached for a short time (5m) and versions for a long time, maybe even forever
  // like tarballs.
  maxAge: 60 * 5,
  getKey: (event) => {
    const param1 = assertParam(event, "param1");
    const param2 = getRouterParam(event, "param2");
    const param3 = getRouterParam(event, "param3");
    let type;
    if (!param2 && !param3) {
      type = "package";
    } else if (param2 && !param3) {
      type = param1.startsWith("@") ? "package" : "version";
    } else {
      type = "version";
    }
    return `npm___${type}___${joinParams("_", param1, param2, param3)}`;
  }
};
const packageOrVersionHandler = async (event) => {
  const param1 = assertParam(event, "param1");
  const param2 = getRouterParam(event, "param2");
  const param3 = getRouterParam(event, "param3");
  return proxyToNpm(
    event,
    `/${joinParams("/", param1, param2, param3)}`
  );
};
const getPackageOrVersionHandler = CACHE_MANIFESTS ? cachedEventHandler(
  packageOrVersionHandler,
  packageOrVersionOptions
) : eventHandler(packageOrVersionHandler);
const tarballOptions = {
  base: "tarballs",
  integrity: "tarballs.0",
  maxAge: 60 * 60 * 24 * 365 * 100,
  // @ts-expect-error - Patched Nitro to support streaming mode
  streaming: true,
  getKey: (event) => {
    const param1 = assertParam(event, "param1");
    const param2 = getRouterParam(event, "param2");
    const tarball = assertParam(event, "tarball");
    return `npm___tarball___${joinParams("_", param1, param2, tarball)}`;
  }
};
const tarballHandler = async (event) => {
  const param1 = assertParam(event, "param1");
  const param2 = getRouterParam(event, "param2");
  const tarball = assertParam(event, "tarball");
  return proxyToNpm(
    event,
    `/${joinParams("/", param1, param2)}/-/${tarball}`
  );
};
const getTarballHandler = CACHE_TARBALLS ? cachedEventHandler(tarballHandler, tarballOptions) : eventHandler(tarballHandler);

const app = new H3().get("/", () => ({ ok: true })).get("/npm", () => ({ ok: true })).get("/npm/:param1", getPackageOrVersionHandler).get("/npm/:param1/:param2", getPackageOrVersionHandler).get("/npm/:param1/:param2/:param3", getPackageOrVersionHandler).get("/npm/:param1/-/:tarball", getTarballHandler).get("/npm/:param1/:param2/-/:tarball", getTarballHandler);
const _____ = app.handler;

export { _____ as default };
//# sourceMappingURL=_..._.mjs.map
