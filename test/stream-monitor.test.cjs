const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

// Compile local TS/TSX for Node's built-in test runner; no test framework dependency.
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    })
    module._compile(outputText, filename)
  }
}
const monitor = () => require('../app/components/stream-monitor.tsx')
const html = () => renderToStaticMarkup(React.createElement(monitor().StreamMonitor, { realtime: false, chunkCount: 4 }))

 test('server-rendered monitor reserves all seven timing rows before effects run', () => {
  assert.equal((html().match(/data-timing-row=/g) || []).length, 7)
})

test('monitor labels do not claim TTFB is visible paint or effect is global hydration', () => {
  const value = html()
  assert.ok(value.includes('首字节 · TTFB'))
  assert.ok(value.includes('首次内容绘制 · FCP'))
  assert.ok(value.includes('监控挂载'))
  assert.ok(!value.includes('可交互 · hydration'))
  assert.ok(!value.includes('外壳即可见'))
  assert.ok(!value.includes('客户端实测'))
})

function getMetrics() {
  const filename = path.resolve(__dirname, '../lib/stream-metrics.ts')
  assert.ok(fs.existsSync(filename), 'explicit observation semantics module is required')
  return require(filename)
}

test('preexisting chunks are timestamp-unknown, not TTFB plus simulated delay', () => {
  const { chunkObservation } = getMetrics()
  const item = chunkObservation('overview', 'initial', 4200, true)
  assert.deepEqual(item, { id: 'overview', source: 'preexisting', ms: null, observedAt: 4200 })
})

test('visible mutations carry the DOM observation timestamp', () => {
  const { chunkObservation } = getMetrics()
  assert.deepEqual(chunkObservation('egress', 'mutation', 1700, true),
    { id: 'egress', source: 'dom-observed', ms: 1700, observedAt: 1700 })
})

test('hidden-tab mutations never masquerade as visible arrival measurements', () => {
  const { chunkObservation } = getMetrics()
  assert.deepEqual(chunkObservation('health', 'mutation', 6200, false),
    { id: 'health', source: 'background', ms: null, observedAt: 6200 })
})

test('only declared four chunk identifiers are accepted', () => {
  const { isChunkId } = getMetrics()
  assert.equal(isChunkId('overview'), true)
  assert.equal(isChunkId('health'), true)
  assert.equal(isChunkId('unknown'), false)
  assert.equal(isChunkId(null), false)
})
