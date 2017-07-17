import * as bencoder from 'bencoder';

const CONTINUATION_ERROR_MESSAGE: string = "Unexpected continuation: \"";

interface DecodedResult {
    decodedObjects: any[];
    rest: Buffer;
}

export function encode(msg: any): Buffer {
    return bencoder.encode(msg);
}

/*
    receives a buffer and returns an array of decoded objects and the remaining unused buffer
*/
export function decodeObjects(buffer: Buffer): DecodedResult {
    const decodedResult: DecodedResult = { decodedObjects: [], rest: buffer };
    return decode(decodedResult);
}

function decode(decodedResult: DecodedResult): DecodedResult {
    if (decodedResult.rest.length === 0)
        return decodedResult;

    try {
        const decodedObj = bencoder.decode(decodedResult.rest);
        decodedResult.decodedObjects.push(decodedObj);
        decodedResult.rest = Buffer.from('');
        return decodedResult;
    } catch (error) {
        const errorMessage: string = error.message;
        if (!!errorMessage && errorMessage.startsWith(CONTINUATION_ERROR_MESSAGE)) {
            const unexpectedContinuation: string = errorMessage.slice(CONTINUATION_ERROR_MESSAGE.length, errorMessage.length - 1);

            const rest = decodedResult.rest;
            const encodedObj = rest.slice(0, rest.length - unexpectedContinuation.length);

            decodedResult.decodedObjects.push(bencoder.decode(encodedObj));
            decodedResult.rest = Buffer.from(unexpectedContinuation);

            return decode(decodedResult);
        } else {
            return decodedResult;
        }
    }
}
