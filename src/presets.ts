import { combineRgb, type CompanionPresetDefinitions, type CompanionPresetSection } from '@companion-module/base'
import type StageTimeInstance from './main.js'
import type { ModuleSchema } from './main.js'
import { TIME_ZONES } from './api.js'

type Presets = CompanionPresetDefinitions<ModuleSchema>
type Preset = NonNullable<Presets[string]> & { type: 'simple' }
type Steps = Preset['steps']
type Feedbacks = Preset['feedbacks']
type Style = Preset['style']

const WHITE = combineRgb(255, 255, 255)
const BLACK = combineRgb(0, 0, 0)
const DARK = combineRgb(40, 40, 40)
const NAVY = combineRgb(40, 40, 60)
const GREEN = combineRgb(0, 100, 0)
const ON = combineRgb(0, 120, 0)
const V = (id: string) => `$(wakemedia-stagetime:${id})`

/** One press step: every action runs in order on button down */
const press = (...actions: Steps[number]['down']): Steps => [{ down: actions, up: [] }]
const NO_ACTION: Steps = [{ down: [], up: [] }]
const optionOn = (option: string, bgcolor = ON): Feedbacks[number] => ({
	feedbackId: 'optionOn',
	style: { bgcolor },
	options: { option },
})
const modeIs = (mode: 'countdown' | 'stopwatch' | 'clock'): Feedbacks[number] => ({
	feedbackId: 'modeIs',
	style: { bgcolor: ON },
	options: { mode },
})

function button(
	name: string,
	text: string,
	bgcolor: number,
	steps: Steps,
	feedbacks: Feedbacks = [],
	size: Style['size'] = 14,
	color = WHITE,
): Preset {
	return { type: 'simple', name, style: { text, size, color, bgcolor }, steps, feedbacks }
}

