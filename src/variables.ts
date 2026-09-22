import type StageTimeInstance from './main.js'
import type { StageTimeStatus } from './api.js'

type Bool = 'true' | 'false'

export type VariablesSchema = {
	formattedTime: string
	formattedTimeSigned: string
	remainingSeconds: number
	timerMinutes: number
	timerSeconds: number
	overtime: Bool
	progress: number
	progressPercent: number
	running: Bool
	mode: 'countdown' | 'stopwatch' | 'clock'
	localMode: Bool
	countUpMode: Bool
	lightColor: string
	lightColorHex: string
	wrapUpSeconds: number
	wrapUpFormatted: string
	messageVisible: Bool
	messageWithTimer: Bool
	messageShownWithTimer: Bool
	autoMessageAtZero: Bool
	autoMessageText: string
	flashOn: Bool
	flashBorder: Bool
	stopAtZero: Bool
	soundOn: Bool
	showProgress: Bool
	showMilliseconds: Bool
	bgBlue: Bool
	blackout: Bool
	cornerClock: Bool
	timeZone: string
	hour12: Bool
	clockFormat: '12h' | '24h'
	version: string
	presetCount: number
	quickCount: number
	preset_1_name: string
	preset_1_time: string
	preset_2_name: string
	preset_2_time: string
	preset_3_name: string
	preset_3_time: string
	preset_4_name: string
	preset_4_time: string
	preset_5_name: string
	preset_5_time: string
	quick_1_text: string
	quick_2_text: string
	quick_3_text: string
	quick_4_text: string
	quick_5_text: string
	quick_6_text: string
}

export function UpdateVariableDefinitions(self: StageTimeInstance): void {
	self.setVariableDefinitions({
		// Time
		formattedTime: { name: 'Timer (MM:SS, absolute value)' },
		formattedTimeSigned: { name: 'Timer (MM:SS, with - in overtime)' },
		remainingSeconds: { name: 'Remaining seconds (negative in overtime; elapsed on the stopwatch)' },
		timerMinutes: { name: 'Timer minutes part' },
		timerSeconds: { name: 'Timer seconds part' },
		overtime: { name: 'Overtime (true/false)' },
		progress: { name: 'Countdown remaining, 0–1' },
		progressPercent: { name: 'Countdown remaining, 0–100' },
		// State
		running: { name: 'Timer running (true/false)' },
		mode: { name: 'Mode (countdown / stopwatch / clock)' },
		localMode: { name: 'Clock mode (true/false)' },
		countUpMode: { name: 'Stopwatch mode (true/false)' },
		lightColor: { name: 'Light color (green/yellow/red/gray)' },
		lightColorHex: { name: 'Light color hex (#00ff00)' },
		wrapUpSeconds: { name: 'Wrap-up threshold in seconds' },
		wrapUpFormatted: { name: 'Wrap-up threshold (MM:SS)' },
		// Messages
		messageVisible: { name: 'Message visible (true/false)' },
		messageWithTimer: { name: 'Keep timer visible preference (true/false)' },
		messageShownWithTimer: { name: 'Current message is beside the timer (true/false)' },
		autoMessageAtZero: { name: 'Auto-message at zero (true/false)' },
		autoMessageText: { name: 'Auto-message text' },
		// Options
		flashOn: { name: 'Flash light at zero (true/false)' },
		flashBorder: { name: 'Flash border at zero (true/false)' },
		stopAtZero: { name: 'Stop at zero (true/false)' },
		soundOn: { name: 'Buzzer at zero (true/false)' },
		showProgress: { name: 'Progress bar (true/false)' },
		showMilliseconds: { name: 'Stopwatch milliseconds (true/false)' },
		bgBlue: { name: 'Blue background (true/false)' },
		blackout: { name: 'Blackout (true/false)' },
		cornerClock: { name: 'Corner clock (true/false)' },
		timeZone: { name: 'Clock time zone' },
		hour12: { name: '12-hour clock (true/false)' },
		clockFormat: { name: 'Clock format (12h / 24h)' },
		version: { name: 'StageTime version' },
		// Slots
		presetCount: { name: 'Preset count' },
		quickCount: { name: 'Quick message count' },
		preset_1_name: { name: 'Preset 1 name' },
		preset_1_time: { name: 'Preset 1 time' },
		preset_2_name: { name: 'Preset 2 name' },
		preset_2_time: { name: 'Preset 2 time' },
		preset_3_name: { name: 'Preset 3 name' },
		preset_3_time: { name: 'Preset 3 time' },
		preset_4_name: { name: 'Preset 4 name' },
		preset_4_time: { name: 'Preset 4 time' },
		preset_5_name: { name: 'Preset 5 name' },
		preset_5_time: { name: 'Preset 5 time' },
		quick_1_text: { name: 'Quick message 1' },
		quick_2_text: { name: 'Quick message 2' },
		quick_3_text: { name: 'Quick message 3' },
		quick_4_text: { name: 'Quick message 4' },
		quick_5_text: { name: 'Quick message 5' },
		quick_6_text: { name: 'Quick message 6' },
	})
}

