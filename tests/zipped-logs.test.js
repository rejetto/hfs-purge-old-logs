const assert = require('node:assert/strict')
const test = require('node:test')

test('deletes old rotated logs both before and after compression', async () => {
    let cleanup
    const deleted = []
    const files = [
        'access-2020-01-01.log',
        'access-2020-01-02.log.zip',
        'access-2099-01-01.log.zip',
        'access-2020-01-03.log.zip.tmp',
    ]
    const api = {
        require: name => name === 'fs/promises' ? {
            readdir: async () => files,
            stat: async () => ({ size: 10 }),
            unlink: async path => deleted.push(path),
        } : require(name),
        misc: {
            repeat(_, callback) { cleanup = callback; return () => {} },
            formatBytes: String,
        },
        _: { escapeRegExp: value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') },
        getConfig: () => 365,
        getHfsConfig: key => key === 'log' ? '/logs/access.log' : '',
        log() {},
    }

    await require('../dist/plugin.js').init(api)
    await cleanup()

    assert.deepEqual(deleted, [
        '/logs/access-2020-01-01.log',
        '/logs/access-2020-01-02.log.zip',
    ])
})
