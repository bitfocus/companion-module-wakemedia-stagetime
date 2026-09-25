import http from 'http'

/** Everything /api/status (and each /api/events message) reports. Mirrors displayState in StageTime's main.js. */
export interface StageTimeStatus {
	ok: boolean
	version?: string
	remainingSeconds: number
	running: boolean
	localMode: boolean
	countUpMode: boolean
	showMilliseconds: boolean
	overtime: boolean
	progress: number
	formattedTime: string
	formattedTimeSigned: string
	lightColor: string
	lightColorHex: string
	wrapUpSeconds: number
	flashOn: boolean
	flashBorder: boolean
	stopAtZero: boolean
	soundOn: boolean
	showProgress: boolean
	bgBlue: boolean
	blackout: boolean
	cornerClock: boolean
	messageVisible: boolean
	messageWithTimer: boolean
	messageShownWithTimer: boolean
	autoMessageAtZero: boolean
	autoMessageText: string
	timeZone: string
	hour12: boolean
	presetCount: number
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
	quickCount: number
	quick_1_text: string
	quick_2_text: string
	quick_3_text: string
	quick_4_text: string
	quick_5_text: string
	quick_6_text: string
	showEndsAt: boolean
	endsAt: string
	buzzerSound: string
	buzzerVolume: number
	apiKeySet: boolean
	mirrors: number
	rundownCount: number
	rundownIndex: number
	rundownCue: string
	rundownStandby: number
	rundownNext: string
	rundownAutoAdvance: boolean
	rundownActual: number
	rundownOver: number
	webRemoteEnabled: boolean
	webRemoteSessions: number
}

export function getDefaultStatus(): StageTimeStatus {
	return {
		ok: false,
		remainingSeconds: 0,
		running: false,
		localMode: false,
		countUpMode: false,
		showMilliseconds: false,
		overtime: false,
		progress: 0,
		formattedTime: '00:00',
		formattedTimeSigned: '00:00',
		lightColor: 'gray',
		lightColorHex: '#666666',
		wrapUpSeconds: 0,
		flashOn: false,
		flashBorder: false,
		stopAtZero: false,
		soundOn: false,
		showProgress: false,
		bgBlue: false,
		blackout: false,
		cornerClock: false,
		messageVisible: false,
		messageWithTimer: false,
		messageShownWithTimer: false,
		autoMessageAtZero: false,
		autoMessageText: "TIME'S UP",
		timeZone: 'system',
		hour12: true,
		presetCount: 0,
		preset_1_name: '',
		preset_1_time: '',
		preset_2_name: '',
		preset_2_time: '',
		preset_3_name: '',
		preset_3_time: '',
		preset_4_name: '',
		preset_4_time: '',
		preset_5_name: '',
		preset_5_time: '',
		quickCount: 0,
		quick_1_text: '',
		quick_2_text: '',
		quick_3_text: '',
		quick_4_text: '',
		quick_5_text: '',
		quick_6_text: '',
		showEndsAt: false,
		endsAt: '',
		buzzerSound: 'default',
		buzzerVolume: 100,
		apiKeySet: false,
		mirrors: 0,
		rundownCount: 0,
		rundownIndex: 0,
		rundownCue: '',
		rundownStandby: 0,
		rundownNext: '',
		rundownAutoAdvance: false,
		rundownActual: 0,
		rundownOver: 0,
		webRemoteEnabled: false,
		webRemoteSessions: 0,
	}
}

/** Fill in any field an older StageTime doesn't report, so feedbacks never see undefined. */
export function normalizeStatus(raw: Partial<StageTimeStatus>): StageTimeStatus {
	const s = { ...getDefaultStatus(), ...raw }
	if (!s.formattedTimeSigned) s.formattedTimeSigned = (s.remainingSeconds < 0 ? '-' : '') + s.formattedTime
	return s
}

export interface ApiResponse {
	ok: boolean
	error?: string
	[key: string]: unknown
}

