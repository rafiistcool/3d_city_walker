# Run and deploy your AI Studio app

This contains everything you need to run your app locally. The application now uses
an interactive 3D scene with a larger city, reflective buildings and an animated
character.

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Codex setup

To automatically install dependencies and build the project in a Codex environment,
run the provided script:

```bash
./setup.sh
```
