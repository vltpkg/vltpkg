# `@vltpkg/registry-client`

This is a very light wrapper around undici, optimized for
interfacing with an npm registry.

Any response with `immutable` in the `cache-control` header, or
with a `content-type` of `application/octet-stream` or a path
ending in `.tgz`, will be cached forever and never requested
again as long as the cache survives.

If the request has a cached response:

- Cached responses with `immutable` in the `cache-control`
  header will be returned from cache without a network request,
  no matter what.
- Cached responses with a `content-type` of
  `application/octet-stream` will be returned from cache without
  a network request, no matter what, because tarballs are
  immutable.
- Cached responses with `max-age=<n>` or `s-max-age=<n>` will be
  served from cache without a network request if it's less than
  `<n>` seconds old.
- Otherwise, a network request to the registry will be made
    - if an `etag` is present in the cached response, it will be
      used as the `if-none-match` header.
    - If a `last-modified` header is in the response, that will
      be used as the `if-modified-since` request header.
    - If there is no `last-modified` header, then use the `mtime`
      of the cache file as the `if-modified-since` header.

This is the extent of the cache control logic. It is not a
full-featured spec-compliant caching HTTP client, because that is
not needed for this use case. Every response will be cached, even
if the registry headers don't technically allow it.

## Cache Unzipped

Client always sends `accept-encoding: gzip;q=1.0, *;q=0.5`
header when making requests, to save time on the wire.

If response has `content-encoding: gzip`, then we swap out the
body for the unzipped response body in the cache, as if it was
not gzipped in the first place. This _must_ be done before
returning the response, because you can't `JSON.parse()` a
gzipped response anyway.

If the response is `content-type: application/octet-stream` and
starts with the gzip header, then we return the raw body as we
received it, but as a best-effort background job, unzip it and
update the cache entry to be an unzipped response body.

So,

- json responses will always be un-zipped, in the response and in
  the cache.
- artifact responses _may_ be gzipped (and thus, have to be
  unzipped by the unpack operation), but will eventually be
  cached as unzipped tarballs.

Thus, the `content-length` response header will _usually_ not
match the actual byte length of the response body.
