/* eslint-disable n/no-unpublished-import -- imports the build output on purpose; run `yarn build` first (yarn test does) */
// Module tests. Boots the real StageTime HTTP API (test/boot-app.cjs) and:
//   1. fires every action with its default options and checks the app accepted it,
//   2. runs every feedback against the default state,
//   3. checks variables, presets and action/feedback ids all agree,
//   4. subscribes to /api/events and checks a state change arrives.
// Needs the StageTime source (parent folder, or $STAGETIME_APP_DIR). Without it the
// definition checks (3) still run and the API-backed checks are skipped.
// Run: yarn test   (builds first)
import { spawn } from 'node:child_process'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { UpdateActions } from '../dist/actions.js'
import { UpdateFeedbacks } from '../dist/feedbacks.js'
import { UpdateVariableDefinitions, getVariableValues } from '../dist/variables.js'
import { UpdatePresets } from '../dist/presets.js'
import { getDefaultStatus, sendCommand, fetchStatus, StageTimeEvents, TOGGLE_OPTIONS } from '../dist/api.js'

const PORT = 18098
const HOST = '127.0.0.1'
const here = path.dirname(fileURLToPath(import.meta.url))
const appDir = process.env.STAGETIME_APP_DIR || path.join(here, '..', '..')
const haveApp = fs.existsSync(path.join(appDir, 'main.js'))

// ---- stub instance: captures what the Update* functions register ----
const calls = []
const logs = []
const API_KEY = 'module-test-key'
const self = {
	state: getDefaultStatus(),
	secrets: { apiKey: API_KEY },
	actions: {},
	feedbacks: {},
	variableDefs: {},
	presets: {},
	structure: [],
	setActionDefinitions(d) {
		this.actions = d
	},
	setFeedbackDefinitions(d) {
		this.feedbacks = d
	},
	setVariableDefinitions(d) {
		this.variableDefs = d
	},
	setPresetDefinitions(structure, presets) {
		this.structure = structure
		this.presets = presets
	},
	log: (level, msg) => logs.push({ level, msg }),
	async sendApi(p) {
		// same as main.ts: the key rides along as a header
		const res = await sendCommand(HOST, PORT, p, this.secrets.apiKey || undefined)
		calls.push({ path: p, res })
		return res
	},
}
UpdateActions(self)
UpdateFeedbacks(self)
UpdateVariableDefinitions(self)
UpdatePresets(self)
const { actions, feedbacks, presets, structure } = self
const context = { type: 'action' }
const defaults = (def) => Object.fromEntries((def.options || []).map((o) => [o.id, o.default]))

