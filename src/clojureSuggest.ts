import * as vscode from 'vscode';
import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

const mappings: {
    [key: string]: vscode.CompletionItemKind
} = {
        'nil': vscode.CompletionItemKind.Value,
        'macro': vscode.CompletionItemKind.Value,
        'class': vscode.CompletionItemKind.Class,
        'keyword': vscode.CompletionItemKind.Keyword,
        'namespace': vscode.CompletionItemKind.Module,
        'function': vscode.CompletionItemKind.Function,
        'special-form': vscode.CompletionItemKind.Keyword,
        'var': vscode.CompletionItemKind.Variable,
        'method': vscode.CompletionItemKind.Method,
    }

export class ClojureCompletionItemProvider implements vscode.CompletionItemProvider {

    public provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Thenable<vscode.CompletionList> {
        if (!cljConnection.isConnected())
            return Promise.reject('No nREPL connected.');

        const wordRange = document.getWordRangeAtPosition(position);
        if (!wordRange)
            return Promise.reject('No word selected.');

        const line = document.lineAt(position.line),
              currentWord = line.text.slice(wordRange.start.character, wordRange.end.character),
              ns = cljParser.getNamespace(document.getText());

        let buildInsertText = (suggestion: string) => {
            return suggestion[0] === '.' ? suggestion.slice(1) : suggestion;
        }

        return nreplClient.complete(currentWord, ns).then(completions => {
            if (!('completions' in completions))
                return Promise.reject(undefined);

            let suggestions = completions.completions.map((element: any) => ({
                label: element.candidate,
                kind: mappings[element.type] || vscode.CompletionItemKind.Text,
                insertText: buildInsertText(element.candidate)
            }));
            let completionList: vscode.CompletionList = new vscode.CompletionList(suggestions, false);
            return Promise.resolve(completionList);
        });
    }

    public resolveCompletionItem(item: vscode.CompletionItem, token: vscode.CancellationToken): Thenable<vscode.CompletionItem> {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return Promise.reject("No active editor");
        }
        let document = editor.document;
        let ns = cljParser.getNamespace(document.getText());
        return nreplClient.info(item.label, ns).then(info => {
            item.documentation = info.doc;
            return Promise.resolve(item);
        });
    }

}
