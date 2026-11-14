# GymTV

A tvOS display for the gym app. It connects to the same `/ws` socket as the web display and draws the selected workout natively, using the content from `/api/workouts`. The remote stays on the web.

## Run it

1. `brew install xcodegen` (once), then `xcodegen generate` in this folder.
2. Open `GymTV.xcodeproj`, pick your team under Signing & Capabilities, and run on your Apple TV (pair it first: Xcode > Window > Devices and Simulators).
3. The server address is `Server.base` in `GymTV/GymClient.swift`.

Workout content lives in `shared/workouts.ts`. Change it there and both the web display and this app pick it up. Yoga is a video, so the TV shows only its name.
