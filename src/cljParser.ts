'use strict';

interface ExpressionInfo {
    functionName: string;
    parameterPosition: number;
}

interface RelativeExpressionInfo {
    startPosition: number;
    parameterPosition: number;
}

const CLJ_TEXT_DELIMITER = `"`;
const CLJ_TEXT_ESCAPE = `\\`;
const CLJ_COMMENT_DELIMITER = `;`;
export const R_CLJ_WHITE_SPACE = /\s|,/;
const R_CLJ_OPERATOR_DELIMITERS = /\s|,|\(|{|\[/;

/** { close_char open_char } */
const CLJ_EXPRESSION_DELIMITERS: Map<string, string> = new Map<string, string>([
    [`}`, `{`],
    [`)`, `(`],
    [`]`, `[`],
    [CLJ_TEXT_DELIMITER, CLJ_TEXT_DELIMITER],
]);

export function getExpressionInfo(text: string): ExpressionInfo {
    text = removeCljComments(text);
    const relativeExpressionInfo = getRelativeExpressionInfo(text);
    if (!relativeExpressionInfo)
        return;

    let functionName = text.substring(relativeExpressionInfo.startPosition + 1); // expression openning ignored
    functionName = functionName.substring(functionName.search(/[^,\s]/)); // trim left
    functionName = functionName.substring(0, functionName.search(R_CLJ_OPERATOR_DELIMITERS)); // trim right according to operator delimiter

    if (!functionName.length)
        return;

    return {
        functionName,
        parameterPosition: relativeExpressionInfo.parameterPosition,
    };
}

function removeCljComments(text: string): string {
    const lines = text.match(/[^\r\n]+/g); // split string by line

    if (lines.length > 1) {
        return lines.map(line => removeCljComments(line)).join(`\n`); // remove comments from each line and concat them again after
    }

    const line = lines[0];
    let uncommentedIndex = line.length;
    let insideString = false;
    for (let i = 0; i < line.length; i++) {
        if (line[i] === CLJ_TEXT_DELIMITER) {
            insideString = !insideString || line[i - 1] === CLJ_TEXT_ESCAPE;
            continue;
        }
        if (line[i] === CLJ_COMMENT_DELIMITER && !insideString) { // ignore comment delimiter inside a string
            uncommentedIndex = i;
            break;
        }
    }

    return line.substring(0, uncommentedIndex);
}

function getRelativeExpressionInfo(text: string, openChar: string = `(`): RelativeExpressionInfo {
    const relativeExpressionInfo: RelativeExpressionInfo = {
        startPosition: text.length - 1,
        parameterPosition: -1,
    };

    let newParameterFound = false;
    while (relativeExpressionInfo.startPosition >= 0) {
        const char = text[relativeExpressionInfo.startPosition];

        // check if found the beginning of the expression (string escape taken care of)
        if (char === openChar && (openChar !== CLJ_TEXT_DELIMITER || (text[relativeExpressionInfo.startPosition - 1] !== CLJ_TEXT_ESCAPE))) {
            if (newParameterFound) // ignore one parameter found if it's actually the function we're looking for
                relativeExpressionInfo.parameterPosition--;
            return relativeExpressionInfo;
        }

        // ignore everything if searching inside a string
        if (openChar === CLJ_TEXT_DELIMITER) {
            relativeExpressionInfo.startPosition--;
            continue;
        }

        // invalid code if a beginning of an expression is found without being searched for
        if (char !== CLJ_TEXT_DELIMITER && containsValue(CLJ_EXPRESSION_DELIMITERS, char))
            return;

        // keep searching if it's white space
        if (R_CLJ_WHITE_SPACE.test(char)) {
            if (!newParameterFound) {
                relativeExpressionInfo.parameterPosition++;
                newParameterFound = true;
            }
            relativeExpressionInfo.startPosition--;
            continue;
        }

        // check for new expressions
        const expressionDelimiter = CLJ_EXPRESSION_DELIMITERS.get(char);
        if (!!expressionDelimiter) {
            const innerExpressionInfo = getRelativeExpressionInfo(text.substring(0, relativeExpressionInfo.startPosition), expressionDelimiter);
            if (!innerExpressionInfo)
                return;

            relativeExpressionInfo.startPosition = innerExpressionInfo.startPosition - 1;
            relativeExpressionInfo.parameterPosition++;
            newParameterFound = true;
            continue;
        }

        newParameterFound = false;
        relativeExpressionInfo.startPosition--;
    }

    return; // reached the beginning of the text without finding the start of the expression
}

function containsValue(map: Map<any, any>, checkValue: any): boolean {
    for (let value of map.values()) {
        if (value === checkValue)
            return true;
    }
    return false;
}
