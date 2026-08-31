import {
	ElevenLabsSubscriptionData,
	ElevenLabsVoiceBase,
	Model,
	elevenLabs
} from '../eleven-labs-api';
import * as fs from 'fs-extra';

import template from './template.html';
import firebot, { EffectType } from '@crowbartools/firebot-types';
import path from 'path';

interface EffectModel {
	voice: ElevenLabsVoiceBase;

	text: string;

	speed: number
	stability: number;
	similarity: number;
	style: number;
	model: Model;
	speakerBoost: boolean;

	pronunciationDictionaryId: string;

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
	optionsController: async ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
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

		if ($scope.effect.pronunciationDictionaryId == null) {
			$scope.effect.pronunciationDictionaryId = '';
		}

		const models = await backendCommunicator.fireEventAsync('lordmau5:elevenlabs-tts:get-models');
		$scope.models = models;

		if ($scope.effect.model == null) {
			$scope.effect.model = models[0];
		}

		$scope.default_model = await backendCommunicator.fireEventAsync('lordmau5:elevenlabs-tts:get-default-model-name');

		$q.when(backendCommunicator.fireEventAsync('lordmau5:elevenlabs-tts:get-voices'))
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
		$q.when(backendCommunicator.fireEventAsync('lordmau5:elevenlabs-tts:get-subscription-data'))
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
			model = elevenLabs.getDefaultModel();
		}

		if (!voiceId.length) {
			firebot.logger.error('Voice ID specified.');

			return false;
		}

		if (!effect.text.length) {
			firebot.logger.error('No text specified.');

			return false;
		}

		if (!elevenLabs.setup()) {
			return false;
		}

		const ttsToken = crypto.randomUUID();

		let mp3Path = undefined;
		try {
			const ELEVENLABS_TMP_DIR = path.join(firebot.storage.path, '..', '..', 'tmp', 'elevenlabs');

			if (!(await fs.pathExists(ELEVENLABS_TMP_DIR))) {
				await fs.mkdirp(ELEVENLABS_TMP_DIR);
			}

			mp3Path = path.join(ELEVENLABS_TMP_DIR, `${ttsToken}.mp3`);
		}
		catch (err) {
			firebot.logger.error('Unable to prepare temp folder', err);

			return false;
		}

		try {
			const dictId = effect.pronunciationDictionaryId?.trim();
			const pronunciationDictionaryLocators = dictId
				? [{ pronunciation_dictionary_id: dictId }]
				: undefined;

			const tts = elevenLabs.textToSpeech({
				voiceId,
				fileName: mp3Path,
				textInput: effect.text,
				speed: effect.speed,
				stability: effect.stability,
				similarity: effect.similarity,
				style: effect.style,
				speakerBoost: effect.speakerBoost,
				model,
				pronunciationDictionaryLocators
			});

			elevenLabs.tts_promises.set(ttsToken, tts);

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
			firebot.logger.error('Unable to save TTS', err);

			return false;
		}
	}
};

export default effect;
