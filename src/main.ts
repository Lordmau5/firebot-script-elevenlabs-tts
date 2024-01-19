import {
	Firebot, ScriptModules
} from '@crowbartools/firebot-custom-scripts-types';
import {
	autoload
} from './autoload';
import {
	EventSource
} from '@crowbartools/firebot-custom-scripts-types/types/modules/event-manager';
import {
	FirebotSettings
} from '@crowbartools/firebot-custom-scripts-types/types/settings';
import ElevenLabs, {
	ElevenLabsVoiceBase
} from './eleven-labs-api';

interface Params {
	api_key: string;
}

const script: Firebot.CustomScript<Params> = {
	getScriptManifest: () => {
		return {
			name: 'ElevenLabs TTS',
			description: 'A custom script that allows ElevenLabs TTS to be used in Firebot',
			author: 'Lordmau5',
			version: '1.2.2',
			firebotVersion: '5'
		};
	},
	getDefaultParameters: () => {
		return {
			api_key: {
				type: 'string',
				default: '',
				description: 'Your ElevenLabs API key',
				showBottomHr: true
			}
		};
	},
	parametersUpdated: async params => {
		parameters = params;
	},
	run: async runRequest => {
		const eventSource: EventSource = {
			id: 'elevenlabs-tts',
			name: 'ElevenLabs TTS',
			events: []
		};
		autoload(runRequest.modules, eventSource);
		modules = runRequest.modules;
		settings = runRequest.firebot.settings;
		parameters = runRequest.parameters;

		modules.frontendCommunicator.onAsync('elevenlabs-get-voices', async() => {
			const response = {
				error: false,
				voices: [] as ElevenLabsVoiceBase[]
			};

			try {
				const voice = new ElevenLabs(parameters.api_key);

				const voices = await voice.fetchVoices({
					filterCloned: false
				});

				response.voices = voices;
			}
			catch (err) {
				modules.logger.error('Unable to fetch voices', err);
				response.error = true;
			}

			return response;
		});
	}
};

export let parameters: Params;

export let modules: ScriptModules;

export let settings: FirebotSettings;

export const tts_promises: Map<string, Promise<any>> = new Map();

export default script;
