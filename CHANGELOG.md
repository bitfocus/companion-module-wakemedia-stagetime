# companion-module-wakemedia-stagetime

## 1.1.0 — 2026-09-22

Full coverage of the StageTime 1.1 API. Rebuilt on `@companion-module/base` 2.x, so it requires Companion 4.0 or later.

- **Live updates.** Subscribes to StageTime's `/api/events` stream (reconnects with backoff), so feedbacks and variables change the instant the timer does. Polling remains as an option.
- **Actions** for everything new in StageTime 1.1: count down to a clock time, quick messages 1–6, message layout (beneath the timer / full screen), show-or-hide toggle, blackout, background toggle, clock format, time zone, stopwatch milliseconds, buzzer test, auto-message text, load preset by name, mode selector, and a generic on/off/toggle action for every option. Text fields accept variables. All 1.0 action IDs are unchanged, so existing buttons keep working.
- **Feedbacks:** light is a colour, wrap-up zone, overtime, remaining time below a threshold, mode is, quick message slot has text, preset slot is set, option is on, time zone is, blacked out.
- **Variables** for every status field, plus `formattedTimeSigned`, `mode`, `timerMinutes`, `timerSeconds`, `progressPercent`, `wrapUpFormatted`, `clockFormat`, and `quick_1_text` … `quick_6_text`.
- **Presets:** one button per job in nine categories: Timer, Adjust Time (now with ±1 sec), Quick Set, Presets, Messages (quick messages labelled from the app), Stopwatch, Clock (with time zone buttons), Countdown, Display.
- Test suite (`npm test`) boots the real StageTime API and fires every action at it.

## 1.0.0 — 2026-03-28

Initial release: start/stop/toggle/clear, set and add time, presets 1–5, messages, modes, flash / stop-at-zero / wrap-up / background, light-colour and running feedbacks, time and preset variables.
