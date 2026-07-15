import * as fs from 'fs-extra';

import template from './template.html';
import firebot, { EffectType, FirebotAudioDevice } from '@crowbartools/firebot-types';
import { elevenLabs } from '../eleven-labs-api';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface EffectModel {
	tts_token: string;

	maxSoundLength: number;
	waitForSound: boolean;
}

interface OverlayData {
	overlayInstance: string;
	volume: number;
	audioOutputDevice: FirebotAudioDevice;
}

const effect: EffectType<EffectModel & OverlayData> = {
	definition: {
		id: 'lordmau5:tts:elevenlabs-play-tts',
		name: 'Play ElevenLabs TTS',
		description: 'Play a TTS message using ElevenLabs',
		icon: 'fad fa-microphone-alt',
		categories: [
			'fun',
			'integrations'
		]
	},
	optionsTemplate: template,
	optionsController: ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
		if ($scope.effect.volume == null) {
			$scope.effect.volume = 5;
		}
	},
	optionsValidator: effect => {
		const errors: string[] = [];

		if (!effect.tts_token?.length) {
			errors.push('Please provide a TTS token.');
		}

		return errors;
	},
	onTriggerEvent: async event => {
		const effect = event.effect;

		const tts_token = effect.tts_token;

		if (!tts_token.length) {
			firebot.logger.error('No TTS token specified.');

			return false;
		}

		if (!elevenLabs.tts_promises.has(tts_token)) {
			firebot.logger.error('No TTS with this TTS token was requested.');

			return false;
		}

		const promise_result = await elevenLabs.tts_promises.get(tts_token);

		elevenLabs.tts_promises.delete(tts_token);

		if (promise_result.status !== 'ok') {
			firebot.logger.error('TTS request failed.');

			return false;
		}

		const data: {
			filepath: string;
			volume: number;
			audioOutputDevice: FirebotAudioDevice;
			overlayInstance: string;
			resourceToken?: string
		} = {
			filepath: promise_result.fileName,
			volume: effect.volume,
			audioOutputDevice: effect.audioOutputDevice,
			overlayInstance: effect.overlayInstance
		};

		if (data.audioOutputDevice == null || data.audioOutputDevice.label === 'App Default') {
			data.audioOutputDevice = firebot.settings.getSetting('AudioOutputDevice');
		}

		const duration = await firebot.frontendCommunicator.fireEventAsync('getSoundDuration', {
			path: 'file://' + data.filepath
		}) as number;

		const durationMs = (Math.round(duration) || 0) * 1000;

		// Generate token if going to overlay, otherwise send to gui.
		if (data.audioOutputDevice.deviceId === 'overlay') {
			data.resourceToken = firebot.webServer.createResourceToken(
				data.filepath,
				duration
			);
			// send event to the overlay
			event.sendDataToOverlay(data, effect.overlayInstance);
		}
		else {
			// Send data back to media.js in the gui.
			renderWindow.webContents.send('playsound', data);
		}

		try {
			const waitPromise = wait(durationMs).then(async function () {
				await fs.unlink(data.filepath);
			});

			if (effect.waitForSound) {
				await waitPromise;
			}

			return true;
		}
		catch (error) {
			return true;
		}
	},
	overlayExtension: {
		dependencies: {
			css: [],
			js: []
		},
		event: {
			name: 'lordmau5:elevenlabs-tts:sound',
			onOverlayEvent: (event: any) => {
				const data = event;
				// @ts-ignore
				const token = encodeURIComponent(data.resourceToken);
				const resourcePath = `http://${window.location.hostname
					}:7472/resource/${token}`;

				// Generate UUID to use as class name.
				// eslint-disable-next-line no-undef
				// @ts-ignore
				const uuid = uuidv4();

				const filepath = data.isUrl ? data.url : data.filepath.toLowerCase();
				let mediaType;
				if (filepath.endsWith('mp3')) {
					mediaType = 'audio/mpeg';
				}
				else if (filepath.endsWith('ogg')) {
					mediaType = 'audio/ogg';
				}
				else if (filepath.endsWith('wav')) {
					mediaType = 'audio/wav';
				}
				else if (filepath.endsWith('flac')) {
					mediaType = 'audio/flac';
				}

				const audioElement = `<audio id="${uuid}" src="${data.isUrl ? data.url : resourcePath}" type="${mediaType}"></audio>`;

				// Throw audio element on page.
				// @ts-ignore
				$('#wrapper').append(audioElement);

				const audio = document.getElementById(uuid) as HTMLAudioElement;
				if (audio) {
					audio.volume = parseFloat(data.volume) / 10;

					audio.oncanplay = () => audio.play();

					audio.onended = () => {
						// @ts-ignore
						$(`#${uuid}`).remove();
					};
				}
			}
		}
	}
};

export default effect;
