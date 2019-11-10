import { ISuiteCallbackContext } from "mocha";

const LONG_TIMEOUT: number = 5000;

/**
 * Some functional tests that run the editor may require longer time to finish
 * than the default Mocha's timeout. Been called from a test suite body, this
 * helper increases the timeout to {@link LONG_TIMEOUT}.
 *
 * @param suite: A test suite instance.
 */
export const setLongTimeout = (
    suite: Mocha.IContextDefinition | ISuiteCallbackContext): void => {
    suite.timeout(LONG_TIMEOUT);
}
