const assert = require('node:assert/strict')
const { test } = require('node:test')
const fs = require('node:fs')
const path = require('node:path')
const Module = require('node:module')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')

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
// Resolve the tsconfig "@/*" alias.
const originalResolve = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith('@/')) request = path.join(root, request.slice(2))
  return originalResolve.call(this, request, ...rest)
}
// cacheLife/cacheTag require the Next build runtime; they are no-ops for tree-shape tests.
const nextCache = require.resolve('next/cache')
require.cache[nextCache] = { id: nextCache, filename: nextCache, loaded: true,
  exports: { cacheLife() {}, cacheTag() {} } }

const dashboard = () => require('../app/components/dashboard.tsx')
const monitor = () => require('../app/components/stream-monitor.tsx')
const CHUNK_ORDER = ['overview', 'egress', 'traffic', 'health']

/** Walk an un-rendered element tree in document order without invoking components. */
function walk(node, visit) {
  if (node == null || typeof node === 'boolean') return
  if (Array.isArray(node)) return node.forEach((child) => walk(child, visit))
  if (!React.isValidElement(node)) return
  visit(node)
  walk(node.props.children, visit)
}

test('dashboard streams the four widget frames before the waterfall monitor', async () => {
  const tree = await dashboard().Dashboard({ searchParams: Promise.resolve({}) })
  const order = []
  walk(tree, (el) => {
    if (el.props['data-widget-frame']) order.push(el.props['data-widget-frame'])
    if (el.type === monitor().StreamMonitor) order.push('monitor')
  })
  assert.deepEqual(order, [...CHUNK_ORDER, 'monitor'])
})

test('each widget frame keeps its own Suspense boundary', async () => {
  const tree = await dashboard().Dashboard({ searchParams: Promise.resolve({}) })
  const frames = []
  walk(tree, (el) => { if (el.props['data-widget-frame']) frames.push(el) })
  assert.equal(frames.length, 4)
  for (const frame of frames) {
    const child = React.Children.only(frame.props.children)
    assert.equal(child.type, React.Suspense, `${frame.props['data-widget-frame']} needs Suspense`)
  }
})

test('static fallback reserves the same frames in the same order as the dashboard', () => {
  const html = renderToStaticMarkup(React.createElement(dashboard().DashboardFallback))
  const frames = [...html.matchAll(/data-widget-frame="([a-z]+)"/g)].map((m) => m[1])
  assert.deepEqual(frames, CHUNK_ORDER)
  const monitorAt = html.indexOf('data-monitor-placeholder')
  assert.ok(monitorAt > html.lastIndexOf('data-widget-frame='), 'monitor placeholder must follow widgets')
})

test('page header stays short: platform facts card moves below the dashboard', async () => {
  const Home = require('../app/page.tsx').default
  const tree = await Home({ searchParams: Promise.resolve({}) })
  const order = []
  let factsInHeader = false
  walk(tree, (el) => {
    if (el.type === 'header') walk(el.props.children, (inner) => {
      if (inner.props['data-platform-facts'] !== undefined) factsInHeader = true
    })
    if (el.type === React.Suspense) order.push('dashboard')
    if (el.props['data-platform-facts'] !== undefined) order.push('facts')
  })
  assert.equal(factsInHeader, false)
  assert.deepEqual(order, ['dashboard', 'facts'])
})

test('copy no longer claims instant shell or real-speed measurement', () => {
  const files = ['app/page.tsx', 'app/components/dashboard.tsx', 'app/components/dashboard-widgets.tsx']
  for (const file of files) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    for (const phrase of ['外壳已秒开', '真实速度', '外壳秒开', '客户端实测']) {
      assert.ok(!source.includes(phrase), `${file} still contains "${phrase}"`)
    }
  }
})

test('skeleton fills its frame so the reserved height is visible before data arrives', () => {
  const { WidgetSkeleton } = require('../app/components/dashboard-widgets.tsx')
  const html = renderToStaticMarkup(React.createElement(WidgetSkeleton, { id: 'overview', realtime: true }))
  assert.match(html, /data-chunk-skeleton="overview"[^>]*class="[^"]*\bh-full\b/)
  assert.ok(html.includes('零模拟延迟'))
})

test('global css gives every widget frame a min-height', () => {
  const css = fs.readFileSync(path.join(root, 'app/globals.css'), 'utf8')
  for (const id of CHUNK_ORDER) {
    assert.match(css, new RegExp(`\\[data-widget-frame=["']?${id}["']?\\][^{]*\\{[^}]*min-height`))
  }
})