// ---- definition checks (no app needed) ----
const defs = Object.keys(self.variableDefs)
const vals = Object.keys(getVariableValues(getDefaultStatus()))
assert.deepStrictEqual([...defs].sort(), [...vals].sort(), 'variable definitions == values')
const varRef = /\$\(wakemedia-stagetime:([a-zA-Z0-9_]+)\)/g
for (const [key, pr] of Object.entries(presets)) {
	assert.strictEqual(pr.type, 'simple', `preset ${key}: type`)
	for (const step of pr.steps)
		for (const a of [...step.down, ...step.up]) {
			assert.ok(actions[a.actionId], `preset ${key}: unknown action ${a.actionId}`)
			const allowed = new Set((actions[a.actionId].options || []).map((o) => o.id))
			for (const k of Object.keys(a.options))
				assert.ok(allowed.has(k), `preset ${key}: action ${a.actionId} has no option ${k}`)
		}
	for (const f of pr.feedbacks) {
		assert.ok(feedbacks[f.feedbackId], `preset ${key}: unknown feedback ${f.feedbackId}`)
		const allowed = new Set((feedbacks[f.feedbackId].options || []).map((o) => o.id))
		for (const k of Object.keys(f.options || {}))
			assert.ok(allowed.has(k), `preset ${key}: feedback ${f.feedbackId} has no option ${k}`)
		if (feedbacks[f.feedbackId].type === 'boolean')
			assert.ok(f.style, `preset ${key}: boolean feedback ${f.feedbackId} needs a style`)
	}
	for (const m of JSON.stringify(pr).matchAll(varRef))
		assert.ok(defs.includes(m[1]), `preset ${key}: unknown variable ${m[1]}`)
}
// structure references every preset exactly once, and only real presets
const referenced = structure.flatMap((s) => s.definitions)
assert.deepStrictEqual([...referenced].sort(), Object.keys(presets).sort(), 'preset structure lists every preset once')
assert.strictEqual(new Set(structure.map((s) => s.id)).size, structure.length, 'section ids unique')
const categoryOf = Object.fromEntries(structure.flatMap((s) => s.definitions.map((id) => [id, s.name])))
const categories = new Set(Object.values(categoryOf))
for (const cat of categories) {
	const sigs = Object.entries(presets)
		.filter(([id]) => categoryOf[id] === cat)
		.filter(([, pr]) => pr.steps.some((st) => st.down.length || st.up.length)) // display-only readouts may share empty steps
		.map(([, pr]) => JSON.stringify(pr.steps))
	assert.strictEqual(new Set(sigs).size, sigs.length, `${cat}: no two presets with identical actions`)
}
const names = Object.values(presets).map((pr) => pr.name)
assert.strictEqual(new Set(names).size, names.length, 'no duplicate preset names')
for (const o of TOGGLE_OPTIONS) {
	const covered =
		Object.values(presets).some((pr) => JSON.stringify(pr).includes(`"option":"${o.id}"`)) ||
		(o.id === 'blackout' && presets.display_blackout) ||
		(o.id === 'hour12' && presets.clock_format)
	assert.ok(covered, `toggle option ${o.id} has no preset`)
	assert.ok(o.statusKey in self.state, `${o.id}: status key ${o.statusKey} exists`)
}
// feedbacks run on the default state
for (const [id, def] of Object.entries(feedbacks)) {
	const out = def.callback({ feedbackId: id, options: defaults(def) }, { type: 'feedback' })
	if (def.type === 'boolean') assert.strictEqual(typeof out, 'boolean', `${id}: boolean feedback must return boolean`)
	else assert.strictEqual(typeof out, 'object', `${id}: advanced feedback must return a style object`)
}
self.state.lightColor = 'yellow'
assert.strictEqual(feedbacks.wrapUp.callback({ options: {} }), true)
assert.strictEqual(feedbacks.lightIs.callback({ options: { color: 'yellow' } }), true)
self.state.remainingSeconds = 30
assert.strictEqual(feedbacks.remainingBelow.callback({ options: { seconds: 60 } }), true)
self.state.countUpMode = true
assert.strictEqual(feedbacks.remainingBelow.callback({ options: { seconds: 60 } }), false, 'not in stopwatch mode')
assert.strictEqual(feedbacks.modeIs.callback({ options: { mode: 'stopwatch' } }), true)
self.state.timeZone = 'America/Chicago'
assert.strictEqual(feedbacks.timeZoneIs.callback({ options: { zone: 'America/Chicago', custom: '' } }), true)
assert.strictEqual(feedbacks.timeZoneIs.callback({ options: { zone: 'custom', custom: 'America/Chicago' } }), true)
assert.strictEqual(feedbacks.timeZoneIs.callback({ options: { zone: 'UTC', custom: '' } }), false)
self.state = getDefaultStatus()

if (!haveApp) {
	console.log(
		`module: definition checks passed (${Object.keys(actions).length} actions, ${Object.keys(feedbacks).length} feedbacks, ${defs.length} variables, ${Object.keys(presets).length} presets in ${categories.size} sections); StageTime source not found at ${appDir}, API checks skipped`,
	)
} else {
	await apiChecks()
}

