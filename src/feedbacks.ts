import { combineRgb } from '@companion-module/base'
import type StageTimeInstance from './main.js'
import { TOGGLE_OPTIONS, TIME_ZONES, type StageTimeStatus } from './api.js'

type Empty = Record<string, never>

export type FeedbacksSchema = {
	lightColor: { type: 'advanced'; options: Empty }
	lightIs: { type: 'boolean'; options: { color: 'green' | 'yellow' | 'red' | 'gray' } }
	wrapUp: { type: 'boolean'; options: Empty }
	overtime: { type: 'boolean'; options: Empty }
	remainingBelow: { type: 'boolean'; options: { seconds: number } }
	timerRunning: { type: 'boolean'; options: Empty }
	timerStopped: { type: 'boolean'; options: Empty }
	modeIs: { type: 'boolean'; options: { mode: 'countdown' | 'stopwatch' | 'clock' } }
	modeCountdown: { type: 'boolean'; options: Empty }
	modeLocalTime: { type: 'boolean'; options: Empty }
	countUpActive: { type: 'boolean'; options: Empty }
	messageVisible: { type: 'boolean'; options: Empty }
	quickMessageSet: { type: 'boolean'; options: { slot: string } }
	presetSet: { type: 'boolean'; options: { slot: string } }
	optionOn: { type: 'boolean'; options: { option: string } }
	timeZoneIs: { type: 'boolean'; options: { zone: string; custom: string } }
	rundownCueIs: { type: 'boolean'; options: { cue: number } }
	rundownStandbyIs: { type: 'boolean'; options: { cue: number } }
	rundownOver: { type: 'boolean'; options: Empty }
	blackout: { type: 'boolean'; options: Empty }
}

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
export const COLORS = {
	green: combineRgb(0, 180, 0),
	yellow: combineRgb(200, 180, 0),
	red: combineRgb(200, 0, 0),
	gray: combineRgb(50, 50, 50),
	on: combineRgb(0, 120, 0),
	purple: combineRgb(100, 0, 100),
	blue: combineRgb(0, 60, 200),
}

const modeOf = (st: StageTimeStatus): 'countdown' | 'stopwatch' | 'clock' =>
	st.localMode ? 'clock' : st.countUpMode ? 'stopwatch' : 'countdown'