/** GET a StageTime API path. Resolves with the JSON body; a non-JSON body or network error rejects. */
export async function sendCommand(host: string, port: number, path: string, apiKey?: string): Promise<ApiResponse> {
	return new Promise((resolve, reject) => {
		// StageTime 1.2+ can require a key for commands; it rides along as a header
		const headers: Record<string, string> = {}
		if (apiKey) headers['X-API-Key'] = apiKey
		const req = http.get({ hostname: host, port, path, timeout: 3000, headers }, (res) => {
			let data = ''
			res.on('data', (chunk) => (data += chunk))
			res.on('end', () => {
				try {
					resolve(JSON.parse(data) as ApiResponse)
				} catch {
					reject(new Error(`Invalid JSON response from ${path}`))
				}
			})
		})
		req.on('error', reject)
		req.on('timeout', () => {
			req.destroy()
			reject(new Error('Request timed out'))
		})
	})
}

export async function fetchStatus(host: string, port: number): Promise<StageTimeStatus> {
	const data = await sendCommand(host, port, '/api/status')
	if (!data.ok) throw new Error(data.error || 'Status request failed')
	return normalizeStatus(data)
}

/**
 * Minimal Server-Sent Events client for /api/events (Node 18 has no EventSource).
 * StageTime writes one `data: {status json}` message per state change and a `: ping`
 * comment every 15 s. Reconnects with backoff until close() is called.
 */
export class StageTimeEvents {
	private req: http.ClientRequest | null = null
	private closed = false
	private retryMs = 1000
	private retryTimer: ReturnType<typeof setTimeout> | null = null
	private staleTimer: ReturnType<typeof setTimeout> | null = null

	constructor(
		private readonly host: string,
		private readonly port: number,
		private readonly onState: (state: StageTimeStatus) => void,
		private readonly onOpen: () => void,
		private readonly onError: (err: Error) => void,
	) {}

	connect(): void {
		if (this.closed) return
		this.cleanupRequest()
		let buffer = ''
		const req = http.get(
			{ hostname: this.host, port: this.port, path: '/api/events', headers: { Accept: 'text/event-stream' } },
			(res) => {
				if (res.statusCode !== 200) {
					this.fail(new Error(`Event stream returned HTTP ${res.statusCode}`))
					res.resume()
					return
				}
				this.retryMs = 1000
				this.onOpen()
				res.setEncoding('utf8')
				res.on('data', (chunk: string) => {
					this.touch()
					buffer += chunk
					let idx: number
					while ((idx = buffer.indexOf('\n\n')) !== -1) {
						const message = buffer.slice(0, idx)
						buffer = buffer.slice(idx + 2)
						this.handleMessage(message)
					}
				})
				res.on('end', () => this.fail(new Error('Event stream ended')))
				res.on('error', (err) => this.fail(err))
				this.touch()
			},
		)
		req.on('error', (err) => this.fail(err))
		this.req = req
	}

	close(): void {
		this.closed = true
		if (this.retryTimer) clearTimeout(this.retryTimer)
		if (this.staleTimer) clearTimeout(this.staleTimer)
		this.retryTimer = null
		this.staleTimer = null
		this.cleanupRequest()
	}

	private handleMessage(message: string): void {
		const data = message
			.split('\n')
			.filter((line) => line.startsWith('data:'))
			.map((line) => line.slice(5).trim())
			.join('\n')
		if (!data) return // comment / ping
		try {
			this.onState(normalizeStatus(JSON.parse(data) as Partial<StageTimeStatus>))
		} catch (err) {
			this.onError(new Error(`Bad event payload: ${String(err)}`))
		}
	}

	/** The app pings every 15 s; if nothing arrives for 45 s the socket is dead. */
	private touch(): void {
		if (this.staleTimer) clearTimeout(this.staleTimer)
		this.staleTimer = setTimeout(() => this.fail(new Error('Event stream went quiet')), 45000)
	}

	private fail(err: Error): void {
		if (this.closed) return
		this.cleanupRequest()
		this.onError(err)
		if (this.retryTimer) clearTimeout(this.retryTimer)
		this.retryTimer = setTimeout(() => this.connect(), this.retryMs)
		this.retryMs = Math.min(this.retryMs * 2, 10000)
	}

	private cleanupRequest(): void {
		if (this.staleTimer) clearTimeout(this.staleTimer)
		this.staleTimer = null
		if (this.req) {
			this.req.removeAllListeners()
			this.req.on('error', () => {})
			this.req.destroy()
			this.req = null
		}
	}
}

