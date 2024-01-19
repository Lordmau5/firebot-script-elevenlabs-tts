import * as fs from 'fs-extra';

import {
	Effects
} from '@crowbartools/firebot-custom-scripts-types/types/effects';
import template from './play-tts.html';
import {
	modules, settings, parameters, tts_promises
} from './main';
import EffectType = Effects.EffectType;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface EffectModel {
	tts_token: string;

	maxSoundLength: number;
	waitForSound: boolean;
	deleteAfterPlayback: boolean;
}

interface OverlayData {
	overlayInstance: string;
	volume: number;
	audioOutputDevice: {
		deviceId: string;
		label: string;
	};
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

		if ($scope.effect.deleteAfterPlayback == null) {
			$scope.effect.deleteAfterPlayback = true;
		}
	},
	optionsValidator: effect => {
		const errors: string[] = [];

		if (!effect.tts_token?.length) {
			errors.push('Please provide a TTS token.');
		}

		return errors;
	},
	onTriggerEvent: async scope => {
		const effect = scope.effect;

		const tts_token = effect.tts_token;

		if (!tts_token.length) {
			modules.logger.error('No TTS token specified.');

			return false;
		}

		if (!tts_promises.has(tts_token)) {
			modules.logger.error('No TTS with this TTS token was requested.');

			return false;
		}

		const promise_result = await tts_promises.get(tts_token);

		tts_promises.delete(tts_token);

		if (promise_result.status !== 'ok') {
			modules.logger.error('TTS request failed.');

			return false;
		}

		const data: {
			filepath: string;
			volume: number;
			audioOutputDevice: OverlayData['audioOutputDevice'];
			overlayInstance: string;
			resourceToken?: string
		} = {
			filepath: promise_result.fileName,
			volume: scope.effect.volume,
			audioOutputDevice: scope.effect.audioOutputDevice,
			overlayInstance: scope.effect.overlayInstance
		};

		if (data.audioOutputDevice == null || data.audioOutputDevice.label === 'App Default') {
			data.audioOutputDevice = settings.getAudioOutputDevice();
			if (data.audioOutputDevice.deviceId == 'overlay') {
				data.overlayInstance = null;
			}
		}

		const duration = await modules.frontendCommunicator.fireEventAsync('getSoundDuration', {
			path: 'file://' + data.filepath
		}) as number;

		const durationMs = (Math.round(duration) || 0) * 1000;

		// Generate token if going to overlay, otherwise send to gui.
		if (scope.effect.audioOutputDevice.deviceId === 'overlay') {
			data.resourceToken = modules.resourceTokenManager.storeResourcePath(
				data.filepath,
				duration
			);
			// send event to the overlay
			modules.httpServer.sendToOverlay('sound', data);
		}
		else {
			// Send data back to media.js in the gui.
			renderWindow.webContents.send('playsound', data);
		}

		try {
			const waitPromise = wait(durationMs).then(async function() {
				if (effect.deleteAfterPlayback)
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
	}
};

export default effect;
