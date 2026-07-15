import { Plugin } from "@crowbartools/firebot-types";

import playTTSEffect from './play-tts-effect';
import requestTTSEffect from './request-tts-effect';
import requestDialogueEffect from './request-dialogue-effect';

import {
	Models,
	elevenLabs
} from './eleven-labs-api';

const plugin: Plugin<Params> = {
	manifest: {
		name: 'ElevenLabs TTS',
		description: 'A custom script that allows ElevenLabs TTS to be used in Firebot',
		author: 'Lordmau5',
		version: '1.5.0',
		repo: 'https://github.com/Lordmau5/firebot-script-elevenlabs-tts',
		icon: {
			type: "font-awesome",
			name: "fa-volume-up",
			color: "#7c42e8",
		},
	},
	parametersSchema: [
		{
			name: "api_key",
			type: "password",
			default: "",
			title: "API Key",
			description: "Your ElevenLabs API key",
		},
		{
			name: "show_premade_voices",
			type: "boolean",
			default: true,
			title: "Show Premade Voices",
			description: "Enable to show premade voices provided by ElevenLabs",
		},
		{
			name: "default_model",
			type: 'enum',
			title: 'Select the default model',
			default: Models[0].id,
			options: Models.map(m => m.name),
			description: 'The default model to use for the Request TTS effect'
		}
	],
	registers: {
		effects: [playTTSEffect, requestTTSEffect, requestDialogueEffect],
		frontendListeners: elevenLabs.frontendListeners
	},
};

export default plugin;
