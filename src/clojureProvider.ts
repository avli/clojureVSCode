'use strinct';

import * as vscode from 'vscode';

import { nREPLClient } from './nreplClient';

/**
 * Base class for Clojure providers.
 */
export class ClojureProvider {

    private context: vscode.ExtensionContext;

    /**
     * @param context Extention context
     */
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Returns nREPL client instance.
     */
    protected getNREPL(): nREPLClient {
        let port: number;
        let host: string;
        port = this.context.workspaceState.get<number>('port');
        host = this.context.workspaceState.get<string>('host');
        return new nREPLClient(port, host);
    }

    /**
     * Returns current namespace.
     *
     * @param text Clojure code snippet
     */
    protected getNamespace(text): string {
        return getNamespace(text);
    }

}

export function getNamespace(text: string): string {
    const m = text.match(/^[\s\t]*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'?([\w\-.]+)[\s\S]*\)[\s\S]*/);
    return m ? m[1] : 'user';
}
