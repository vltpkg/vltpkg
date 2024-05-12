import { Cache } from '@vltpkg/cache';
import { gunzipSync } from 'zlib';
import { error } from '@vltpkg/error-cause';
process.title = 'vlt-cache-unzip';
const path = process.argv[2];
if (typeof path !== 'string')
    process.exit(1);
const keys = process.argv.slice(3);
if (!path || !keys.length)
    process.exit(1);
const cache = new Cache({ path });
const readSize = (buf, offset) => {
    const a = buf[offset];
    const b = buf[offset + 1];
    const c = buf[offset + 2];
    const d = buf[offset + 3];
    // not possible, we check the length
    /* c8 ignore start */
    if (a === undefined ||
        b === undefined ||
        c === undefined ||
        d === undefined) {
        throw error('Invalid buffer, not long enough to readSize', {
            found: buf,
            offset,
        });
    }
    /* c8 ignore stop */
    return (a << 24) | (b << 16) | (c << 8) | d;
};
let didSomething = false;
await Promise.all(keys.map(async (key) => {
    const buffer = await cache.fetch(key);
    /* c8 ignore next - should never happen */
    if (!buffer || buffer.length < 4)
        return;
    didSomething = true;
    const headSize = readSize(buffer, 0);
    const body = buffer.subarray(headSize);
    if (body[0] === 0x1f && body[1] === 0x8b) {
        const unz = gunzipSync(body);
        cache.set(key, Buffer.concat([buffer.subarray(0, headSize), unz], headSize + unz.length));
    }
}));
await cache.promise();
if (!didSomething)
    process.exit(1);
//# sourceMappingURL=unzip.js.map