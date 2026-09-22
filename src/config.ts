import type { SomeCompanionConfigField } from '@companion-module/base'

export type ModuleConfig = {
	host: string
	port: number
	useEvents: boolean
	pollInterval: number
}

export function GetConfigFields(): SomeCompanionConfigField[] {
	return [
		{
			type: 'static-text',
			id: 'info',
			width: 12,
			label: 'StageTime',
			value:
				'Point this at the machine running StageTime. The host and port are shown inside the app under App ▸ API Reference…',
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'Host',
			width: 8,
			default: '127.0.0.1',
		},
		{
			type: 'number',
			id: 'port',
			label: 'Port',
			width: 4,
			default: 8088,
			min: 1,
			max: 65535,
		},
		{
			type: 'checkbox',
			id: 'useEvents',
			label: 'Live updates',
			width: 6,
			default: true,
		},
		{
			type: 'static-text',
			id: 'useEventsInfo',
			width: 6,
			label: '',
			value:
				"Subscribes to the app's event stream so feedbacks and variables change the instant the timer does. Turn off to poll instead.",
		},
		{
			type: 'number',
			id: 'pollInterval',
			label: 'Poll interval (ms, when live updates are off)',
			width: 6,
			default: 500,
			min: 200,
			max: 5000,
		},
	]
}
