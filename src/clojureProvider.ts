'use strinct';

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
    nREPLClient
} from './nreplClient';

/**
 * Base class for Clojure providers.
 */
export class ClojureProvider {

    private port: number;
    private host: string;

    /**
     * @param port nREPL port
     * @param host nREPL host
     */
    constructor(port: number, host?: string) {
        this.port = port;
        this.host = host || '127.0.0.1';
    }

    /**
     * Returns nREPL client instance.
     */
    protected getNREPL(): nREPLClient {
        return new nREPLClient(this.host, this.port);
    }

    /**
     * Returns current namespace.
     *
     * @param text Clojure code snippet
     */
    protected getNamespace(text): string {
        let m = text.match(/^.*\((?:[\s\t\n]*(?:in-){0,1}ns)[\s\t\n]+'?(\w+)[\s\S]*\)[\s\S]*/);
        return m ? m[1] : 'user';
    }
}