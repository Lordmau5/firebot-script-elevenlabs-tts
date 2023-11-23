import * as fs from 'fs-extra';
import { modules } from "./main";

const elevenLabsAPIV1 = 'https://api.elevenlabs.io/v1';

interface ElevenLabsSample {
    sample_id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
    hash: string;
}

export interface ElevenLabsVoiceBase {
    category: string;
    description: string;
    name: string;
    voice_id: string;
};

interface ElevenLabsVoice extends ElevenLabsVoiceBase {
    available_for_tiers: string[];
    fine_tuning: {
        fine_tuning_requested: boolean;
        finetuning_state: 'not_started' | 'is_fine_tuning' | 'fine_tuned';
        is_allowed_to_fine_tune: boolean;
        language: string | null;
        manual_verification: object;
        manual_verification_requested: boolean;
        slice_ids: string[] | null;
        verification_attempts: object[] | null;
        verification_attempts_count: number;
        verification_failures: string[]
    };
    high_quality_base_model_ids: string[];
    labels: object;
    preview_url: string;
    samples: ElevenLabsSample[];
    settings: object | null;
    sharing: object | null;
}

export default class ElevenLabs {
    apiKey: string;
    voiceId: string;

    constructor(apiKey: string = '', voiceId?: string) {
        this.apiKey = apiKey;
        this.voiceId = voiceId ? voiceId : 'pNInz6obpgDQGcFmaJgB'; // Default voice 'Adam'

        if (this.apiKey === "") {
            modules.logger.error('Missing API key');
            return;
        }
    }

    async textToSpeech({
        voiceId = this.voiceId,
        fileName,
        textInput,
        stability = 0.5,
        similarity = 0.75,
        useTurboModel = false,
        style = 0,
        speakerBoost = false
    }: {
        voiceId?: string,
        fileName: string,
        textInput: string,
        stability?: number,
        similarity?: number,
        useTurboModel?: boolean,
        style?: number,
        speakerBoost?: boolean
    }) {
        try {
            if (!fileName) {
                modules.logger.error('Missing parameter {fileName}');
                return;
            } else if (!textInput) {
                modules.logger.error('Missing parameter {textInput}');
                return;
            }

            const ttsUrl = `${elevenLabsAPIV1}/text-to-speech/${voiceId}`;
            const options = {
                url: ttsUrl,
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textInput,
                    voice_settings: {
                        stability,
                        similarity_boost: similarity,
                        style,
                        use_speaker_boost: speakerBoost,
                    },
                    model_id: useTurboModel ? 'eleven_turbo_v2' : 'eleven_multilingual_v2',
                }),
            };

            const writeStream = fs.createWriteStream(fileName);

            // @ts-ignore
            modules.request.post(options)
                // @ts-ignore
                .on('error', err => {
                    if (err) {
                        modules.logger.error(err);
                        return;
                    }
                })
                .pipe(writeStream);

            return new Promise((resolve, reject) => {
                const responseJson = {
                    status: 'ok',
                    fileName: fileName
                };
                writeStream.on('finish', () => resolve(responseJson));

                writeStream.on('error', reject);
            });
        } catch (err) {
            modules.logger.error(err);
            throw err;
        }
    }

    async fetchVoices({
        filterCloned = false
    }: {
        filterCloned?: boolean
    }): Promise<ElevenLabsVoice[]> {
        try {
            const voicesURL = `${elevenLabsAPIV1}/voices`;
            const options = {
                url: voicesURL,
                headers: {
                    'Accept': 'application/json',
                    'xi-api-key': this.apiKey,
                },
            };

            return new Promise((resolve, reject) => {
                // @ts-ignore
                modules.request.get(options, (err, res, body) => {
                    if (err) {
                        modules.logger.error(err);
                        reject(err);
                        return;
                    }

                    const { voices: all_voices }: { voices: ElevenLabsVoice[] } = JSON.parse(body);
                    const voices = filterCloned
                        ? all_voices.filter(voice => voice.category === 'cloned')
                        : all_voices;
                    
                    voices.sort((a, b) => {
                        // Cloned voices at the top
                        if (a.category === 'cloned' && b.category === 'cloned') {
                            return a.name.localeCompare(b.name);
                        }
                        if (a.category === 'cloned') {
                            return -1;
                        }
                        if (b.category === 'cloned') {
                            return 1;
                        }

                        return a.name.localeCompare(b.name)
                    });

                    resolve(voices);
                });
            });
        } catch (err) {
            modules.logger.error(err);
            throw err;
        }
    }
}
