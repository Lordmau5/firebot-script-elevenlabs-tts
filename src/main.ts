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
	ElevenLabsVoiceBase,
	ElevenLabsSubscriptionData,
	Models
} from './eleven-labs-api';

interface Params {
	api_key: string;
	show_premade_voices: boolean;
	default_model: string;
}

const script: Firebot.CustomScript<Params> = {
	getScriptManifest: () => {
		return {
			name: 'ElevenLabs TTS',
			description: 'A custom script that allows ElevenLabs TTS to be used in Firebot',
			author: 'Lordmau5',
			version: '1.2.6',
			firebotVersion: '5'
		};
	},
	getDefaultParameters: () => {
		return {
			api_key: {
				type: 'password',
				default: '',
				title: 'Your ElevenLabs API key',
				showBottomHr: true
			},
			show_premade_voices: {
				type: 'boolean',
				default: true,
				title: 'Enable to show premade voices provided by ElevenLabs'
			},
			default_model: {
				type: 'enum',
				title: 'Select the default model',
				default: Models[0].id,
				options: Models.map(m => m.name),
				description: 'The default model to use for the Request TTS effect'
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

		modules.frontendCommunicator.on('elevenlabs-get-models', () => {
			const models = [...Models];

			const default_model = ElevenLabs.getDefaultModel();
			models.unshift({
				name: `Default`,
				id: default_model.id,
				is_default: true
			});

			return models;
		});

		modules.frontendCommunicator.on('elevenlabs-get-default-model-name', () => ElevenLabs.getDefaultModel().name);

		modules.frontendCommunicator.onAsync('elevenlabs-get-voices', async () => {
			const response = {
				error: false,
				voices: [] as ElevenLabsVoiceBase[]
			};

			try {
				const {
					api_key, show_premade_voices
				} = parameters;

				const api = ElevenLabs.instance;
				api.setup(api_key);

				const voices = await api.fetchVoices({
					show_premade_voices
				});

				response.voices = voices;
			}
			catch (err) {
				modules.logger.error('Unable to fetch voices', err);
				response.error = true;
			}

			return response;
		});

		modules.frontendCommunicator.onAsync('elevenlabs-get-subscription-data', async () => {
			const response = {
				error: false,
				subscriptionData: null as ElevenLabsSubscriptionData
			};

			try {
				const {
					api_key
				} = parameters;

				const api = ElevenLabs.instance;
				api.setup(api_key);

				response.subscriptionData = await api.fetchSubscriptionData();
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
