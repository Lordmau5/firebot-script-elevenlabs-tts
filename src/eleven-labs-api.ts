// import fetch from 'node-fetch';
// import axios from "axios";
import * as fs from 'fs-extra';
import {modules} from "./main";

const elevenLabsAPIV1 = "https://api.elevenlabs.io/v1";

export default class ElevenLabs {
    apiKey: string;
    voiceId: string;

    constructor(options = {
        apiKey: "",
        voiceId: ""
    }) {
        this.apiKey = options.apiKey ? options.apiKey : "";
        this.voiceId = options.voiceId ? options.voiceId : "pNInz6obpgDQGcFmaJgB"; // Default voice 'Adam'

        if (this.apiKey === "") {
            console.log("ERR: Missing API key");
            return;
        }
    }

    async textToSpeech({
        voiceId,
        fileName,
        textInput,
        stability,
        similarity,
        useTurboModel,
        style,
        speakerBoost
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
                modules.logger.error("ERR: Missing parameter {fileName}");
                return;
            } else if (!textInput) {
                modules.logger.error("ERR: Missing parameter {textInput}");
                return;
            }
    
            const voiceIdValue = voiceId ? voiceId : this.voiceId;
            const voiceURL = `${elevenLabsAPIV1}/text-to-speech/${voiceIdValue}`;
            const stabilityValue = stability ? stability : 0.5;
            const similarityBoostValue = similarity ? similarity : 0.75;
            const styleValue = style ? style : 0;

            const options = {
                url: voiceURL,
                headers: {
                    Accept: 'audio/mpeg',
                    'xi-api-key': this.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textInput,
                    voice_settings: {
                        stability: stabilityValue,
                        similarity_boost: similarityBoostValue,
                        style: styleValue,
                        use_speaker_boost: speakerBoost,
                    },
                    model_id: useTurboModel ? 'eleven_turbo_v2' : 'eleven_multilingual_v2',
                }),
            };

            modules.logger.info('Options', options);

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
                    status: "ok",
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
}