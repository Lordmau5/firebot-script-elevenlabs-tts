# Starter Firebot Custom Script in Typescript

## A very opinionated Firebot Script template.

### Setup
1. Create a new repo based off this template (Click "Use this Template" above) or simply fork it
2. `npm install`

### Development
This template will automatically load the default export from the following:
- System Commands (*.command.ts)
- Conditions (*.condition.ts)
- Effects (*.effect.ts)
- Events (*.event.ts) - Use the EventSource in [main.ts](src%2Fmain.ts)
- Event Filters (*.filter.ts)
- Firebot Games (*.game.ts)
- Integrations (*.integration.ts)
- Command Restrictions (*.restriction.ts)
- Replace Variables (*.variable.ts)

### Building
Dev:
1. `npm run build:dev`
- Automatically copies the compiled .js to Firebot's scripts folder.

Release:
1. `npm run build`
- Copy .js from `/dist`

### Note
- Keep the script definition object (that contains the `run`, `getScriptManifest`, and `getDefaultParameters` funcs) in the `index.ts` file as it's important those function names don't get minimized.
- Edit the `"scriptOutputName"` property in `package.json` to change the filename of the outputted script.