/** Options that are a plain on/off pair in the API, keyed by the status field that reports them. */
export interface ToggleOption {
	id: string
	label: string
	statusKey: keyof StageTimeStatus
	onPath: string
	offPath: string
}

export const TOGGLE_OPTIONS: ToggleOption[] = [
	{
		id: 'flash',
		label: 'Flash light at zero',
		statusKey: 'flashOn',
		onPath: '/api/flash/on',
		offPath: '/api/flash/off',
	},
	{
		id: 'flashBorder',
		label: 'Flash border at zero',
		statusKey: 'flashBorder',
		onPath: '/api/flashborder/on',
		offPath: '/api/flashborder/off',
	},
	{
		id: 'stopAtZero',
		label: 'Stop at zero',
		statusKey: 'stopAtZero',
		onPath: '/api/stopatzero/on',
		offPath: '/api/stopatzero/off',
	},
	{ id: 'sound', label: 'Buzzer at zero', statusKey: 'soundOn', onPath: '/api/sound/on', offPath: '/api/sound/off' },
	{
		id: 'autoMessage',
		label: 'Auto-message at zero',
		statusKey: 'autoMessageAtZero',
		onPath: '/api/automessage/on',
		offPath: '/api/automessage/off',
	},
	{
		id: 'progress',
		label: 'Progress bar',
		statusKey: 'showProgress',
		onPath: '/api/progress/on',
		offPath: '/api/progress/off',
	},
	{
		id: 'messageWithTimer',
		label: 'Keep timer visible with message',
		statusKey: 'messageWithTimer',
		onPath: '/api/messagewithtimer/on',
		offPath: '/api/messagewithtimer/off',
	},
	{
		id: 'cornerClock',
		label: 'Corner clock',
		statusKey: 'cornerClock',
		onPath: '/api/cornerclock/on',
		offPath: '/api/cornerclock/off',
	},
	{
		id: 'blackout',
		label: 'Blackout',
		statusKey: 'blackout',
		onPath: '/api/blackout/on',
		offPath: '/api/blackout/off',
	},
	{
		id: 'bgBlue',
		label: 'Blue (keying) background',
		statusKey: 'bgBlue',
		onPath: '/api/background/blue',
		offPath: '/api/background/black',
	},
	{
		id: 'milliseconds',
		label: 'Stopwatch milliseconds',
		statusKey: 'showMilliseconds',
		onPath: '/api/milliseconds/on',
		offPath: '/api/milliseconds/off',
	},
	{ id: 'hour12', label: '12-hour clock', statusKey: 'hour12', onPath: '/api/clock/12h', offPath: '/api/clock/24h' },
	{
		id: 'endsAt',
		label: 'Ends-at time on the display',
		statusKey: 'showEndsAt',
		onPath: '/api/endsat/on',
		offPath: '/api/endsat/off',
	},
	{
		id: 'rundownAutoAdvance',
		label: 'Rundown auto-advance at zero',
		statusKey: 'rundownAutoAdvance',
		onPath: '/api/rundown/autoadvance/on',
		offPath: '/api/rundown/autoadvance/off',
	},
]

export const TIME_ZONES: Array<{ id: string; label: string }> = [
	{ id: 'system', label: 'System Default' },
	{ id: 'America/New_York', label: 'Eastern (New York)' },
	{ id: 'America/Chicago', label: 'Central (Chicago)' },
	{ id: 'America/Denver', label: 'Mountain (Denver)' },
	{ id: 'America/Phoenix', label: 'Arizona (Phoenix)' },
	{ id: 'America/Los_Angeles', label: 'Pacific (Los Angeles)' },
	{ id: 'America/Anchorage', label: 'Alaska (Anchorage)' },
	{ id: 'Pacific/Honolulu', label: 'Hawaii (Honolulu)' },
	{ id: 'UTC', label: 'UTC' },
	{ id: 'Europe/London', label: 'London' },
	{ id: 'Europe/Paris', label: 'Paris / Berlin' },
	{ id: 'Asia/Dubai', label: 'Dubai' },
	{ id: 'Asia/Singapore', label: 'Singapore' },
	{ id: 'Asia/Tokyo', label: 'Tokyo' },
	{ id: 'Australia/Sydney', label: 'Sydney' },
	{ id: 'custom', label: 'Custom (enter below)' },
]
