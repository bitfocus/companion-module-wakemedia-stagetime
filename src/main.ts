import { InstanceBase, InstanceStatus, type SomeCompanionConfigField } from '@companion-module/base'
import { GetConfigFields, type ModuleConfig } from './config.js'
import { UpdateVariableDefinitions, getVariableValues, type VariablesSchema } from './variables.js'
import { UpgradeScripts } from './upgrades.js'
import { UpdateActions, type ActionsSchema } from './actions.js'
import { UpdateFeedbacks, type FeedbacksSchema } from './feedbacks.js'
import { UpdatePresets } from './presets.js'
import {
	type StageTimeStatus,
	type ApiResponse,
	getDefaultStatus,
	fetchStatus,
	sendCommand,
	StageTimeEvents,
} from './api.js'

export type ModuleSchema = {
	config: ModuleConfig
	secrets: undefined
	actions: ActionsSchema
	feedbacks: FeedbacksSchema
	variables: VariablesSchema
}

export { UpgradeScripts }

export default class StageTimeInstance extends InstanceBase<ModuleSchema> {
	config!: ModuleConfig // Setup in init()
	/** Latest status reported by the app */
	state: StageTimeStatus = getDefaultStatus()
	#pollTimer: ReturnType<typeof setInterval> | null = null
	#events: StageTimeEvents | null = null

	constructor(internal: unknown) {
		super(internal)
	}

	async init(config: ModuleConfig): Promise<void> {
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)

		this.updateActions()
		this.updateFeedbacks()
		this.updatePresets()
		this.updateVariableDefinitions()
		this.setVariableValues(getVariableValues(this.state))

		this.connect()
	}

	// When module gets deleted
	async destroy(): Promise<void> {
		this.disconnect()
	}

	async configUpdated(config: ModuleConfig): Promise<void> {
		this.config = config
		this.disconnect()
		this.updateStatus(InstanceStatus.Connecting)
		this.connect()
	}

	// Return config fields for web config
	getConfigFields(): SomeCompanionConfigField[] {
		return GetConfigFields()
	}

	updateActions(): void {
		UpdateActions(this)
	}

	updateFeedbacks(): void {
		UpdateFeedbacks(this)
	}

	updatePresets(): void {
		UpdatePresets(this)
	}

	updateVariableDefinitions(): void {
		UpdateVariableDefinitions(this)
	}

	// --- API helper (called by actions) ---
	/** GET a path. Logs and swallows failures so a bad button never breaks the module. */
	async sendApi(path: string): Promise<ApiResponse | null> {
		try {
			const res = await sendCommand(this.config.host, this.config.port, path)
			if (!res.ok) this.log('warn', `StageTime rejected ${path}: ${res.error ?? 'unknown error'}`)
			return res
		} catch (err) {
			this.log('error', `API call failed: ${path} — ${String(err)}`)
			return null
		}
	}

	/** Apply a fresh status: variables + feedbacks. Called by the event stream or a poll. */
	applyState(state: StageTimeStatus): void {
		this.state = state
		this.updateStatus(InstanceStatus.Ok)
		this.setVariableValues(getVariableValues(state))
		this.checkAllFeedbacks()
	}

	// --- Connection ---
	connect(): void {
		const { host, port } = this.config
		if (this.config.useEvents !== false) {
			this.#events = new StageTimeEvents(
				host,
				port,
				(state) => this.applyState(state),
				() => this.log('debug', 'Event stream connected'),
				(err) => this.updateStatus(InstanceStatus.ConnectionFailure, err.message),
			)
			this.#events.connect()
		} else {
			this.#startPolling()
		}
	}

	disconnect(): void {
		this.#stopPolling()
		if (this.#events) {
			this.#events.close()
			this.#events = null
		}
	}

	#startPolling(): void {
		this.#stopPolling()
		void this.#poll()
		this.#pollTimer = setInterval(() => void this.#poll(), Math.max(200, this.config.pollInterval || 500))
	}

	#stopPolling(): void {
		if (this.#pollTimer) {
			clearInterval(this.#pollTimer)
			this.#pollTimer = null
		}
	}

	async #poll(): Promise<void> {
		try {
			this.applyState(await fetchStatus(this.config.host, this.config.port))
		} catch (err) {
			this.updateStatus(InstanceStatus.ConnectionFailure, String(err))
		}
	}
}
