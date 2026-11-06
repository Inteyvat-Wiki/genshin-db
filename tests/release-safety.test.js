const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');

test('incompatible fork cannot use legacy registry publishing or upstream dispatch', () => {
    const metadata = require('../package.json');
    assert.equal(metadata.private, true);
    assert.equal(metadata.scripts.publish, undefined);
    assert.equal(metadata.scripts.publishTcg, undefined);
    for (const file of ['manual_publish.yml', 'manual_publish_tcg.yml', 'release_dispatch.yml']) {
        assert.equal(fs.existsSync(path.join(root, '.github/workflows', file)), false,
            `Legacy workflow must remain removed: ${file}`);
    }
    const result = spawnSync(process.execPath, ['scripts/publish/publish.js', 'tcg'], { cwd: root, encoding: 'utf8', windowsHide: true });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /publishing is disabled/);
});