export function UpdatePresets(self: StageTimeInstance): void {
	const presets: Presets = {}
	const structure: CompanionPresetSection<ModuleSchema>[] = []
	/** Add a preset to a section, creating the section on first use */
	const add = (section: string, id: string, preset: Preset): void => {
		presets[id] = preset
		let sec = structure.find((s) => s.name === section)
		if (!sec) {
			sec = { id: section.toLowerCase().replace(/[^a-z0-9]+/g, '-'), name: section, definitions: [] }
			structure.push(sec)
		}
		;(sec.definitions as string[]).push(id)
	}

	// ───────── Timer ─────────
	// One start/stop button (the label follows the state), one clear, one display-only readout.
	add(
		'Timer',
		'timer_toggle',
		button(
			'Start / Stop',
			'START',
			GREEN,
			press({ actionId: 'toggle', options: {} }),
			[{ feedbackId: 'timerRunning', style: { bgcolor: combineRgb(150, 0, 0), text: 'STOP' }, options: {} }],
			18,
		),
	)
	add(
		'Timer',
		'timer_clear',
		button('Clear', 'CLEAR', combineRgb(30, 30, 80), press({ actionId: 'clear', options: {} }), [], 18),
	)
	add(
		'Timer',
		'timer_live',
		button(
			'Live timer readout (display only)',
			V('formattedTimeSigned'),
			BLACK,
			NO_ACTION,
			[{ feedbackId: 'lightColor', options: {} }],
			18,
		),
	)
	add(
		'Timer',
		'timer_end_at',
		button(
			'Count down to a clock time (edit the time)',
			'END AT\\n14:30',
			combineRgb(60, 40, 80),
			press({ actionId: 'endAt', options: { time: '14:30' } }),
			[{ feedbackId: 'timerRunning', style: { bgcolor: GREEN }, options: {} }],
		),
	)

	// ───────── Adjust Time ─────────
	const adjustments: Array<[string, 'minutes' | 'seconds', number]> = [
		['+1 SEC', 'seconds', 1],
		['+30 SEC', 'seconds', 30],
		['+1 MIN', 'minutes', 1],
		['+5 MIN', 'minutes', 5],
		['+10 MIN', 'minutes', 10],
		['-1 SEC', 'seconds', -1],
		['-30 SEC', 'seconds', -30],
		['-1 MIN', 'minutes', -1],
		['-5 MIN', 'minutes', -5],
		['-10 MIN', 'minutes', -10],
	]
	for (const [label, unit, amount] of adjustments) {
		add(
			'Adjust Time',
			`adjust_${unit}_${String(amount).replace('-', 'minus')}`,
			button(label, label, DARK, press({ actionId: 'addTime', options: { amount, unit } })),
		)
	}

	// ───────── Quick Set ─────────
	for (const min of [5, 10, 15, 20, 30, 45, 60]) {
		add(
			'Quick Set',
			`set_${min}`,
			button(
				`Set ${min} min`,
				`${min}:00`,
				NAVY,
				press({ actionId: 'setTime', options: { minutes: min, seconds: 0 } }),
				[],
				18,
			),
		)
	}

	// ───────── Presets ─────────
	for (let i = 1; i <= 5; i++) {
		add(
			'Presets',
			`preset_${i}`,
			button(
				`Load preset ${i}`,
				`${V(`preset_${i}_name`)}\\n${V(`preset_${i}_time`)}`,
				combineRgb(30, 30, 50),
				press({ actionId: 'loadPreset', options: { slot: String(i) } }),
				[{ feedbackId: 'presetSet', style: { bgcolor: combineRgb(50, 50, 110) }, options: { slot: String(i) } }],
			),
		)
	}

	// ───────── Messages ─────────
	for (let i = 1; i <= 6; i++) {
		add(
			'Messages',
			`quick_${i}`,
			button(
				`Quick message ${i}`,
				V(`quick_${i}_text`),
				combineRgb(60, 30, 0),
				press({ actionId: 'quickMessage', options: { slot: String(i) } }),
				[
					{ feedbackId: 'quickMessageSet', style: { bgcolor: combineRgb(120, 60, 0) }, options: { slot: String(i) } },
					{ feedbackId: 'messageVisible', style: { bgcolor: combineRgb(180, 90, 0) }, options: {} },
				],
			),
		)
	}
	add(
		'Messages',
		'msg_custom',
		button(
			'Show / hide a custom message (edit the text)',
			'SHOW\\nMSG',
			combineRgb(50, 30, 80),
			press({ actionId: 'toggleMessage', options: { text: 'MESSAGE', layout: 'pref' } }),
			[{ feedbackId: 'messageVisible', style: { bgcolor: combineRgb(120, 0, 120), text: 'HIDE\\nMSG' }, options: {} }],
		),
	)
	add(
		'Messages',
		'msg_hide',
		button('Hide message', 'HIDE\\nMSG', combineRgb(50, 50, 50), press({ actionId: 'hideMessage', options: {} }), [
			{ feedbackId: 'messageVisible', style: { bgcolor: combineRgb(120, 0, 120) }, options: {} },
		]),
	)
	add(
		'Messages',
		'msg_keep_timer',
		button(
			'Keep timer visible (toggle)',
			'MSG +\\nTIMER',
			DARK,
			press({ actionId: 'setOption', options: { option: 'messageWithTimer', state: 'toggle' } }),
			[optionOn('messageWithTimer')],
		),
	)
	add(
		'Messages',
		'msg_auto',
		button(
			'Auto-message at zero (toggle)',
			'AUTO\\nMSG',
			DARK,
			press({ actionId: 'setOption', options: { option: 'autoMessage', state: 'toggle' } }),
			[optionOn('autoMessage')],
		),
	)

	// ───────── Stopwatch ─────────
	add(
		'Stopwatch',
		'sw_mode',
		button('Stopwatch mode', 'STOP\\nWATCH', NAVY, press({ actionId: 'mode', options: { mode: 'stopwatch' } }), [
			modeIs('stopwatch'),
		]),
	)
	add(
		'Stopwatch',
		'sw_start',
		button(
			'Start stopwatch from zero (switches mode)',
			'START\\nSTOPWATCH',
			GREEN,
			press({ actionId: 'mode', options: { mode: 'stopwatch' } }, { actionId: 'start', options: {} }),
			[{ feedbackId: 'timerRunning', style: { bgcolor: combineRgb(0, 180, 0) }, options: {} }],
		),
	)
	add(
		'Stopwatch',
		'sw_live',
		button(
			'Live stopwatch readout (display only)',
			V('formattedTime'),
			BLACK,
			NO_ACTION,
			[{ feedbackId: 'timerRunning', style: { color: combineRgb(0, 255, 0) }, options: {} }],
			18,
		),
	)
	add(
		'Stopwatch',
		'sw_reset',
		button('Reset stopwatch', 'RESET', combineRgb(30, 30, 80), press({ actionId: 'clear', options: {} }), [], 18),
	)
	add(
		'Stopwatch',
		'sw_ms',
		button('Milliseconds (toggle)', 'MS', NAVY, press({ actionId: 'milliseconds', options: { state: 'toggle' } }), [
			optionOn('milliseconds'),
		]),
	)

	// ───────── Clock ─────────
	add(
		'Clock',
		'clock_mode',
		button(
			'Clock mode (time of day)',
			'CLOCK',
			NAVY,
			press({ actionId: 'mode', options: { mode: 'clock' } }),
			[modeIs('clock')],
			18,
		),
	)
	add(
		'Clock',
		'clock_format',
		button(
			'Clock 12h / 24h (toggle)',
			V('clockFormat'),
			NAVY,
			press({ actionId: 'clockFormat', options: { format: 'toggle' } }),
			[],
			18,
		),
	)
	add(
		'Clock',
		'clock_corner',
		button(
			'Corner clock on the timer (toggle)',
			'CORNER\\nCLOCK',
			DARK,
			press({ actionId: 'setOption', options: { option: 'cornerClock', state: 'toggle' } }),
			[optionOn('cornerClock')],
		),
	)
	const zoneButtons: Array<[string, string]> = [
		['system', 'SYSTEM\\nZONE'],
		['America/New_York', 'EASTERN'],
		['America/Chicago', 'CENTRAL'],
		['America/Denver', 'MOUNTAIN'],
		['America/Los_Angeles', 'PACIFIC'],
		['UTC', 'UTC'],
		['Europe/London', 'LONDON'],
	]
	for (const [zone, text] of zoneButtons) {
		const label = TIME_ZONES.find((z) => z.id === zone)?.label ?? zone
		add(
			'Clock',
			`zone_${zone.replace(/[^a-z]/gi, '_')}`,
			button(`Time zone: ${label}`, text, DARK, press({ actionId: 'setTimeZone', options: { zone, custom: '' } }), [
				{ feedbackId: 'timeZoneIs', style: { bgcolor: ON }, options: { zone, custom: '' } },
			]),
		)
	}

	add(
		'Clock',
		'clock_ends_at',
		button(
			'Ends-at time on the display (toggle)',
			'ENDS\\nAT',
			DARK,
			press({ actionId: 'setOption', options: { option: 'endsAt', state: 'toggle' } }),
			[optionOn('endsAt')],
		),
	)

	// ───────── Countdown ─────────
	add(
		'Countdown',
		'cd_mode',
		button('Countdown mode', 'COUNT\\nDOWN', NAVY, press({ actionId: 'mode', options: { mode: 'countdown' } }), [
			modeIs('countdown'),
		]),
	)
	const wraps: Array<[string, number, number]> = [
		['WRAP\\n1:00', 1, 0],
		['WRAP\\n2:00', 2, 0],
		['WRAP\\n5:00', 5, 0],
		['WRAP\\nOFF', 0, 0],
	]
	for (const [label, m, s] of wraps) {
		add(
			'Countdown',
			`wrap_${m}_${s}`,
			button(
				`Wrap-up warning ${m}:${String(s).padStart(2, '0')}`,
				label,
				combineRgb(90, 80, 0),
				press({ actionId: 'setWrapUp', options: { minutes: m, seconds: s } }),
			),
		)
	}
	const optionButtons: Array<[string, string, string]> = [
		['flash', 'Flash light at zero (toggle)', 'FLASH\\nLIGHT'],
		['flashBorder', 'Flash border at zero (toggle)', 'FLASH\\nBORDER'],
		['stopAtZero', 'Stop at zero (toggle)', 'STOP\\nAT 0'],
		['sound', 'Buzzer at zero (toggle)', 'BUZZER'],
		['progress', 'Progress bar (toggle)', 'PROG\\nBAR'],
	]
	for (const [option, name, text] of optionButtons) {
		add(
			'Countdown',
			`cd_${option}`,
			button(name, text, DARK, press({ actionId: 'setOption', options: { option, state: 'toggle' } }), [
				optionOn(option),
			]),
		)
	}
	add(
		'Countdown',
		'cd_sound_test',
		button('Test buzzer', 'TEST\\nBUZZER', combineRgb(80, 60, 0), press({ actionId: 'soundTest', options: {} })),
	)

	// ───────── Rundown ─────────
	add(
		'Rundown',
		'rd_next',
		button('GO (fire the standby cue)', 'GO', GREEN, press({ actionId: 'rundownNext', options: {} }), [], 18),
	)
	add('Rundown', 'rd_prev', button('Previous cue', 'PREV\\nCUE', DARK, press({ actionId: 'rundownPrev', options: {} })))
	add(
		'Rundown',
		'rd_live',
		button('Live cue readout (display only)', `${V('rundownCue')}\\n${V('formattedTimeSigned')}`, BLACK, NO_ACTION, [
			{ feedbackId: 'lightColor', options: {} },
		]),
	)
	add(
		'Rundown',
		'rd_next_name',
		button('Standby cue name (display only)', `STANDBY:\\n${V('rundownNext')}`, combineRgb(30, 30, 50), NO_ACTION, []),
	)
	add(
		'Rundown',
		'rd_over',
		button(
			'Live cue over/under (display only)',
			`${V('rundownOverFormatted')}`,
			BLACK,
			NO_ACTION,
			[{ feedbackId: 'rundownOver', style: { bgcolor: combineRgb(200, 0, 0) }, options: {} }],
			18,
		),
	)
	add(
		'Rundown',
		'rd_auto',
		button(
			'Auto-advance at zero (toggle)',
			'AUTO\\nADVANCE',
			DARK,
			press({ actionId: 'rundownAutoAdvance', options: { state: 'toggle' } }),
			[{ feedbackId: 'optionOn', style: { bgcolor: ON }, options: { option: 'rundownAutoAdvance' } }],
		),
	)
	for (let i = 1; i <= 4; i++) {
		add(
			'Rundown',
			`rd_go_${i}`,
			button(`Go to cue ${i}`, `CUE\\n${i}`, NAVY, press({ actionId: 'rundownGo', options: { cue: i, start: 'go' } }), [
				{ feedbackId: 'rundownStandbyIs', style: { bgcolor: combineRgb(0, 60, 200) }, options: { cue: i } },
				{ feedbackId: 'rundownCueIs', style: { bgcolor: ON }, options: { cue: i } },
			]),
		)
	}

	// ───────── Display ─────────
	add(
		'Display',
		'display_blackout',
		button(
			'Blackout (toggle)',
			'BLACK\\nOUT',
			combineRgb(60, 0, 0),
			press({ actionId: 'blackout', options: { state: 'toggle' } }),
			[
				{
					feedbackId: 'blackout',
					style: { bgcolor: BLACK, color: combineRgb(255, 60, 60), text: 'BLACKED\\nOUT' },
					options: {},
				},
			],
		),
	)
	add(
		'Display',
		'display_blue',
		button(
			'Blue keying background (toggle)',
			'BLUE\\nBG',
			DARK,
			press({ actionId: 'background', options: { color: 'toggle' } }),
			[optionOn('bgBlue', combineRgb(0, 60, 200))],
		),
	)

	self.setPresetDefinitions(structure, presets)
}
