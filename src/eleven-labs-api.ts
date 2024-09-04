import * as fs from 'fs-extra';
import {
	modules
} from './main';

const elevenLabsAPIV1 = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsSubscriptionData {
	tier: string;
	character_count: number;
	character_count_formatted: string;
	character_limit: number;
	character_limit_formatted: string;
	character_usage_percentage: number;
	can_extend_character_limit: boolean;
	allowed_to_extend_character_limit: boolean;
	next_character_count_reset_unix: number;
	next_reset_date_formatted: string;
	voice_limit: number;
	max_voice_add_edits: number;
	voice_add_edit_counter: number;
	professional_voice_limit: number;
	can_extend_voice_limit: boolean;
	can_use_instant_voice_cloning: boolean;
	can_use_professional_voice_cloning: boolean;
	currency: string;
	status: string;
	billing_period: string;
	character_refresh_period: string;
	next_invoice: {
		amount_due_cents: number;
		next_payment_attempt_unix: number;
	};
	has_open_invoices: boolean;
}

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
}

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
	private static _instance: ElevenLabs;

	private apiKey: string;

	private constructor() {}

	public static get instance() {
		if (!ElevenLabs._instance) {
			ElevenLabs._instance = new ElevenLabs();
		}

		return ElevenLabs._instance;
	}

	public setup(apiKey: string = '') {
		this.apiKey = apiKey;

		if (this.apiKey === '') {
			modules.logger.error('Missing API key');

			return;
		}
	}

	public async textToSpeech({
		voiceId = 'pNInz6obpgDQGcFmaJgB', // Default voice 'Adam'
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
			}
			else if (!textInput) {
				modules.logger.error('Missing parameter {textInput}');

				return;
			}

			const ttsUrl = `${ elevenLabsAPIV1 }/text-to-speech/${ voiceId }`;
			const options = {
				url: ttsUrl,
				headers: {
					Accept: 'audio/mpeg',
					'xi-api-key': this.apiKey,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					text: textInput,
					voice_settings: {
						stability,
						similarity_boost: similarity,
						style,
						use_speaker_boost: speakerBoost
					},
					model_id: useTurboModel ? 'eleven_turbo_v2_5' : 'eleven_multilingual_v2'
				})
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
		}
		catch (err) {
			modules.logger.error(err);
			throw err;
		}
	}

	public sortVoices(voices: ElevenLabsVoice[]) {
		const categoryOrder = [
			'cloned',
			'professional',
			'generated',
			'premade'
		];

		return voices.sort((a, b) => {
			const categoryA = a.category.toLowerCase();
			const categoryB = b.category.toLowerCase();

			const indexA = categoryOrder.indexOf(categoryA);
			const indexB = categoryOrder.indexOf(categoryB);

			if ((indexA === -1 && indexB === -1) || indexA === indexB) {
				// If neither category is in the order array, sort alphabetically
				return a.name.localeCompare(b.name);
			}
			else if (indexA === -1) {
				// If categoryA is not in the order array, put it after categoryB
				return 1;
			}
			else if (indexB === -1) {
				// If categoryB is not in the order array, put it after categoryA
				return -1;
			}
			else {
				// Sort based on the order in the categoryOrder array
				return indexA - indexB;
			}
		});
	}

	public async fetchVoices({
		show_premade_voices = true
	}: {
		show_premade_voices?: boolean
	}): Promise<ElevenLabsVoice[]> {
		try {
			const voicesURL = `${ elevenLabsAPIV1 }/voices`;
			const options = {
				url: voicesURL,
				headers: {
					Accept: 'application/json',
					'xi-api-key': this.apiKey
				}
			};

			return new Promise((resolve, reject) => {
				// @ts-ignore
				modules.request.get(options, (err, res, body) => {
					if (err) {
						modules.logger.error(err);
						reject(err);

						return;
					}

					const {
						voices: all_voices
					}: { voices: ElevenLabsVoice[] } = JSON.parse(body);
					const voices = show_premade_voices
						? all_voices
						: all_voices.filter(voice => voice.category !== 'premade');

					this.sortVoices(voices);

					resolve(voices);
				});
			});
		}
		catch (err) {
			modules.logger.error(err);
			throw err;
		}
	}

	public formatNumber(num: number) {
		return num.toLocaleString(undefined, {
			maximumFractionDigits: 0
		});
	}

	public async fetchSubscriptionData(): Promise<ElevenLabsSubscriptionData> {
		try {
			const subscriptionInfoURL = `${ elevenLabsAPIV1 }/user/subscription`;
			const options = {
				url: subscriptionInfoURL,
				headers: {
					Accept: 'application/json',
					'xi-api-key': this.apiKey
				}
			};

			return new Promise((resolve, reject) => {
				// @ts-ignore
				modules.request.get(options, (err, res, body) => {
					if (err) {
						modules.logger.error(err);
						reject(err);

						return;
					}

					const subData: ElevenLabsSubscriptionData = JSON.parse(body);

					subData.character_count_formatted = this.formatNumber(subData.character_count);
					subData.character_limit_formatted = this.formatNumber(subData.character_limit);
					subData.character_usage_percentage = Math.floor(
						(subData.character_count / subData.character_limit) * 100
					);
					subData.next_reset_date_formatted = new Date(
						subData.next_character_count_reset_unix * 1000
					).toLocaleString();

					resolve(subData);
				});
			});
		}
		catch (err) {
			modules.logger.error(err);
			throw err;
		}
	}
}
