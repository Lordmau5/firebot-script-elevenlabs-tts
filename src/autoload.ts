import { EventSource } from "@crowbartools/firebot-custom-scripts-types/types/modules/event-manager";
import { ScriptModules } from "@crowbartools/firebot-custom-scripts-types";

export function autoload(modules: ScriptModules, eventSource: EventSource) {
    // System Commands
    load(
        require.context("./", true, /\.command\.ts$/),
        (command) => modules.commandManager.registerSystemCommand(command)
    );
    // Conditions (Conditional Effect)
    load(
        require.context("./", true, /\.condition\.ts$/),
        (condition) => modules.conditionManager.registerConditionType(condition)
    );
    // Effects
    load(
        require.context("./", true, /\.effect\.ts$/),
        (effect) => modules.effectManager.registerEffect(effect)
    );
    // Events
    load(
        require.context("./", true, /\.event\.ts$/),
        (event) => eventSource.events.push(event)
    );
    modules.eventManager.registerEventSource(eventSource);
    // Event Filters
    load(
        require.context("./", true, /\.filter\.ts$/),
        (filter) => modules.eventFilterManager.registerFilter(filter)
    );
    // Games
    load(
        require.context("./", true, /\.game\.ts$/),
        (game) => modules.gameManager.registerGame(game)
    );
    // Integrations
    load(
        require.context("./", true, /\.integration\.ts$/),
        (integration) => modules.integrationManager.registerIntegration(integration)
    );
    // Command Restrictions
    load(
        require.context("./", true, /\.restriction\.ts$/),
        (restriction) => modules.restrictionManager.registerRestriction(restriction)
    );
    // Replace Variables
    load(
        require.context("./", true, /\.variable\.ts$/),
        (variable) => modules.replaceVariableManager.registerReplaceVariable(variable)
    );
}

function load(ctx: __WebpackModuleApi.RequireContext, func: ((arg: any) => void)) {
    for (let key of ctx.keys()) {
        func(ctx(key).default);
    }
}