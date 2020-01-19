import * as assert from 'assert';
import { decodeBuffer } from '../src/bencodeUtil';

interface DecodedResult {
    decodedObjects: any[];
    rest: Buffer;
    isDone: boolean;
}

function decodeMessages(messages: string[]): DecodedResult {
    let nreplResp = Buffer.from(''),
        isDone = false;
    const respObjects: any[] = [];

    messages.forEach(item => {
        nreplResp = Buffer.concat([nreplResp, Buffer.from(item)]);
        const response = decodeBuffer(nreplResp);
        nreplResp = response.rest;
        isDone = response.isDone;
        respObjects.push(...response.decodedObjects);
    });

    return { decodedObjects: respObjects, rest: nreplResp, isDone: isDone };
}

suite('bencodeUtil.decodeBuffer', function () {
    test('create new session', () => {
        const input = Buffer.from(
            'd11:new-session36:58d1e5dc-c717-4864-bf49-e7750ced6f28'
            + '7:session36:7fcd096b-4ee4-4142-bb6b-6fc09e5c41606:statusl4:doneee'),
            expected = {
                'new-session': '58d1e5dc-c717-4864-bf49-e7750ced6f28',
                'session': '7fcd096b-4ee4-4142-bb6b-6fc09e5c4160',
                'status': ['done']
            },
            result = decodeBuffer(input);
        assert.ok(result.isDone);
        assert.deepEqual(result.decodedObjects, [expected]);
        assert.equal(result.rest.length, 0);
    });

    test('close session', () => {
        const input = Buffer.from(
            'd7:session36:9968ec29-b87d-4e1f-8444-076280357dd36:statusl4:done14:session-closedee'),
            expected = {
                'session': '9968ec29-b87d-4e1f-8444-076280357dd3',
                'status': ['done', 'session-closed']
            },
            result = decodeBuffer(input);
        assert.ok(result.isDone);
        assert.deepEqual(result.decodedObjects, [expected]);
        assert.equal(result.rest.length, 0);
    });

    test('completion candidates', () => {
        const input = Buffer.from(
            'd11:completionsld9:candidate5:slurp2:ns12:clojure.core4:type8:functioned'
            + '9:candidate14:slingshot.test4:type9:namespaceed9:candidate'
            + '17:slingshot.support4:type9:namespaceed9:candidate19:slingshot.slingshot'
            + '4:type9:namespaceee7:session36:4d32206b-5161-40d2-a4e7-d1be6ec777756:statusl4:doneee'),
            expected = {
                'session': '4d32206b-5161-40d2-a4e7-d1be6ec77775',
                'completions': [
                    {
                        'candidate': 'slurp',
                        'ns': 'clojure.core',
                        'type': 'function'
                    },
                    {
                        'candidate': 'slingshot.test',
                        'type': 'namespace'
                    },
                    {
                        'candidate': 'slingshot.support',
                        'type': 'namespace'
                    },
                    {
                        'candidate': 'slingshot.slingshot',
                        'type': 'namespace'
                    },
                ],
                'status': ['done']
            },
            result = decodeBuffer(input);
        assert.ok(result.isDone);
        assert.deepEqual(result.decodedObjects, [expected]);
        assert.equal(result.rest.length, 0);
    });

    test('eval simple printing expression', () => {
        const messages = [
            'd3:out7:"test"\n7:session36:9968ec29-b87d-4e1f-8444-076280357dd3e',
            'd7:session36:9968ec29-b87d-4e1f-8444-076280357dd35:value3:niled'
            + '7:session36:9968ec29-b87d-4e1f-8444-076280357dd36:statusl4:doneee'
            + '18:changed-namespacesd13:cheshire.cored7:aliasesd7:factory16:cheshire.factory'
            + '3:gen17:cheshire.generate7:gen-seq21:cheshire.generate-seq5:parse14:cheshire.parsee'
            + '7:internsd11:*generator*de9:*opt-map*de13:copy-arglistsd8:arglists11:([dst'
        ],
            expectedOut = {
                'session': '9968ec29-b87d-4e1f-8444-076280357dd3',
                'out': '"test"\n',
            },
            result = decodeMessages(messages);
        assert.equal(result.decodedObjects.length, 3);
        assert.deepEqual(result.decodedObjects[0], expectedOut);
        assert.ok(result.isDone);
        assert.notEqual(result.rest.length, 0);
    });

    test('eval expression with result divided by multiple messages', () => {
        const messages = [
            'd7:session36:9968ec29-b87d-4e1f-8444-076280357dd35:value184:'
            + 'Lorem ipsum dolor sit amet, consectetur adipiscing e',
            'lit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
            ' Ipsum dolor sit amet consectetur adipiscing elit ut aliquam.e'
            + 'd7:session36:9968ec29-b87d-4e1f-8444-076280357dd36:statusl4:doneee'
        ],
            expectedWithValue = {
                'session': '9968ec29-b87d-4e1f-8444-076280357dd3',
                'value': 'Lorem ipsum dolor sit amet, consectetur adipiscing e'
                    + 'lit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.'
                    + ' Ipsum dolor sit amet consectetur adipiscing elit ut aliquam.'
            },
            expectedWithDone = {
                'session': '9968ec29-b87d-4e1f-8444-076280357dd3',
                'status': ['done']
            },
            result = decodeMessages(messages);
        assert.equal(result.decodedObjects.length, 2);
        assert.deepEqual(result.decodedObjects[0], expectedWithValue);
        assert.deepEqual(result.decodedObjects[1], expectedWithDone);
        assert.ok(result.isDone);
        assert.equal(result.rest.length, 0);
    });
});
