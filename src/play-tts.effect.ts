import ElevenLabs from './eleven-labs-api';
import { v4 as uuid } from 'uuid';
import * as fs from 'fs-extra';

import {Effects} from "@crowbartools/firebot-custom-scripts-types/types/effects";
import template from './play-tts.html'
import {modules, settings, parameters} from "./main";
import EffectType = Effects.EffectType;

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface EffectModel {
    voice_id: string;

    text: string;

    stability: number,
    similarity: number,
    style: number,
    speaker_boost: boolean,
    use_turbo_model: boolean,

    maxSoundLength: number;
    waitForSound: boolean;
    
    volume: number;
    audioOutputDevice: {
        deviceId: string;
        label: string;
    };
    overlayInstance: string;
}

const effect: EffectType<EffectModel> = {
    definition: {
        id: "lordmau5:tts:elevenlabs-tts",
        name: "Play ElevenLabs TTS",
        description: "Play a TTS message using ElevenLabs",
        icon: "fad fa-microphone-alt",
        // @ts-ignore
        categories: ["fun", "integrations"]
    },
    optionsTemplate: template,
    optionsController: ($scope, utilityService: any, backendCommunicator: any, $q: any, $timeout: any) => {
        if ($scope.effect.volume == null) {
            $scope.effect.volume = 5;
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
    },
    // @ts-ignore
    optionsValidator: (effect) => {
        const errors: string[] = [];

        if (!effect.voice_id?.length) {
            errors.push('Please provide a voice ID.');
        }

        if (!effect.text?.length) {
            errors.push('Please provide text to synthesize.');
        }

        return errors;
    },
    onTriggerEvent: async (scope) => {
        const effect = scope.effect;

        if (!parameters.api_key.length || !effect.voice_id.length) {
            modules.logger.error('No API key or Voice ID specified.');
            return false;
        }

        if (!effect.text.length) {
            modules.logger.error('No text specified.');
            return false;
        }

        const voice = new ElevenLabs(
            {
                apiKey:  parameters.api_key,    // Your API key from Elevenlabs
                voiceId: effect.voice_id,   // A Voice ID from Elevenlabs
            }
        );

        let mp3Path = undefined;
        try {
            const ELEVENLABS_TMP_DIR = modules.path.join(SCRIPTS_DIR, '..', 'tmp', 'elevenlabs');

            if (!(await fs.pathExists(ELEVENLABS_TMP_DIR))) {
                await fs.mkdirp(ELEVENLABS_TMP_DIR);
            }

            mp3Path = modules.path.join(ELEVENLABS_TMP_DIR, `${uuid()}.mp3`);
        } catch (err) {
            modules.logger.error('Unable to prep folder', err);
            return false;
        }

        try {
            const response = await voice.textToSpeech({
                // Required Parameters
                fileName:           mp3Path,
                textInput:          effect.text,                    // The text you wish to convert to speech
            
                // Optional Parameters
                stability:          effect.stability,                            // The stability for the converted speech
                similarity:         effect.similarity,                           // The similarity boost for the converted speech
                style:              effect.style,                            // The style exaggeration for the converted speech
                speakerBoost:       effect.speaker_boost,                            // The speaker boost for the converted speech
                useTurboModel:      effect.use_turbo_model,                           // Whether to use the turbo model or not
            });
            modules.logger.info('TTS Response', JSON.stringify(response));
        }
        catch (err) {
            modules.logger.error('Unable to save TTS', err);
            return false;
        }

        const data: {
            filepath: string;
            volume: number;
            audioOutputDevice: EffectModel["audioOutputDevice"];
            overlayInstance: string;
            resourceToken?: string
        } = {
            filepath: mp3Path,
            volume: scope.effect.volume,
            audioOutputDevice: scope.effect.audioOutputDevice,
            overlayInstance: scope.effect.overlayInstance,
        }

        if (data.audioOutputDevice == null || data.audioOutputDevice.label === "App Default") {
            data.audioOutputDevice = settings.getAudioOutputDevice();
            if (data.audioOutputDevice.deviceId == "overlay") {
                data.overlayInstance = null;
            }
        }

        const duration = await modules.frontendCommunicator.fireEventAsync("getSoundDuration", {
            path: "file://" + data.filepath
        });

        // @ts-ignore
        const durationMs = (Math.round(duration) || 0) * 1000;

        // Generate token if going to overlay, otherwise send to gui.
        if (scope.effect.audioOutputDevice.deviceId === "overlay") {
            // @ts-ignore
            data.resourceToken = modules.resourceTokenManager.storeResourcePath(
                data.filepath,
                duration
            );
            // send event to the overlay
            modules.httpServer.sendToOverlay("sound", data);
        } else {
            // Send data back to media.js in the gui.
            renderWindow.webContents.send("playsound", data);
        }

        try {
            const waitPromise = wait(durationMs).then(async function () {
                // await fs.unlink(data.filepath);
            });

            if (effect.waitForSound) {
                await waitPromise;
            }

            return true;
        } catch (error) {
            return true;
        }
    }
}

export default effect;
