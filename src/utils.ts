import * as vscode from 'vscode';

export function readBooleanConfiguration(configName) {    
    let editorConfig = vscode.workspace.getConfiguration('editor');
    const globalEditorConfig = editorConfig && editorConfig.has(configName) && editorConfig.get(configName) === true;
    let clojureConfig = vscode.workspace.getConfiguration('clojureVSCode');
    return ((clojureConfig[configName] || globalEditorConfig));
}