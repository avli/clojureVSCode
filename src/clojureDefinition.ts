import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

export class ClojureDefinitionProvider implements vscode.DefinitionProvider {

    provideDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.Definition> {
        if (!cljConnection.isConnected())
            return Promise.reject('No nREPL connected.');

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return Promise.reject('No word selected.');

        const currentWord: string = document.lineAt(position.line).text.slice(wordRange.start.character, wordRange.end.character);
        const ns = cljParser.getNamespace(document.getText());

        return nreplClient.info(currentWord, ns).then(info => {
            if (!info.file)
                return Promise.reject('No word definition found.');

            let uri = vscode.Uri.parse(info.file);
            let pos = new vscode.Position(info.line - 1, info.column)
            let definition = new vscode.Location(uri, pos);
            return Promise.resolve(definition);
        });
    }

}
