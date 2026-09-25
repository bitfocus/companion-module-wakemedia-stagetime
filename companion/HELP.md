# Wake Media StageTime

Controls the **StageTime** countdown timer app (macOS and Windows) over its built-in HTTP API. Requires Companion 4.0 or later, and StageTime 1.1 or later for the full feature set; the core timer, preset and message controls also work with StageTime 1.0.

Download StageTime and read the full API at [stagetime.app](https://stagetime.app).

## Configuration

- **Host** — IP address or hostname of the machine running StageTime (`127.0.0.1` if it's the same machine). The app lists its own addresses under **Help ▸ API Reference…** (App ▸ API Reference… in StageTime 1.1)
- **Port** — StageTime's API port (default `8088`, changeable under **App ▸ Change API Port…**)
- **API key** — leave empty unless StageTime has one set (App ▸ API Key… in StageTime 1.2+). Commands then carry it automatically; status and feedback never need it.
- **Live updates** — on by default. The module subscribes to StageTime's event stream, so button feedback and variables change the instant the timer does. Turn it off to poll `/api/status` at the poll interval instead.

## Actions

**Timer** — Start, Stop, Start/Stop, Clear, Set time, Add/subtract time (minutes or seconds, negative to subtract, works while running), Count down to a clock time (HH:MM, in the display's time zone), Set wrap-up warning.

**Presets** — Load slot 1–5, Load by name.

**Modes** — Set mode (Countdown / Stopwatch / Clock), Stopwatch milliseconds on/off/toggle.

**Messages** — Show (with a layout choice: use the app preference, beneath the timer, or full screen), Hide, Show/hide toggle, Show quick message 1–6 (the pills saved in the remote), Set auto-message text.

**Display** — Blackout on/off/toggle, Background blue/black/toggle, Clock format 12h/24h/toggle, Time zone (common zones or a custom IANA name).

**Options** — Set any on/off option (flash light, flash border, stop at zero, buzzer, auto-message, progress bar, keep timer visible, corner clock, ends-at time, blackout, blue background, milliseconds, 12-hour clock) to on, off, or toggle. Test buzzer, buzzer volume, buzzer back to built-in beeps.

**Display** also has mirror to a monitor (StageTime 1.2), and **App** has reset the connection log.

**Rundown** (StageTime 1.2) — Next cue, Previous cue, Go to cue N (load and start, or load only), Auto-advance on/off/toggle, Reset run data.

Text fields accept Companion variables.

## Feedbacks

- **Light: colour the button** — background follows the traffic light (green / yellow / red / gray)
- **Light: is a colour** — true for the chosen colour
- **Timer: in wrap-up zone**, **Timer: in overtime**, **Timer: remaining time below N seconds**
- **Timer: running** / **stopped**
- **Mode: is** (Countdown / Stopwatch / Clock), plus the individual mode feedbacks
- **Message: visible**, **Message: quick message slot has text**, **Preset: slot has a preset** (hide unused buttons)
- **Option: is on** for any on/off option (including rundown auto-advance)
- **Rundown: cue N is live**, **Rundown: live cue is over plan**
- **Clock: time zone is**
- **Display: blacked out**

## Variables

Time: `formattedTime` (MM:SS), `formattedTimeSigned` (with `-` in overtime), `remainingSeconds`, `timerMinutes`, `timerSeconds`, `overtime`, `progress`, `progressPercent`.

State: `running`, `mode`, `localMode`, `countUpMode`, `lightColor`, `lightColorHex`, `wrapUpSeconds`, `wrapUpFormatted`.

Messages: `messageVisible`, `messageWithTimer`, `messageShownWithTimer`, `autoMessageAtZero`, `autoMessageText`, `quick_1_text` … `quick_6_text`, `quickCount`.

Options: `flashOn`, `flashBorder`, `stopAtZero`, `soundOn`, `showProgress`, `showMilliseconds`, `bgBlue`, `blackout`, `cornerClock`, `timeZone`, `hour12`, `clockFormat`.

Presets: `preset_1_name` … `preset_5_name`, `preset_1_time` … `preset_5_time`, `presetCount`. Also `version`, `showEndsAt`, `endsAt`, `buzzerSound`, `buzzerVolume`, `apiKeySet`, `mirrors`, `webRemoteEnabled`, `webRemoteSessions`.

Rundown: `rundownCue`, `rundownNext`, `rundownIndex`, `rundownCount`, `rundownAutoAdvance`, `rundownActual`, `rundownActualFormatted`, `rundownOver`, `rundownOverFormatted`.

Use them on any button as `$(wakemedia-stagetime:formattedTime)`.

## Presets

Ready-made buttons, one per job, in these categories:

- **Timer** — Start/Stop (label follows the state), Clear, a live timer readout that follows the light colour and starts/stops on press, Count down to a clock time.
- **Adjust Time** — ±1 sec, ±30 sec, ±1, ±5 and ±10 min.
- **Quick Set** — 5 to 60 minutes.
- **Presets** — slots 1–5, labelled with the preset name and time.
- **Messages** — quick messages 1–6 labelled from the app, a custom show/hide button, hide, keep-timer-visible and auto-message toggles.
- **Stopwatch** — stopwatch mode, start from zero, live readout, reset, milliseconds.
- **Clock** — clock mode, 12h/24h, corner clock, and common time zones with an active-zone feedback.
- **Countdown** — countdown mode, wrap-up quick sets, flash light, flash border, stop at zero, buzzer, progress bar, test buzzer.
- **Rundown** — next, previous, go to cue 1–4, live cue and next cue readouts, over/under, auto-advance.
- **Display** — blackout, blue keying background.

Drag them onto your grid from the Presets tab.
