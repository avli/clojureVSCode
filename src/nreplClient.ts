'use strict';

import * as net from 'net';
import {Buffer} from 'buffer';
import * as Bencoder from 'bencoder';

export interface nREPLCompleteMessage {
    op: string;
    symbol: string;
    ns?: string
}

export class nREPLClient {

    public host: string;
    public port: number;

    public constructor(host: string, port: number) {
        this.host = host;
        this.port = port;
    }

    public complete(symbol: string, callback) {
        let client = net.createConnection(this.port, this.host);
        let nreplResp = new Buffer('');
        client.on('connect', () => {
            let msg: nREPLCompleteMessage = {op: 'complete', symbol: symbol};
            let encodedMsg = Bencoder.encode(msg);
            client.write(encodedMsg.toString());
        });
        client.on('data', (data) => {
            try {
                nreplResp = Buffer.concat([nreplResp, data]);
                let completions = Bencoder.decode(nreplResp);
                callback(completions);
            } catch (error) {
                // waiting for the rest of the response
            }
        });
    }
}