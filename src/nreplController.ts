import 'process';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import * as spawn from 'cross-spawn';
import { ChildProcess, exec } from 'child_process';

import { CljConnectionInformation } from './cljConnection';

const config = vscode.workspace.getConfiguration('clojureVSCode');

const LEIN_ARGS: string[] = [
    'update-in',
    ':dependencies',
    'conj',
    `[cljfmt "${config.cljfmtVersion}"]`,
    '--',
    'update-in',
    ':plugins',
    'conj',
    `[cider/cider-nrepl "${config.ciderNReplVersion}"]`,
    '--',
    'repl',
    ':headless'
];

const R_NREPL_CONNECTION_INFO = /nrepl:\/\/(.*?:.*?(?=[\n\r]))/;

let nreplProcess: ChildProcess | null

const isStarted = () => !!nreplProcess;

// Create a channel in the Output window so that the user
// can view output from the nREPL session.
const nreplChannel = vscode.window.createOutputChannel('nREPL');

const start = (): Promise<CljConnectionInformation> => {
    if (isStarted())
        return Promise.reject({ nreplError: 'nREPL already started.' });

    // Clear any output from previous nREPL sessions to help users focus
    // on the current session only.
    nreplChannel.clear();

    return new Promise((resolve, reject) => {

        nreplProcess = spawn('lein', LEIN_ARGS, {
            cwd: getCwd(), // see the `getCwd` function documentation!
            detached: !(os.platform() === 'win32')
        });

        nreplProcess.stdout.addListener('data', data => {
            const nreplConnectionMatch = data.toString().match(R_NREPL_CONNECTION_INFO);
            // Send any stdout messages to the output channel
            nreplChannel.append(data.toString());

            if (nreplConnectionMatch && nreplConnectionMatch[1]) {
                const [host, port] = nreplConnectionMatch[1].split(':');
                return resolve({ host, port: Number.parseInt(port) });
            }
        });

        nreplProcess.stderr.on('data', data => {
            // Send any stderr messages to the output channel
            nreplChannel.append(data.toString());
        });

        nreplProcess.on('exit', (code) => {
            // nREPL process has exited before we were able to read a host / port.
            const message = `nREPL exited with code ${code}`
            nreplChannel.appendLine(message);
            // Bring the output channel to the foreground so that the user can
            // use the output to debug the problem.
            nreplChannel.show();
            return reject({ nreplError: message});
        });
    });
};

const stop = () => {
    if (nreplProcess) {
        // Workaround http://azimi.me/2014/12/31/kill-child_process-node-js.html
        nreplProcess.removeAllListeners();

        try {
            // Killing the process will throw an error `kill ESRCH` this method
            // is invoked after the nREPL process has exited. This happens when
            // we try to gracefully  clean up after spawning the nREPL fails.
            // We wrap the killing code in `try/catch` to handle this.
            if(os.platform() === 'win32'){
                exec('taskkill /pid ' + nreplProcess.pid + ' /T /F')
            }
            else {
                process.kill(-nreplProcess.pid);
            }
        } catch (exception) {
            console.error("Error cleaning up nREPL process", exception);
        }

        nreplProcess = null;
    }
};

const dispose = stop;

/**
 * It's important to set the current working directory parameter when spawning
 * the nREPL process. Without the parameter been set, it can take quite a long
 * period of time for the nREPL to start accepting commands. This most likely
 * the result of one of the plugins we use doing something with the file
 * system (first time I've seen it, I was surprised why VSCode and Java
 * constantly asking for the permissions to access folders in my home directory).
 */
const getCwd = () => {
    let cwd = vscode.workspace.rootPath;

    if (cwd) return cwd;

    // Try to get folder name from the active editor.
    const document = vscode.window.activeTextEditor?.document;

    if (!document) return;

    return path.dirname(document.fileName);
}

export const nreplController = {
    start,
    stop,
    isStarted,
    dispose,
};
