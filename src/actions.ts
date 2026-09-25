import type StageTimeInstance from './main.js'
import { TOGGLE_OPTIONS, TIME_ZONES } from './api.js'

type OnOffToggle = 'on' | 'off' | 'toggle'
type Layout = 'pref' | 'with' | 'full'
type Mode = 'countdown' | 'stopwatch' | 'clock'

export type ActionsSchema = {
	start: { options: Record<string, never> }
	stop: { options: Record<string, never> }
	toggle: { options: Record<string, never> }
	clear: { options: Record<string, never> }
	setTime: { options: { minutes: number; seconds: number } }
	addTime: { options: { amount: number; unit: 'minutes' | 'seconds' } }
	addMinutes: { options: { amount: number } }
	addSeconds: { options: { amount: number } }
	endAt: { options: { time: string } }
	setWrapUp: { options: { minutes: number; seconds: number } }
	loadPreset: { options: { slot: string } }
	loadPresetByName: { options: { name: string } }
	mode: { options: { mode: Mode } }
	modeCountdown: { options: Record<string, never> }
	modeLocalTime: { options: Record<string, never> }
	countUpOn: { options: Record<string, never> }
	countUpOff: { options: Record<string, never> }
	milliseconds: { options: { state: OnOffToggle } }
	showMessage: { options: { text: string; layout: Layout } }
	hideMessage: { options: Record<string, never> }
	toggleMessage: { options: { text: string; layout: Layout } }
	quickMessage: { options: { slot: string } }
	setAutoMessageText: { options: { text: string } }
	blackout: { options: { state: OnOffToggle } }
	background: { options: { color: 'blue' | 'black' | 'toggle' } }
	bgBlue: { options: Record<string, never> }
	bgBlack: { options: Record<string, never> }
	clockFormat: { options: { format: '12h' | '24h' | 'toggle' } }
	setTimeZone: { options: { zone: string; custom: string } }
	setOption: { options: { option: string; state: OnOffToggle } }
	soundTest: { options: Record<string, never> }
	soundVolume: { options: { level: number } }
	soundDefault: { options: Record<string, never> }
	mirror: { options: { monitor: number; state: 'on' | 'off' } }
	clearLog: { options: Record<string, never> }
	rundownNext: { options: Record<string, never> }
	rundownPrev: { options: Record<string, never> }
	rundownGo: { options: { cue: number; start: 'go' | 'load' } }
	rundownStandby: { options: { cue: number } }
	rundownAutoAdvance: { options: { state: OnOffToggle } }
	rundownReset: { options: Record<string, never> }
	flashOn: { options: Record<string, never> }
	flashOff: { options: Record<string, never> }
	stopAtZeroOn: { options: Record<string, never> }
	stopAtZeroOff: { options: Record<string, never> }
}

const STATE_CHOICES = [
	{ id: 'on', label: 'On' },
	{ id: 'off', label: 'Off' },
	{ id: 'toggle', label: 'Toggle' },
]
const LAYOUT_CHOICES = [
	{ id: 'pref', label: 'Use the "keep timer visible" preference' },
	{ id: 'with', label: 'Beneath the timer' },
	{ id: 'full', label: 'Full screen (replace the timer)' },
]
const MODE_CHOICES = [
	{ id: 'countdown', label: 'Countdown' },
	{ id: 'stopwatch', label: 'Stopwatch' },
	{ id: 'clock', label: 'Clock' },
]

function messagePath(text: string, layout: Layout): string {
	let path = `/api/message?text=${encodeURIComponent(text)}`
	if (layout === 'with') path += '&withTimer=1'
	else if (layout === 'full') path += '&withTimer=0'
	return path
}

