import * as vscode from 'vscode';

import { CLOJURE_MODE, LANGUAGE } from './clojureMode';
import { ClojureCompletionItemProvider } from './clojureSuggest';
import {
    clojureEval, clojureEvalAndShowResult, testNamespace, runAllTests,
    clearInlineResultDecorationOnMove
} from './clojureEval';
import { ClojureDefinitionProvider } from './clojureDefinition';
import { ClojureLanguageConfiguration } from './clojureConfiguration';
import { ClojureHoverProvider } from './clojureHover';
import { ClojureSignatureProvider } from './clojureSignature';
import { JarContentProvider } from './jarContentProvider';
import { nreplController } from './nreplController';
import { cljConnection } from './cljConnection';
import { ClojureRangeFormattingEditProvider, maybeActivateFormatOnSave } from './clojureFormat';

import { buildTestProvider } from './testRunner'

export function activate(context: vscode.ExtensionContext) {
    cljConnection.setCljContext(context);
    context.subscriptions.push(nreplController);
    cljConnection.disconnect(false);
    var config = vscode.workspace.getConfiguration('clojureVSCode');
    if (config.autoStartNRepl) {
        cljConnection.startNRepl();
    }

    maybeActivateFormatOnSave();

    const testResultDataProvidier = buildTestProvider();

    vscode.commands.registerCommand('clojureVSCode.manuallyConnectToNRepl', cljConnection.manuallyConnect);
    vscode.commands.registerCommand('clojureVSCode.stopDisconnectNRepl', cljConnection.disconnect);
    vscode.commands.registerCommand('clojureVSCode.startNRepl', cljConnection.startNRepl);

    const evaluationResultChannel = vscode.window.createOutputChannel('Evaluation results');
    vscode.commands.registerCommand('clojureVSCode.eval', () => clojureEval(evaluationResultChannel));
    vscode.commands.registerCommand('clojureVSCode.evalAndShowResult', () => clojureEvalAndShowResult(evaluationResultChannel));

    vscode.commands.registerCommand('clojureVSCode.testNamespace', () => testNamespace(evaluationResultChannel, testResultDataProvidier));
    vscode.commands.registerCommand('clojureVSCode.runAllTests', () => runAllTests(evaluationResultChannel, testResultDataProvidier));
    vscode.window.registerTreeDataProvider('clojure', testResultDataProvidier);

    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider(CLOJURE_MODE, new ClojureRangeFormattingEditProvider()));

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(), '.', '/'));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(CLOJURE_MODE, new ClojureDefinitionProvider()));
    context.subscriptions.push(vscode.languages.registerHoverProvider(CLOJURE_MODE, new ClojureHoverProvider()));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(CLOJURE_MODE, new ClojureSignatureProvider(), ' ', '\n'));

    vscode.workspace.registerTextDocumentContentProvider('jar', new JarContentProvider());
    vscode.languages.setLanguageConfiguration(LANGUAGE, ClojureLanguageConfiguration);

    // events
    vscode.window.onDidChangeTextEditorSelection(event => {
        clearInlineResultDecorationOnMove(event);
    }, null, context.subscriptions);
}

export function deactivate() { }
