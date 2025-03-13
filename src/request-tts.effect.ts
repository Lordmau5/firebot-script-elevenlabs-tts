import ElevenLabs, {
	ElevenLabsSubscriptionData,
	Model
} from './eleven-labs-api';
import {
	v4 as uuid
} from 'uuid';
import * as fs from 'fs-extra';

import {
	Effects
} from '@crowbartools/firebot-custom-scripts-types/types/effects';
import template from './request-tts.html';
import {
	modules, parameters, tts_promises
} from './main';
import EffectType = Effects.EffectType;
import {
	ElevenLabsVoiceBase
} from './eleven-labs-api';

interface EffectModel {
	voice: ElevenLabsVoiceBase;

	text: string;

	speed: number
	stability: number;
	similarity: number;
	style: number;
	model: Model;
	speakerBoost: boolean;

	waitForGeneration: boolean;
}

const effect: EffectType<EffectModel> = {
	definition: {
		id: 'lordmau5:tts:elevenlabs-request-tts',
		name: 'Request ElevenLabs TTS',
		description: 'Request a TTS message using ElevenLabs (returns a TTS token)',
		icon: 'fad fa-microphone-alt',
		categories: [
			'fun',
			'integrations'
		],
		outputs: [{
			label: 'TTS Token',
			description: 'The TTS token to use for the play effect',
			defaultName: 'ttsToken'
		}]
	},
	optionsTemplate: template,
	optionsController: ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
		if ($scope.effect.speed == null) {
			$scope.effect.speed = 1.0;
		}

		if ($scope.effect.stability == null) {
			$scope.effect.stability = 0.5;
		}

		if ($scope.effect.similarity == null) {
			$scope.effect.similarity = 0.75;
		}

		if ($scope.effect.style == null) {
			$scope.effect.style = 0;
		}

		const models = backendCommunicator.fireEventSync('elevenlabs-get-models');
		$scope.models = models;

		if ($scope.effect.model == null) {
			$scope.effect.model = models[0];
		}

		$scope.default_model = backendCommunicator.fireEventSync('elevenlabs-get-default-model-name');

		$q.when(backendCommunicator.fireEventAsync('elevenlabs-get-voices'))
			.then(({
				error, voices
			}: { error: boolean, voices: ElevenLabsVoiceBase[] }) => {
				if (error || !voices.length) {
					return;
				}

				if ($scope.effect.voice == null) {
					$scope.effect.voice = voices[0];
				}

				$scope.voices = voices;
			});

		$scope.fetchingSubscriptionData = true;
		$q.when(backendCommunicator.fireEventAsync('elevenlabs-get-subscription-data'))
			.then(({
				error, subscriptionData
			}: { error: boolean, subscriptionData: ElevenLabsSubscriptionData }) => {
				$scope.fetchingSubscriptionData = false;

				if (error || !subscriptionData) {
					return;
				}

				$scope.subscriptionData = subscriptionData;
			});
	},
	optionsValidator: effect => {
		const errors: string[] = [];

		if (!effect.text?.length) {
			errors.push('Please provide text to synthesize.');
		}

		return errors;
	},
	onTriggerEvent: async scope => {
		const effect = scope.effect;

		const voiceId = effect.voice.voice_id;
		let model: Model = effect.model;
		if (!model?.id || model.is_default) {
			model = ElevenLabs.getDefaultModel();
		}

		if (!parameters.api_key.length || !voiceId.length) {
			modules.logger.error('No API key or Voice ID specified.');

			return false;
		}

		if (!effect.text.length) {
			modules.logger.error('No text specified.');

			return false;
		}

		const api = ElevenLabs.instance;
		api.setup(parameters.api_key);

		const ttsToken = uuid();

		let mp3Path = undefined;
		try {
			const ELEVENLABS_TMP_DIR = modules.path.join(SCRIPTS_DIR, '..', 'tmp', 'elevenlabs');

			if (!(await fs.pathExists(ELEVENLABS_TMP_DIR))) {
				await fs.mkdirp(ELEVENLABS_TMP_DIR);
			}

			mp3Path = modules.path.join(ELEVENLABS_TMP_DIR, `${ttsToken}.mp3`);
		}
		catch (err) {
			modules.logger.error('Unable to prepare temp folder', err);

			return false;
		}

		try {
			const tts = api.textToSpeech({
				voiceId,
				fileName: mp3Path,
				textInput: effect.text,
				speed: effect.speed,
				stability: effect.stability,
				similarity: effect.similarity,
				style: effect.style,
				speakerBoost: effect.speakerBoost,
				model
			});

			tts_promises.set(ttsToken, tts);

			if (effect.waitForGeneration) {
				await tts;
			}

			return {
				success: true,
				outputs: {
					ttsToken
				}
			};
		}
		catch (err) {
			modules.logger.error('Unable to save TTS', err);

			return false;
		}
	}
};

export default effect;