export function UpdateActions(self: StageTimeInstance): void {
	/** Resolve on/off/toggle against the current state and send the matching path. */
	const setToggle = async (optionId: string, state: OnOffToggle): Promise<void> => {
		const opt = TOGGLE_OPTIONS.find((o) => o.id === optionId)
		if (!opt) return
		let on = state === 'on'
		if (state === 'toggle') on = !self.state[opt.statusKey]
		await self.sendApi(on ? opt.onPath : opt.offPath)
	}

	self.setActionDefinitions({
		// =============== Timer ===============
		start: {
			name: 'Timer: Start',
			description: 'Start the countdown or stopwatch. Ignored when a countdown is at 00:00.',
			options: [],
			callback: async () => {
				await self.sendApi('/api/start')
			},
		},
		stop: {
			name: 'Timer: Stop',
			options: [],
			callback: async () => {
				await self.sendApi('/api/stop')
			},
		},
		toggle: {
			name: 'Timer: Start / Stop',
			options: [],
			callback: async () => {
				await self.sendApi('/api/toggle')
			},
		},
		clear: {
			name: 'Timer: Clear',
			description: 'Stop and reset to 00:00',
			options: [],
			callback: async () => {
				await self.sendApi('/api/clear')
			},
		},
		setTime: {
			name: 'Timer: Set time',
			description: 'Clear and set the countdown',
			options: [
				{ type: 'number', id: 'minutes', label: 'Minutes', default: 10, min: 0, max: 999 },
				{ type: 'number', id: 'seconds', label: 'Seconds', default: 0, min: 0, max: 59 },
			],
			callback: async (event) => {
				await self.sendApi(`/api/set?minutes=${Number(event.options.minutes)}&seconds=${Number(event.options.seconds)}`)
			},
		},
		addTime: {
			name: 'Timer: Add / subtract time',
			description: 'Works while running. Negative values subtract.',
			options: [
				{ type: 'number', id: 'amount', label: 'Amount', default: 1, min: -999, max: 999 },
				{
					type: 'dropdown',
					id: 'unit',
					label: 'Unit',
					default: 'minutes',
					choices: [
						{ id: 'minutes', label: 'Minutes' },
						{ id: 'seconds', label: 'Seconds' },
					],
				},
			],
			callback: async (event) => {
				const unit = event.options.unit === 'seconds' ? 'seconds' : 'minutes'
				await self.sendApi(`/api/add?${unit}=${Number(event.options.amount)}`)
			},
		},
		addMinutes: {
			name: 'Timer: Add / subtract minutes',
			options: [
				{ type: 'number', id: 'amount', label: 'Minutes (negative to subtract)', default: 1, min: -999, max: 999 },
			],
			callback: async (event) => {
				await self.sendApi(`/api/add?minutes=${Number(event.options.amount)}`)
			},
		},
		addSeconds: {
			name: 'Timer: Add / subtract seconds',
			options: [
				{ type: 'number', id: 'amount', label: 'Seconds (negative to subtract)', default: 30, min: -999, max: 999 },
			],
			callback: async (event) => {
				await self.sendApi(`/api/add?seconds=${Number(event.options.amount)}`)
			},
		},
		endAt: {
			name: 'Timer: Count down to a clock time',
			description:
				"Sets and starts a countdown that hits zero at this time (24h, in the display's clock zone; tomorrow if already past)",
			options: [{ type: 'textinput', id: 'time', label: 'Time (HH:MM)', default: '14:30', useVariables: true }],
			callback: async (event) => {
				const time = String(event.options.time ?? '').trim()
				const m = /^(\d{1,2}):(\d{2})$/.exec(time)
				if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) {
					self.log('warn', `End at: "${time}" is not a valid HH:MM (00:00–23:59)`)
					return
				}
				await self.sendApi(`/api/endat?time=${encodeURIComponent(time)}`)
			},
		},
		setWrapUp: {
			name: 'Timer: Set wrap-up warning',
			description: 'Yellow light when this much time remains. 0:00 disables.',
			options: [
				{ type: 'number', id: 'minutes', label: 'Minutes', default: 2, min: 0, max: 999 },
				{ type: 'number', id: 'seconds', label: 'Seconds', default: 0, min: 0, max: 59 },
			],
			callback: async (event) => {
				await self.sendApi(
					`/api/wrapup?minutes=${Number(event.options.minutes)}&seconds=${Number(event.options.seconds)}`,
				)
			},
		},

		// =============== Presets ===============
		loadPreset: {
			name: 'Preset: Load slot',
			description: "Clears the timer and loads the preset's time and wrap-up",
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'Preset slot',
					default: '1',
					choices: [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `Preset ${n}` })),
				},
			],
			callback: async (event) => {
				await self.sendApi(`/api/preset/${event.options.slot}`)
			},
		},
		loadPresetByName: {
			name: 'Preset: Load by name',
			options: [{ type: 'textinput', id: 'name', label: 'Preset name', default: '', useVariables: true }],
			callback: async (event) => {
				const name = String(event.options.name ?? '').trim()
				if (!name) return
				await self.sendApi(`/api/preset/load?name=${encodeURIComponent(name)}`)
			},
		},

		// =============== Modes ===============
		mode: {
			name: 'Mode: Set',
			options: [{ type: 'dropdown', id: 'mode', label: 'Mode', default: 'countdown', choices: MODE_CHOICES }],
			callback: async (event) => {
				switch (event.options.mode) {
					case 'stopwatch':
						await self.sendApi('/api/countup/on')
						break
					case 'clock':
						await self.sendApi('/api/mode/local')
						break
					default:
						await self.sendApi('/api/mode/countdown')
				}
			},
		},
		modeCountdown: {
			name: 'Mode: Countdown',
			options: [],
			callback: async () => {
				await self.sendApi('/api/mode/countdown')
			},
		},
		modeLocalTime: {
			name: 'Mode: Clock',
			options: [],
			callback: async () => {
				await self.sendApi('/api/mode/local')
			},
		},
		countUpOn: {
			name: 'Mode: Stopwatch',
			options: [],
			callback: async () => {
				await self.sendApi('/api/countup/on')
			},
		},
		countUpOff: {
			name: 'Mode: Stopwatch off (back to countdown)',
			options: [],
			callback: async () => {
				await self.sendApi('/api/countup/off')
			},
		},
		milliseconds: {
			name: 'Stopwatch: Milliseconds',
			description: 'Show MM:SS.mmm in stopwatch mode',
			options: [{ type: 'dropdown', id: 'state', label: 'State', default: 'toggle', choices: STATE_CHOICES }],
			callback: async (event) => {
				await setToggle('milliseconds', event.options.state)
			},
		},

		// =============== Messages ===============
		showMessage: {
			name: 'Message: Show',
			options: [
				{ type: 'textinput', id: 'text', label: 'Message text (max 6 words)', default: 'WRAP UP', useVariables: true },
				{ type: 'dropdown', id: 'layout', label: 'Layout', default: 'pref', choices: LAYOUT_CHOICES },
			],
			callback: async (event) => {
				const text = String(event.options.text ?? '').trim()
				if (!text) return
				await self.sendApi(messagePath(text, event.options.layout))
			},
		},
		hideMessage: {
			name: 'Message: Hide',
			options: [],
			callback: async () => {
				await self.sendApi('/api/message/hide')
			},
		},
		toggleMessage: {
			name: 'Message: Show / hide',
			description: 'Shows the text if no message is up, otherwise hides the current message',
			options: [
				{ type: 'textinput', id: 'text', label: 'Message text', default: 'WRAP UP', useVariables: true },
				{ type: 'dropdown', id: 'layout', label: 'Layout', default: 'pref', choices: LAYOUT_CHOICES },
			],
			callback: async (event) => {
				if (self.state.messageVisible) {
					await self.sendApi('/api/message/hide')
					return
				}
				const text = String(event.options.text ?? '').trim()
				if (!text) return
				await self.sendApi(messagePath(text, event.options.layout))
			},
		},
		quickMessage: {
			name: 'Message: Show quick message',
			description: 'Shows one of the quick messages saved in the remote',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'Slot',
					default: '1',
					choices: [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `Quick message ${n}` })),
				},
			],
			callback: async (event) => {
				await self.sendApi(`/api/quickmessage/${event.options.slot}`)
			},
		},
		setAutoMessageText: {
			name: 'Message: Set auto-message text',
			description: 'The message shown automatically at zero (when that option is on)',
			options: [{ type: 'textinput', id: 'text', label: 'Text', default: "TIME'S UP", useVariables: true }],
			callback: async (event) => {
				const text = String(event.options.text ?? '').trim()
				if (!text) return
				await self.sendApi(`/api/automessage?text=${encodeURIComponent(text)}`)
			},
		},

		// =============== Display ===============
		blackout: {
			name: 'Display: Blackout',
			description: 'Black out the display instantly; the timer keeps running underneath',
			options: [{ type: 'dropdown', id: 'state', label: 'State', default: 'toggle', choices: STATE_CHOICES }],
			callback: async (event) => {
				const state = event.options.state
				await self.sendApi(state === 'toggle' ? '/api/blackout/toggle' : `/api/blackout/${state}`)
			},
		},
		background: {
			name: 'Display: Background',
			options: [
				{
					type: 'dropdown',
					id: 'color',
					label: 'Background',
					default: 'toggle',
					choices: [
						{ id: 'blue', label: 'Blue (keying)' },
						{ id: 'black', label: 'Black' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				const c = event.options.color
				await setToggle('bgBlue', c === 'blue' ? 'on' : c === 'black' ? 'off' : 'toggle')
			},
		},
		bgBlue: {
			name: 'Display: Background blue',
			options: [],
			callback: async () => {
				await self.sendApi('/api/background/blue')
			},
		},
		bgBlack: {
			name: 'Display: Background black',
			options: [],
			callback: async () => {
				await self.sendApi('/api/background/black')
			},
		},
		clockFormat: {
			name: 'Clock: Format',
			options: [
				{
					type: 'dropdown',
					id: 'format',
					label: 'Format',
					default: 'toggle',
					choices: [
						{ id: '12h', label: '12-hour' },
						{ id: '24h', label: '24-hour' },
						{ id: 'toggle', label: 'Toggle' },
					],
				},
			],
			callback: async (event) => {
				const f = event.options.format
				await setToggle('hour12', f === '12h' ? 'on' : f === '24h' ? 'off' : 'toggle')
			},
		},
		setTimeZone: {
			name: 'Clock: Time zone',
			description: 'Zone for the clock and for "count down to a clock time"',
			options: [
				{
					type: 'dropdown',
					id: 'zone',
					label: 'Zone',
					default: 'system',
					choices: TIME_ZONES,
					disableAutoExpression: true,
				},
				{
					type: 'textinput',
					id: 'custom',
					label: 'Custom IANA zone (e.g. Europe/Madrid)',
					default: '',
					useVariables: true,
					isVisibleExpression: '$(options:zone) === "custom"',
				},
			],
			callback: async (event) => {
				let tz = String(event.options.zone ?? 'system')
				if (tz === 'custom') tz = String(event.options.custom ?? '').trim()
				if (!tz) return
				await self.sendApi(`/api/timezone?tz=${encodeURIComponent(tz)}`)
			},
		},

		// =============== Options ===============
		setOption: {
			name: 'Option: Set',
			description: 'Turn any on/off option on, off, or toggle it',
			options: [
				{
					type: 'dropdown',
					id: 'option',
					label: 'Option',
					default: 'flash',
					choices: TOGGLE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
				},
				{ type: 'dropdown', id: 'state', label: 'State', default: 'toggle', choices: STATE_CHOICES },
			],
			callback: async (event) => {
				await setToggle(event.options.option, event.options.state)
			},
		},
		soundTest: {
			name: 'Option: Test buzzer',
			description: 'Plays the buzzer now, whether or not it is enabled',
			options: [],
			callback: async () => {
				await self.sendApi('/api/sound/test')
			},
		},
		soundVolume: {
			name: 'Option: Buzzer volume',
			options: [{ type: 'number', id: 'level', label: 'Volume (0–100)', default: 100, min: 0, max: 100 }],
			callback: async (event) => {
				await self.sendApi(
					`/api/sound/volume?level=${Math.max(0, Math.min(100, Math.round(Number(event.options.level))))}`,
				)
			},
		},
		soundDefault: {
			name: 'Option: Buzzer back to built-in beeps',
			description: 'Drops any custom sound chosen under Options ▸ Buzzer Sound… in StageTime',
			options: [],
			callback: async () => {
				await self.sendApi('/api/sound/default')
			},
		},
		mirror: {
			name: 'Display: Mirror to a monitor',
			description: "Monitors are numbered as in StageTime's Display On… menu (and /api/displays)",
			options: [
				{ type: 'number', id: 'monitor', label: 'Monitor number', default: 2, min: 1, max: 16 },
				{
					type: 'dropdown',
					id: 'state',
					label: 'State',
					default: 'on',
					choices: [
						{ id: 'on', label: 'On' },
						{ id: 'off', label: 'Off' },
					],
				},
			],
			callback: async (event) => {
				const n = Math.max(1, Math.round(Number(event.options.monitor)))
				await self.sendApi(`/api/mirror/${n}/${event.options.state === 'off' ? 'off' : 'on'}`)
			},
		},
		rundownNext: {
			name: 'Rundown: GO (fire the standby cue)',
			description: 'Loads and starts the standby cue and puts the following one on standby, like the GO button',
			options: [],
			callback: async () => {
				await self.sendApi('/api/rundown/next')
			},
		},
		rundownPrev: {
			name: 'Rundown: Previous cue',
			options: [],
			callback: async () => {
				await self.sendApi('/api/rundown/prev')
			},
		},
		rundownGo: {
			name: 'Rundown: Go to cue',
			options: [
				{ type: 'number', id: 'cue', label: 'Cue number', default: 1, min: 1, max: 999 },
				{
					type: 'dropdown',
					id: 'start',
					label: 'Then',
					default: 'go',
					choices: [
						{ id: 'go', label: 'Load and start' },
						{ id: 'load', label: 'Load only' },
					],
				},
			],
			callback: async (event) => {
				const n = Math.max(1, Math.round(Number(event.options.cue)))
				await self.sendApi(`/api/rundown/${event.options.start === 'load' ? 'load' : 'go'}/${n}`)
			},
		},
		rundownStandby: {
			name: 'Rundown: Stand by cue',
			description: 'Puts cue N on standby so the next GO fires it',
			options: [{ type: 'number', id: 'cue', label: 'Cue number', default: 1, min: 1, max: 999 }],
			callback: async (event) => {
				await self.sendApi(`/api/rundown/standby/${Math.max(1, Math.round(Number(event.options.cue)))}`)
			},
		},
		rundownAutoAdvance: {
			name: 'Rundown: Auto-advance at zero',
			options: [{ type: 'dropdown', id: 'state', label: 'State', default: 'toggle', choices: STATE_CHOICES }],
			callback: async (event) => {
				let on = event.options.state === 'on'
				if (event.options.state === 'toggle') on = !self.state.rundownAutoAdvance
				await self.sendApi(`/api/rundown/autoadvance/${on ? 'on' : 'off'}`)
			},
		},
		rundownReset: {
			name: 'Rundown: Reset run data',
			options: [],
			callback: async () => {
				await self.sendApi('/api/rundown/reset')
			},
		},
		clearLog: {
			name: 'App: Reset the connection log',
			options: [],
			callback: async () => {
				await self.sendApi('/api/log/clear')
			},
		},
		flashOn: {
			name: 'Option: Flash at zero on',
			options: [],
			callback: async () => {
				await self.sendApi('/api/flash/on')
			},
		},
		flashOff: {
			name: 'Option: Flash at zero off',
			options: [],
			callback: async () => {
				await self.sendApi('/api/flash/off')
			},
		},
		stopAtZeroOn: {
			name: 'Option: Stop at zero on',
			options: [],
			callback: async () => {
				await self.sendApi('/api/stopatzero/on')
			},
		},
		stopAtZeroOff: {
			name: 'Option: Stop at zero off',
			options: [],
			callback: async () => {
				await self.sendApi('/api/stopatzero/off')
			},
		},
	})
}
