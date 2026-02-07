import ElevenLabs, {
	ElevenLabsSubscriptionData,
	ElevenLabsDialogueInput,
	Model
} from './eleven-labs-api';
import {
	v4 as uuid
} from 'uuid';
import * as fs from 'fs-extra';

import {
	Effects
} from '@crowbartools/firebot-custom-scripts-types/types/effects';
import template from './request-dialogue.html';
import {
	modules, parameters, tts_promises
} from './main';
import EffectType = Effects.EffectType;
import {
	ElevenLabsVoiceBase
} from './eleven-labs-api';

interface VoiceMapElement {
	voice_id: string;
	voice_name: string;
	names: string[];
}

interface EffectModel {
	voiceAddName: string | undefined;
	voiceAddID: ElevenLabsVoiceBase | undefined;

	text: string;
	model: Model;
	splitText: string;

	voices: Record<string, VoiceMapElement>;

	stability: string;

	waitForGeneration: boolean;
}

const effect: EffectType<EffectModel> = {
	definition: {
		id: 'lordmau5:tts:elevenlabs-request-dialogue',
		name: 'Request ElevenLabs Dialogue',
		description: 'Request a dialogue using ElevenLabs (returns a TTS token)',
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
		if ($scope.effect.stability == null) {
			$scope.effect.stability = '0.5';
		}

		if ($scope.effect.splitText == null) {
			$scope.effect.splitText = '--';
		}

		if ($scope.effect.voices == null) {
			$scope.effect.voices = {};
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

				if ($scope.effect.voiceAddID == null) {
					$scope.effect.voiceAddID = voices[0];
				}

				$scope.voices = voices;

				$scope.getRemainingVoices = () => {
					return voices.filter(v => !Object.hasOwn($scope.effect.voices, v.voice_id));
				};
			});

		$scope.addVoice = () => {
			const name = $scope.effect.voiceAddName;
			const voice = $scope.effect.voiceAddID;

			if (!name || !voice) return;

			// Split by comma, trim spaces
			const names = name.split(',').map(n => n.trim());

			$scope.effect.voices[voice.voice_id] = {
				voice_id: voice.voice_id,
				voice_name: voice.name,
				names
			}

			$scope.effect.voiceAddName = undefined;
			$scope.effect.voiceAddID = undefined;
		};

		$scope.deleteVoice = (voice_id: string) => {
			delete $scope.effect.voices[voice_id];
		};

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

		let model: Model = effect.model;
		if (!model?.id || model.is_default) {
			model = ElevenLabs.getDefaultModel();
		}

		if (!parameters.api_key.length) {
			modules.logger.error('No API key specified.');

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
			const inputs = [] as ElevenLabsDialogueInput[];
			const splits = effect.text.split(` ${effect.splitText} `);

			const getRandomVoice = () => {
				return Object.values(effect.voices)[
					Math.floor(Math.random() * Object.values(effect.voices).length)
				];
			}

			for (const _text of splits) {
				const text = _text.trim();

				if (!text.length) continue;

				const [voiceName, ...messageParts] = text?.replaceAll("\\n", " ").split(":") || [];
				const voice = voiceName?.trim().toLowerCase();

				const foundVoice = Object.values(effect.voices).find(v => {
					for (const name of v.names) {
						if (name.toLowerCase() === voice) {
							return v;
						}
					}

					return false;
				});

				if (foundVoice) {
					inputs.push({
						voice_id: foundVoice.voice_id,
						text: messageParts.join(":").trim()
					});
				}
				// Unmatched voice
				else {
					// If it's the first one, for uses like "User xyz says:", set it undefined so it takes the 2nd input's voice
					if (!inputs.length) {
						inputs.push({
							voice_id: undefined,
							text
						});
					}
					else {
						inputs.push({
							voice_id: getRandomVoice().voice_id,
							text
						});
					}
				}
			}

			if (inputs[0].voice_id === undefined) {
				// If the first input doesn't have a voice set, take the 2nd in line which will always have one
				if (inputs.length > 1 && inputs[1].voice_id !== undefined) {
					inputs[0].voice_id = inputs[1].voice_id;
				}
				// Otherwise, if there is no matched voice, get a random one
				else {
					inputs[0].voice_id = getRandomVoice().voice_id;
				}
			}

			const tts = api.textToDialogue({
				fileName: mp3Path,
				inputs,
				// For now this is only supported on the v3 model.
				model: ElevenLabs.getModelByID('eleven_v3'),
				stability: effect.stability
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
