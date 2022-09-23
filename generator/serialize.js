/**
 * Logic and source code for converting machine javascript object
 * to a string that can be written and loaded from a JS file
 */


const { isMetaProperty } = require("../utils");

function EventEmitter() {
    /**
     * Polyfill for node `EventEmitter`
     * Note: should only be run in a browser, as `CustomEvent`
     * isn't available in node < 18
     */
    this.emit = function(evtName, ...detail) {
        const evt = new CustomEvent("transition", { detail });
        self.dispatchEvent(evt);
    }

    this.on = function(evtName, cb) {
        self.addEventListener(evtName, evt => cb(...evt.detail));
    }
}

function impureTransitionSrc(transitionName, nextState, stackVal) {
    /**
     * Transition source code with stack push,
     * e.g. `s1 -[f]a> s2`
     */
    return `'${transitionName}': 
        function() { 
            this.state = '${nextState}'; 
            this.stack.push(${stackVal.split(",").map(el => `'${el}'`).join(",")});
         }`
}

function pureTransitionSrc(transitionName, nextState) {
    /**
     * Transition source code without stack push,
     * e.g. `s1 -f> s2`
     */
    return `'${transitionName}': 
        function() { 
            this.state = '${nextState}'; 
        }`;
}

function makeTransitionSrc(transitionName, nextState, stackVal) {
    return stackVal
        ? impureTransitionSrc(transitionName, nextState, stackVal)
        : pureTransitionSrc(transitionName, nextState);

}

function serialize(initial, transitions, transitionsFound, { target, name } = { target: "node" }) {
    if (target === "browser" && !name) {
        throw new Error("`name` property must be defined when `target` property is 'browser'");
    }
    let serialized = `
function BuildError(msg) {
    throw \`FSM build error: \${msg}\`;
}
BuildError.prototype = Error.prototype;

${target === "node" ? "" : EventEmitter.toString()}

const initial = "${initial}";
const transitionsFound = ${JSON.stringify(transitionsFound)};
const fsm = {
    stack: ['Z'], 
    state: ['${initial}'],
    emitter: new EventEmitter(),
    consume: ${this.consume.toString()},
    dispatch: ${this.dispatch.toString()},
    reset: ${this.reset.toString()},
    subscribe: ${this.subscribe.toString()},
    stackIsInitial: ${this.stackIsInitial.toString()},
    transitions: {
`;
    for (const [name, ruleTransitions] of Object.entries(transitions)) {
        const transitionSrc = [];
        for (const key in ruleTransitions) {
            if (!isMetaProperty(key)) {
                const nextState = ruleTransitions[`@@nextState_${key}`];
                const stackVal = ruleTransitions[`@@stackVal_${key}`];
                transitionSrc.push(makeTransitionSrc(key, nextState, stackVal));
            }
        }
        serialized += `${name}: { ${transitionSrc.join(", ")} },\n`;
    }

    serialized += "}\n};"
    serialized += target === "node" ? "\nmodule.exports = fsm;\n" : `\nwindow.${name} = fsm;\n`;

    return serialized;
}
module.exports = { serialize };
