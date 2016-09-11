'use strict';

import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';
import * as JSZip from 'jszip';

export class JarContentProvider implements vscode.TextDocumentContentProvider {

    public provideTextDocumentContent(uri: vscode.Uri, token: vscode.CancellationToken): Thenable<string> {
        return new Promise<string>((resolve, reject) => {
            let rawPath = uri.path;
            let pathToFileInJar = rawPath.slice(rawPath.search('!/') + 2);
            let pathToJar = rawPath.slice('file:'.length);
            pathToJar = pathToJar.slice(0,pathToJar.search('!'));

            if (os.platform() === 'win32') {
                pathToJar = pathToJar.replace(/\//g, '\\').slice(1);
            }
            
            fs.readFile(pathToJar, (err, data) => {
                let zip = new JSZip();
                zip.loadAsync(data).then((new_zip) => {
                    new_zip.file(pathToFileInJar).async("string").then((value) => {
                        resolve(value);
                    })
                })
            })
        });
    }

}