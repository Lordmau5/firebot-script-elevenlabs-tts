import { Firebot, ScriptModules } from '@crowbartools/firebot-custom-scripts-types';
import { autoload } from './autoload';
import { EventSource } from '@crowbartools/firebot-custom-scripts-types/types/modules/event-manager';
import { FirebotSettings } from '@crowbartools/firebot-custom-scripts-types/types/settings';

interface Params {
  api_key: string;
  default_voice: string;
}

const script: Firebot.CustomScript<Params> = {
  getScriptManifest: () => {
    return {
      name: 'ElevenLabs TTS',
      description: 'A custom script that allows ElevenLabs TTS to be used in Firebot',
      author: 'Lordmau5',
      version: '1.1',
      firebotVersion: '5',
    };
  },
  getDefaultParameters: () => {
    return {
      api_key: {
        type: 'string',
        default: '',
        description: 'Your ElevenLabs API key',
        showBottomHr: true,
      },
      default_voice: {
        type: 'string',
        default: '',
        description: 'The default voice ID to use',
        secondaryDescription: 'To get a list of available voice IDs visit the ElevenLabs API documentation: https://api.elevenlabs.io/docs/voices',
        showBottomHr: true,
      },
    };
  },
  parametersUpdated: async (params) => {
    parameters = params;
  },
  run: async (runRequest) => {
    const eventSource: EventSource = {
      id: 'elevenlabs-tts',
      name: 'ElevenLabs TTS',
      events: []
    };
    autoload(runRequest.modules, eventSource);
    modules = runRequest.modules;
    settings = runRequest.firebot.settings;
    parameters = runRequest.parameters;
  }
};

export let parameters: Params;

export let modules: ScriptModules;

export let settings: FirebotSettings;

export const tts_promises: Map<string, Promise<any>> = new Map();

export default script;