async function apiChecks() {
	// ---- boot the app ----
	const app = spawn(process.execPath, [path.join(here, 'boot-app.cjs')], {
		env: { ...process.env, PORT: String(PORT), STAGETIME_APP_DIR: appDir, STAGETIME_API_KEY: API_KEY },
		stdio: ['pipe', 'pipe', 'inherit'],
	})
	await new Promise((resolve, reject) => {
		app.stdout.on('data', (d) => {
			if (String(d).includes('READY')) resolve()
		})
		app.on('exit', (code) => reject(new Error(`app exited early (${code})`)))
		setTimeout(() => reject(new Error('app did not start')), 8000)
	})
	const pushState = (state) => app.stdin.write(JSON.stringify(state) + '\n')
	const done = (code) => {
		app.kill()
		process.exitCode = code
	}

	try {
		// 1) every action hits a real route the app accepts
		const acceptableErrors = [
			/slot \d is empty/i,
			/not found/i,
			/no preset/i,
			/no monitor/i,
			/is the main display/i,
			/no cue/i,
		]
		let fired = 0
		for (const [id, def] of Object.entries(actions)) {
			calls.length = 0
			await def.callback({ actionId: id, options: defaults(def) }, context)
			const quiet = ['loadPresetByName'] // '' name → no call by design
			if (quiet.includes(id)) {
				assert.strictEqual(calls.length, 0, `${id}: should not call with empty input`)
				continue
			}
			assert.ok(calls.length > 0, `${id}: made no API call`)
			for (const c of calls) {
				const okOrKnown = c.res.ok || acceptableErrors.some((re) => re.test(c.res.error || ''))
				assert.ok(okOrKnown, `${id}: ${c.path} → ${JSON.stringify(c.res)}`)
				assert.ok(!/unknown endpoint/i.test(c.res.error || ''), `${id}: ${c.path} is not a real route`)
			}
			fired++
		}

		// 1b) toggles read the live state: blackout toggle sends on when off and off when on
		calls.length = 0
		self.state.flashOn = false
		await actions.setOption.callback({ actionId: 'setOption', options: { option: 'flash', state: 'toggle' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/flash/on', 'toggle from off → on')
		self.state.flashOn = true
		await actions.setOption.callback({ actionId: 'setOption', options: { option: 'flash', state: 'toggle' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/flash/off', 'toggle from on → off')
		self.state.messageVisible = true
		await actions.toggleMessage.callback({ actionId: 'toggleMessage', options: { text: 'X', layout: 'pref' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/message/hide', 'toggleMessage hides when a message is up')
		self.state.messageVisible = false
		await actions.showMessage.callback({ actionId: 'showMessage', options: { text: 'A B', layout: 'with' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/message?text=A%20B&withTimer=1', 'layout → withTimer flag')
		await actions.endAt.callback({ actionId: 'endAt', options: { time: 'nope' } }, context)
		assert.ok(
			logs.some((l) => /HH:MM/.test(l.msg)),
			'bad end-at time is rejected locally',
		)
		const beforeEnd = calls.length
		for (const bad of ['99:99', '24:00', '12:60']) {
			await actions.endAt.callback({ actionId: 'endAt', options: { time: bad } }, context)
		}
		assert.strictEqual(calls.length, beforeEnd, 'out-of-range hours/minutes never reach the API')
		await actions.endAt.callback({ actionId: 'endAt', options: { time: '23:59' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/endat?time=23%3A59', 'a valid time is sent')
		await actions.endAt.callback({ actionId: 'endAt', options: { time: '9:05' } }, context)
		assert.strictEqual(calls.at(-1).path, '/api/endat?time=9%3A05', 'single-digit hour accepted')
		// API 2.0: a field referenced by isVisibleExpression must have disableAutoExpression
		for (const [what, def] of [
			['action setTimeZone', actions.setTimeZone],
			['feedback timeZoneIs', feedbacks.timeZoneIs],
		]) {
			const zone = def.options.find((o) => o.id === 'zone')
			assert.strictEqual(zone.disableAutoExpression, true, `${what}: zone dropdown has disableAutoExpression`)
		}
		// the app requires the key for commands; status stays open (StageTime 1.2 API key)
		{
			const denied = await sendCommand(HOST, PORT, '/api/start')
			assert.strictEqual(denied.ok, false)
			assert.strictEqual(denied.error, 'API key required', 'no header → rejected')
			const open = await sendCommand(HOST, PORT, '/api/status')
			assert.strictEqual(open.ok, true, 'status never needs the key')
			assert.strictEqual(open.apiKeySet, true)
		}
		// every toggle option's paths are real routes
		for (const o of TOGGLE_OPTIONS) {
			for (const p of [o.onPath, o.offPath]) {
				const res = await sendCommand(HOST, PORT, p, API_KEY)
				assert.ok(res.ok, `${o.id}: ${p} → ${JSON.stringify(res)}`)
			}
			assert.ok(o.statusKey in self.state, `${o.id}: status key ${o.statusKey} exists`)
		}

		// 4) event stream delivers the initial state and pushes changes
		const seen = []
		const events = new StageTimeEvents(
			HOST,
			PORT,
			(s) => seen.push(s),
			() => {},
			(e) => {
				throw e
			},
		)
		events.connect()
		await new Promise((r) => setTimeout(r, 300))
		assert.ok(seen.length >= 1, 'initial state arrives on connect')
		assert.strictEqual(seen[0].formattedTime, '00:00')
		pushState({
			remainingSeconds: 583,
			running: true,
			formattedTime: '09:43',
			formattedTimeSigned: '09:43',
			lightColor: 'green',
		})
		await new Promise((r) => setTimeout(r, 300))
		assert.strictEqual(seen.at(-1).formattedTime, '09:43', 'state change pushed over SSE')
		assert.strictEqual(seen.at(-1).formattedTimeSigned, '09:43', 'signed time filled in')
		assert.strictEqual(seen.at(-1).running, true)
		events.close()
		const polled = await fetchStatus(HOST, PORT)
		assert.strictEqual(polled.formattedTime, '09:43', 'polling sees the same state')
		const vv = getVariableValues(polled)
		assert.strictEqual(vv.timerMinutes, 9)
		assert.strictEqual(vv.timerSeconds, 43)
		assert.strictEqual(vv.mode, 'countdown')

		console.log(
			`module: all checks passed; ${fired} actions fired, ${Object.keys(feedbacks).length} feedbacks, ${defs.length} variables, ${Object.keys(presets).length} presets in ${categories.size} sections`,
		)
		done(0)
	} catch (err) {
		console.error(err)
		done(1)
	}
}