const bool = (v: boolean): Bool => (v ? 'true' : 'false')
const pad = (n: number): string => (n < 10 ? '0' : '') + n

export function getVariableValues(s: StageTimeStatus): VariablesSchema {
	const abs = Math.abs(s.remainingSeconds)
	return {
		formattedTime: s.formattedTime,
		formattedTimeSigned: s.formattedTimeSigned,
		remainingSeconds: s.remainingSeconds,
		timerMinutes: Math.floor(abs / 60),
		timerSeconds: abs % 60,
		overtime: bool(s.overtime),
		progress: Math.round(s.progress * 1000) / 1000,
		progressPercent: Math.round(s.progress * 100),
		running: bool(s.running),
		mode: s.localMode ? 'clock' : s.countUpMode ? 'stopwatch' : 'countdown',
		localMode: bool(s.localMode),
		countUpMode: bool(s.countUpMode),
		lightColor: s.lightColor,
		lightColorHex: s.lightColorHex,
		wrapUpSeconds: s.wrapUpSeconds,
		wrapUpFormatted: `${pad(Math.floor(s.wrapUpSeconds / 60))}:${pad(s.wrapUpSeconds % 60)}`,
		messageVisible: bool(s.messageVisible),
		messageWithTimer: bool(s.messageWithTimer),
		messageShownWithTimer: bool(s.messageShownWithTimer),
		autoMessageAtZero: bool(s.autoMessageAtZero),
		autoMessageText: s.autoMessageText,
		flashOn: bool(s.flashOn),
		flashBorder: bool(s.flashBorder),
		stopAtZero: bool(s.stopAtZero),
		soundOn: bool(s.soundOn),
		showProgress: bool(s.showProgress),
		showMilliseconds: bool(s.showMilliseconds),
		bgBlue: bool(s.bgBlue),
		blackout: bool(s.blackout),
		cornerClock: bool(s.cornerClock),
		timeZone: s.timeZone,
		hour12: bool(s.hour12),
		clockFormat: s.hour12 ? '12h' : '24h',
		version: s.version ?? '',
		presetCount: s.presetCount,
		quickCount: s.quickCount,
		preset_1_name: s.preset_1_name,
		preset_1_time: s.preset_1_time,
		preset_2_name: s.preset_2_name,
		preset_2_time: s.preset_2_time,
		preset_3_name: s.preset_3_name,
		preset_3_time: s.preset_3_time,
		preset_4_name: s.preset_4_name,
		preset_4_time: s.preset_4_time,
		preset_5_name: s.preset_5_name,
		preset_5_time: s.preset_5_time,
		quick_1_text: s.quick_1_text,
		quick_2_text: s.quick_2_text,
		quick_3_text: s.quick_3_text,
		quick_4_text: s.quick_4_text,
		quick_5_text: s.quick_5_text,
		quick_6_text: s.quick_6_text,
	}
}
