/* Fallback definitions for the perry-ext-http symbols that the prebuilt
 * libperry_stdlib.a references unconditionally.
 *
 * The @perryts/perry npm packages ship libperry_runtime.a and
 * libperry_stdlib.a but none of the per-extension archives, and the driver
 * only puts an ext archive on the link line when it detects the matching
 * import. Anything that reaches the full stdlib without importing node:http
 * -- fetch, node:sqlite, an inline process.stdin.on() -- therefore fails to
 * link on undefined js_ext_http_* / js_http_*. Only the full release tarball
 * carries the real archives.
 *
 * Every symbol here is a predicate the stdlib consults before handing an
 * object to the external http implementation. Returning 0 is the honest
 * answer for a build with no ext archive ("not an external handle", "nothing
 * in flight") and routes http through the in-stdlib implementation, which is
 * the same path the driver documents as the fallback.
 */

long long js_ext_http_agent_dispatch_method(void) { return 0; }
long long js_ext_http_agent_dispatch_property(void) { return 0; }
long long js_ext_http_agent_dispatch_property_set(void) { return 0; }
long long js_ext_http_agent_is_handle(void) { return 0; }
long long js_ext_http_client_incoming_message_is_handle(void) { return 0; }
long long js_ext_http_client_incoming_message_set_encoding(void) { return 0; }
long long js_ext_http_client_inflight(void) { return 0; }
long long js_ext_http_client_request_dispatch_method(void) { return 0; }
long long js_ext_http_client_request_dispatch_property(void) { return 0; }
long long js_ext_http_client_request_is_handle(void) { return 0; }
long long js_http_has_pending(void) { return 0; }
long long js_http_incoming_message_pipe(void) { return 0; }
long long js_http_is_incoming_message(void) { return 0; }
long long js_http_response_trailers(void) { return 0; }
