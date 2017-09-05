import * as vscode from 'vscode';

import { cljConnection } from './cljConnection';
import { cljParser } from './cljParser';
import { nreplClient } from './nreplClient';

function slashEscape(contents: string) {
    return contents
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n');
    }

function slashUnescape(contents: string) {
    const replacements = {'\\\\': '\\', '\\n': '\n', '\\"': '"'};
    return contents.replace(/\\(\\|n|")/g, function(match) {
        return replacements[match];
    });
}

export const formatFile = (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit): void => {

    if (!cljConnection.isConnected()) {
        vscode.window.showErrorMessage("Formatting functions don't work, connect to nREPL first.");
        return;
    }

    const selection = textEditor.selection;
    let contents: string = selection.isEmpty ? textEditor.document.getText() : textEditor.document.getText(selection);

    // Escaping the string before sending it to nREPL
    contents = slashEscape(contents)

    // Running "(require 'cljfmt.core)" in right after we have checked we are connected to nREPL
    // would be a better option but in this case "cljfmt.core/reformat-string" fails the first
    // time it is called. I have no idea what causes this behavior so I decided to put the require
    // statement right here - don't think it does any harm. If someone knows how to fix it
    // please send a pull request with a fix.
    nreplClient.evaluate(`(require 'cljfmt.core) (cljfmt.core/reformat-string "${contents}" nil)`)
        .then(value => {
            if ('ex' in value[0]) {
                vscode.window.showErrorMessage(value[1].err);
                return;
            };
            if (('value' in value[1]) && (value[1].value != 'nil')) {
                let new_content: string = value[1].value.slice(1, -1);
                new_content = slashUnescape(new_content);
                let selection = textEditor.selection;
                if (textEditor.selection.isEmpty) {
                    const lines: string[] = textEditor.document.getText().split(/\r?\n/g);
                    const lastChar: number = lines[lines.length - 1].length;
                    selection = new vscode.Selection(new vscode.Position(0, 0), new vscode.Position(textEditor.document.lineCount, lastChar));
                }
                textEditor.edit(editBuilder => {
                    editBuilder.replace(selection, new_content);
                });
            };
        });
}
