/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS on purpose: it hooks Module._resolveFilename to stub Electron for StageTime's CommonJS main.js */
// Boots StageTime's main.js against a stubbed Electron so the HTTP API is real.
// Same stub as StageTime's tests/api.test.js. The StageTime source is found via $STAGETIME_APP_DIR
// or the parent folder. Listens on PORT (env, default 18098).
// Reads JSON lines on stdin and feeds each one to the app as a display-state report,
// which is how the test drives status changes through /api/status and /api/events.
const Module = require('module'),
	path = require('path'),
	fs = require('fs'),
	os = require('os'),
	readline = require('readline')

const PORT = Number(process.env.PORT || 18098)
const USERDATA = fs.mkdtempSync(path.join(os.tmpdir(), 'stagetime-module-test-'))
fs.writeFileSync(
	path.join(USERDATA, 'config.json'),
	JSON.stringify({
		apiPort: PORT,
		quickMessages: ['WRAP UP', 'Q&A'],
		timeZone: 'America/New_York',
		apiKey: process.env.STAGETIME_API_KEY || '',
		// STAGETIME_WEB_PIN turns the web remote on with that PIN (for screenshots / manual checks)
		...(process.env.STAGETIME_WEB_PIN
			? { webRemote: { enabled: true, pin: process.env.STAGETIME_WEB_PIN } }
			: {}),
	}),
)
fs.writeFileSync(
	path.join(USERDATA, 'presets.json'),
	JSON.stringify([{ name: 'Keynote', seconds: 900, wrapUpSeconds: 120 }]),
)

const ipcHandlers = {}
let whenReadyResolve
class FakeWindow {
	constructor(opts) {
		this.opts = opts
		this.destroyed = false
		this.bounds = { x: 0, y: 0, width: 1280, height: 720 }
		this.webContents = { send: () => {}, once() {}, on() {} }
	}
	loadFile() {}
	loadURL() {}
	on() {}
	once() {}
	focus() {}
	destroy() {
		this.destroyed = true
	}
	isDestroyed() {
		return this.destroyed
	}
	setBounds(b) {
		this.bounds = b
	}
	getBounds() {
		return this.bounds
	}
	setMenuBarVisibility() {}
	setResizable() {}
	setSimpleFullScreen() {}
	isSimpleFullScreen() {
		return false
	}
	setFullScreen() {}
	isFullScreen() {
		return false
	}
}
const display = { id: 1, bounds: { x: 0, y: 0, width: 1440, height: 900 } }
const electron = {
	app: {
		getPath: () => USERDATA,
		getVersion: () => '1.1.1-test',
		isPackaged: false,
		whenReady: () =>
			new Promise((r) => {
				whenReadyResolve = r
			}),
		on() {},
		quit() {},
		commandLine: { appendSwitch() {} },
	},
	BrowserWindow: FakeWindow,
	screen: { getAllDisplays: () => [display], getPrimaryDisplay: () => display, on() {} },
	Menu: { buildFromTemplate: (t) => t, setApplicationMenu() {} },
	powerSaveBlocker: { start: () => 1, stop() {} },
	ipcMain: {
		on: (ch, fn) => {
			ipcHandlers[ch] = fn
		},
		handle() {},
	},
	dialog: { showMessageBox: () => Promise.resolve({ response: 0 }), showMessageBoxSync: () => 0, showErrorBox() {} },
	nativeImage: { createFromPath: () => ({}) },
	shell: { openExternal() {} },
}
const origResolve = Module._resolveFilename
Module._resolveFilename = function (request, ...rest) {
	if (request === 'electron') return 'electron-stub'
	if (request === 'electron-updater') return 'electron-updater-stub'
	return origResolve.call(this, request, ...rest)
}
require.cache['electron-stub'] = { id: 'electron-stub', filename: 'electron-stub', loaded: true, exports: electron }
require.cache['electron-updater-stub'] = {
	id: 'electron-updater-stub',
	filename: 'electron-updater-stub',
	loaded: true,
	exports: { autoUpdater: { on() {} } },
}
const APP_DIR = process.env.STAGETIME_APP_DIR || path.join(__dirname, '..', '..')
require(path.join(APP_DIR, 'main.js'))
whenReadyResolve()

readline.createInterface({ input: process.stdin }).on('line', (line) => {
	try {
		ipcHandlers['display-state'](null, JSON.parse(line))
	} catch (e) {
		console.error('bad state line', e.message)
	}
})
setTimeout(() => console.log('READY'), 300)