export function UpdateFeedbacks(self: StageTimeInstance): void {
	const s = () => self.state
	self.setFeedbackDefinitions({
		// --- Light ---
		lightColor: {
			type: 'advanced',
			name: 'Light: colour the button like the traffic light',
			description:
				'Button background follows the timer light (green / yellow / red / gray). For full control over the styles, use "Light: is a colour" once per colour instead.',
			options: [],
			affectedProperties: ['bgcolor', 'color'],
			callback: () => {
				switch (s().lightColor) {
					case 'green':
						return { bgcolor: COLORS.green, color: WHITE }
					case 'yellow':
						return { bgcolor: COLORS.yellow, color: BLACK }
					case 'red':
						return { bgcolor: COLORS.red, color: WHITE }
					default:
						return { bgcolor: COLORS.gray, color: combineRgb(150, 150, 150) }
				}
			},
		},
		lightIs: {
			type: 'boolean',
			name: 'Light: is a colour',
			description: 'True when the traffic light is the chosen colour',
			options: [
				{
					type: 'dropdown',
					id: 'color',
					label: 'Colour',
					default: 'red',
					choices: [
						{ id: 'green', label: 'Green (running, time left)' },
						{ id: 'yellow', label: 'Yellow (wrap-up)' },
						{ id: 'red', label: 'Red (zero / overtime)' },
						{ id: 'gray', label: 'Gray (stopped / clock)' },
					],
				},
			],
			defaultStyle: { bgcolor: COLORS.red, color: WHITE },
			callback: (feedback) => s().lightColor === feedback.options.color,
		},
		wrapUp: {
			type: 'boolean',
			name: 'Timer: in wrap-up zone',
			description: 'True while the countdown is below the wrap-up threshold (yellow light)',
			options: [],
			defaultStyle: { bgcolor: COLORS.yellow, color: BLACK },
			callback: () => s().lightColor === 'yellow',
		},
		overtime: {
			type: 'boolean',
			name: 'Timer: in overtime',
			description: 'True once a countdown has passed zero',
			options: [],
			defaultStyle: { bgcolor: COLORS.red, color: WHITE },
			callback: () => s().overtime,
		},
		remainingBelow: {
			type: 'boolean',
			name: 'Timer: remaining time below',
			description: 'True when the countdown has less than this many seconds left (overtime counts)',
			options: [{ type: 'number', id: 'seconds', label: 'Seconds', default: 60, min: -3600, max: 36000 }],
			defaultStyle: { bgcolor: COLORS.yellow, color: BLACK },
			callback: (feedback) => {
				const st = s()
				return !st.localMode && !st.countUpMode && st.remainingSeconds < Number(feedback.options.seconds)
			},
		},

		// --- Running ---
		timerRunning: {
			type: 'boolean',
			name: 'Timer: running',
			description: 'True when the countdown or stopwatch is running',
			options: [],
			defaultStyle: { bgcolor: combineRgb(0, 100, 0), color: WHITE },
			callback: () => s().running,
		},
		timerStopped: {
			type: 'boolean',
			name: 'Timer: stopped',
			description: 'True when the timer is not running',
			options: [],
			defaultStyle: { bgcolor: combineRgb(100, 0, 0), color: WHITE },
			callback: () => !s().running,
		},

		// --- Modes ---
		modeIs: {
			type: 'boolean',
			name: 'Mode: is',
			description: 'True when the display is in the chosen mode',
			options: [
				{
					type: 'dropdown',
					id: 'mode',
					label: 'Mode',
					default: 'countdown',
					choices: [
						{ id: 'countdown', label: 'Countdown' },
						{ id: 'stopwatch', label: 'Stopwatch' },
						{ id: 'clock', label: 'Clock' },
					],
				},
			],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: (feedback) => modeOf(s()) === feedback.options.mode,
		},
		modeCountdown: {
			type: 'boolean',
			name: 'Mode: countdown active',
			description: 'True when in normal countdown mode',
			options: [],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: () => modeOf(s()) === 'countdown',
		},
		modeLocalTime: {
			type: 'boolean',
			name: 'Mode: clock active',
			description: 'True when showing the time of day',
			options: [],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: () => s().localMode,
		},
		countUpActive: {
			type: 'boolean',
			name: 'Mode: stopwatch active',
			description: 'True when in stopwatch (count-up) mode',
			options: [],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: () => s().countUpMode,
		},

		// --- Messages ---
		messageVisible: {
			type: 'boolean',
			name: 'Message: visible',
			description: 'True when a message is on the display',
			options: [],
			defaultStyle: { bgcolor: COLORS.purple, color: WHITE },
			callback: () => s().messageVisible,
		},
		quickMessageSet: {
			type: 'boolean',
			name: 'Message: quick message slot has text',
			description: 'True when the chosen quick message slot is not empty (hide unused buttons)',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'Slot',
					default: '1',
					choices: [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `Quick message ${n}` })),
				},
			],
			defaultStyle: { bgcolor: combineRgb(100, 50, 0), color: WHITE },
			callback: (feedback) => Boolean(s()[`quick_${feedback.options.slot}_text` as keyof StageTimeStatus]),
		},
		presetSet: {
			type: 'boolean',
			name: 'Preset: slot has a preset',
			description: 'True when the chosen preset slot is saved (hide unused buttons)',
			options: [
				{
					type: 'dropdown',
					id: 'slot',
					label: 'Slot',
					default: '1',
					choices: [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `Preset ${n}` })),
				},
			],
			defaultStyle: { bgcolor: combineRgb(30, 30, 50), color: WHITE },
			callback: (feedback) => Boolean(s()[`preset_${feedback.options.slot}_name` as keyof StageTimeStatus]),
		},

		// --- Options ---
		optionOn: {
			type: 'boolean',
			name: 'Option: is on',
			description: 'True when the chosen option is on (flash, buzzer, blackout, blue background, …)',
			options: [
				{
					type: 'dropdown',
					id: 'option',
					label: 'Option',
					default: 'blackout',
					choices: TOGGLE_OPTIONS.map((o) => ({ id: o.id, label: o.label })),
				},
			],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: (feedback) => {
				const opt = TOGGLE_OPTIONS.find((o) => o.id === feedback.options.option)
				return opt ? Boolean(s()[opt.statusKey]) : false
			},
		},
		timeZoneIs: {
			type: 'boolean',
			name: 'Clock: time zone is',
			description: 'True when the clock is set to the chosen time zone',
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
					label: 'Custom IANA zone',
					default: '',
					isVisibleExpression: '$(options:zone) === "custom"',
				},
			],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: (feedback) => {
				const want =
					feedback.options.zone === 'custom'
						? String(feedback.options.custom ?? '').trim()
						: String(feedback.options.zone)
				return want !== '' && s().timeZone === want
			},
		},
		rundownCueIs: {
			type: 'boolean',
			name: 'Rundown: cue N is live',
			description: 'True while the given cue number is the live one',
			options: [{ type: 'number', id: 'cue', label: 'Cue number', default: 1, min: 1, max: 999 }],
			defaultStyle: { bgcolor: COLORS.on, color: WHITE },
			callback: (feedback) => s().rundownIndex === Number(feedback.options.cue),
		},
		rundownStandbyIs: {
			type: 'boolean',
			name: 'Rundown: cue N is on standby',
			description: 'True while the given cue number is the one GO will fire',
			options: [{ type: 'number', id: 'cue', label: 'Cue number', default: 1, min: 1, max: 999 }],
			defaultStyle: { bgcolor: COLORS.blue, color: WHITE },
			callback: (feedback) => s().rundownStandby === Number(feedback.options.cue),
		},
		rundownOver: {
			type: 'boolean',
			name: 'Rundown: live cue is over plan',
			description: 'True once the live cue has run longer than planned',
			options: [],
			defaultStyle: { bgcolor: COLORS.red, color: WHITE },
			callback: () => s().rundownIndex > 0 && s().rundownOver > 0,
		},
		blackout: {
			type: 'boolean',
			name: 'Display: blacked out',
			description: 'True while the display is blacked out',
			options: [],
			defaultStyle: { bgcolor: BLACK, color: combineRgb(255, 60, 60) },
			callback: () => s().blackout,
		},
	})
}
