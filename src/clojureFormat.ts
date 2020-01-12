import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { nreplClient } from './nreplClient';

function slashEscape(contents: string) {
    return contents
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
}

function slashUnescape(contents: string) {
    const replacements : { [key: string]: string} = { '\\\\': '\\', '\\n': '\n', '\\"': '"' };
    return contents.replace(/\\(\\|n|")/g, function(match) {
        return replacements[match]
    });
}


export const formatFile = (document: vscode.TextDocument, range: vscode.Range): Promise<vscode.TextEdit[] | undefined> => {

    if (!cljConnection.isConnected()) {
        return Promise.reject("Formatting functions don't work, connect to nREPL first.");
    }

    let contents: string = document.getText(range);

    // Escaping the string before sending it to nREPL
    contents = slashEscape(contents)


    let cljfmtParams = vscode.workspace.getConfiguration('clojureVSCode').cljfmtParameters;
    cljfmtParams = cljfmtParams.isEmpty ? "nil" : "{"+cljfmtParams+"}";


    // Running "(require 'cljfmt.core)" in right after we have checked we are connected to nREPL
    // would be a better option but in this case "cljfmt.core/reformat-string" fails the first
    // time it is called. I have no idea what causes this behavior so I decided to put the require
    // statement right here - don't think it does any harm. If someone knows how to fix it
    // please send a pull request with a fix.
    return nreplClient.evaluate(`(require 'cljfmt.core) (cljfmt.core/reformat-string "${contents}" ${cljfmtParams})`)
        .then(value => {
            if ('ex' in value[0]) {
                return Promise.reject(value[1].err);
            };
            if (('value' in value[1]) && (value[1].value != 'nil')) {
                let new_content: string = value[1].value.slice(1, -1);
                new_content = slashUnescape(new_content);
                return Promise.resolve([vscode.TextEdit.replace(range, new_content)]);
            };
        });
}


export const maybeActivateFormatOnSave = () => {
    vscode.workspace.onWillSaveTextDocument(e => {
        const document = e.document;
        if (document.languageId !== "clojure") {
            return;
        }
        let textEditor = vscode.window.activeTextEditor;
        if (!textEditor || textEditor.document.isClosed) {
            return
        }
        let editorConfig = vscode.workspace.getConfiguration('editor');
        const globalEditorFormatOnSave = editorConfig && editorConfig.has('formatOnSave') && editorConfig.get('formatOnSave') === true,
            clojureConfig = vscode.workspace.getConfiguration('clojureVSCode'),
            currentText = textEditor.document.getText(),
            lastLine = textEditor.document.lineCount - 1,
            lastPosition = textEditor.document.lineAt(lastLine).range.end,
            range = new vscode.Range(new vscode.Position(0, 0), lastPosition);

        if ((clojureConfig.formatOnSave || globalEditorFormatOnSave) && textEditor.document === document) {
            formatFile(textEditor.document, range).then(value => {
                if (textEditor && value && currentText != value[0].newText) {
                    textEditor.edit(editBuilder => {
                        editBuilder.replace(range, value[0].newText);
                    });
                }
            }).catch(reason => {
                vscode.window.showErrorMessage(reason);
            });
        }
    });
}


export class ClojureRangeFormattingEditProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken): vscode.ProviderResult<vscode.TextEdit[]> {

        return formatFile(document, range);
    }
}
