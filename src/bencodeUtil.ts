import * as bencoder from 'bencoder';

interface DecodedResult {
    decodedObjects: any[];
    rest: Buffer;
    isDone: boolean;
}

interface Message {
    msg: any;
    buffer: Buffer;
    msgLen: number;
}

const CONTINUATION_ERROR_MESSAGE: string = "Unexpected continuation: \"";
const BENCODE_END_SYMBOL = 0x65;  // `e`
const VALUE_LENGTH_REGEXP = /\:(?<name>value|out)(?<len>\d+)\:/m;

export function encode(msg: any): Buffer {
    return bencoder.encode(msg);
}

function isMessageIncomplete(message: Message): boolean {
    const lastByte = message.buffer[message.buffer.length - 1],
        matched = message.buffer.toString().match(VALUE_LENGTH_REGEXP),
        // @ts-ignore: target es6 doesn't support `groups` in RegExpMatchArray
        { groups: { len, name } = {} } = matched || {},
        requiredLength = len ? Number.parseInt(len) : null,
        isLengthInvalid = name in message.msg
            && requiredLength !== null
            // check length of parsed message
            && message.msg[name].length < requiredLength;

    // message's length is valid and the end symbol is presented
    return isLengthInvalid || lastByte !== BENCODE_END_SYMBOL;
}

function decodeNextMessage(data: Buffer): Message {
    let message: Message = { msg: null, buffer: data, msgLen: data.length };

    while (!message.msg) {
        try {
            message.msg = bencoder.decode(message.buffer.slice(0, message.msgLen));

            const isWholeBufferParsed = message.msgLen === message.buffer.length;
            if (isWholeBufferParsed && isMessageIncomplete(message)) {
                message.msg = null;
                break;
            }
        } catch (error) {
            if (!!error.message && error.message.startsWith(CONTINUATION_ERROR_MESSAGE)) {
                const unexpectedContinuation: string = error.message.slice(CONTINUATION_ERROR_MESSAGE.length,
                    error.message.length - 1);
                message.msgLen -= unexpectedContinuation.length;
            } else {
                console.log("Unexpected output decoding error.");
                break;
            }
        }
    }

    return message;
}

/*
    receives a buffer and returns an array of decoded objects and the remaining unused buffer
*/
export function decodeBuffer(data: Buffer): DecodedResult {
    let result: DecodedResult = { decodedObjects: [], rest: data, isDone: false };

    while (result.rest.length > 0) {
        const message = decodeNextMessage(result.rest);
        if (!message.msg) {
            break;
        }

        result.decodedObjects.push(message.msg);
        result.rest = result.rest.slice(message.msgLen, result.rest.length);

        if (message.msg.status && message.msg.status.indexOf('done') > -1) {
            result.isDone = true;
            break;
        }
    }

    return result;
}
