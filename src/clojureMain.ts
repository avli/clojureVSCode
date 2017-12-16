import * as vscode from 'vscode';

import { CLOJURE_MODE } from './clojureMode';
import { ClojureCompletionItemProvider } from './clojureSuggest';
import { clojureEval, clojureEvalAndShowResult } from './clojureEval';
import { ClojureDefinitionProvider } from './clojureDefinition';
import { ClojureLanguageConfiguration } from './clojureConfiguration';
import { ClojureHoverProvider } from './clojureHover';
import { ClojureSignatureProvider } from './clojureSignature';
import { JarContentProvider } from './jarContentProvider';
import { nreplController } from './nreplController';
import { cljConnection } from './cljConnection';
import { formatFile, maybeActivateFormatOnSave } from './clojureFormat';
import { reloadNamespaceCommand, getReloadOnFileSave } from './clojureReloadNamespace';

export function activate(context: vscode.ExtensionContext) {
    cljConnection.setCljContext(context);
    context.subscriptions.push(nreplController);
    cljConnection.disconnect(false);
    var config = vscode.workspace.getConfiguration('clojureVSCode');    
    if (config.autoStartNRepl) {
        cljConnection.startNRepl();
    }

    maybeActivateFormatOnSave();
    
    vscode.commands.registerCommand('clojureVSCode.manuallyConnectToNRepl', cljConnection.manuallyConnect);
    vscode.commands.registerCommand('clojureVSCode.stopDisconnectNRepl', cljConnection.disconnect);
    vscode.commands.registerCommand('clojureVSCode.startNRepl', cljConnection.startNRepl);

    const evaluationResultChannel = vscode.window.createOutputChannel('Evaluation results');
    vscode.commands.registerCommand('clojureVSCode.eval', () => clojureEval(evaluationResultChannel));
    vscode.commands.registerCommand('clojureVSCode.evalAndShowResult', () => clojureEvalAndShowResult(evaluationResultChannel));
    vscode.commands.registerTextEditorCommand('clojureVSCode.formatFile', formatFile);
    vscode.commands.registerTextEditorCommand('clojureVSCode.reloadNamespace', ()=> { reloadNamespaceCommand(evaluationResultChannel); });
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider(CLOJURE_MODE, new ClojureCompletionItemProvider(), '.', '/'));
    context.subscriptions.push(vscode.languages.registerDefinitionProvider(CLOJURE_MODE, new ClojureDefinitionProvider()));
    context.subscriptions.push(vscode.languages.registerHoverProvider(CLOJURE_MODE, new ClojureHoverProvider()));
    context.subscriptions.push(vscode.languages.registerSignatureHelpProvider(CLOJURE_MODE, new ClojureSignatureProvider(), ' ', '\n'));

    vscode.workspace.registerTextDocumentContentProvider('jar', new JarContentProvider());
    vscode.languages.setLanguageConfiguration(CLOJURE_MODE.language, new ClojureLanguageConfiguration());
    
    if(getReloadOnFileSave()) {
        vscode.workspace.onDidSaveTextDocument(
            function (textDocument: vscode.TextDocument) {              
                reloadNamespaceCommand(evaluationResultChannel);
            }, this);
    }
}

export function deactivate() { }
