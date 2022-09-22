const { isMetaProperty } = require("../utils");

function impureTransitionSrc(transitionName, nextState, stackVal) {
    return `'${transitionName}': 
        function() { 
            this.state = '${nextState}'; 
            this.stack.push(${stackVal.split(",").map(el => `'${el}'`).join(",")});
         }`
}

function pureTransitionSrc(transitionName, nextState) {
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

function serialize(initial, transitions) {
    let serialized = `
function BuildError(msg) {
    throw \`FSM build error: \${msg}\`;
}
BuildError.prototype = Error.prototype;

const initial = "${initial}";
const fsm = {
    stack: ['Z'], 
    state: ['${initial}'],
    consume: ${this.consume.toString()},
    dispatch: ${this.dispatch.toString()},
    reset: ${this.reset.toString()},
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
    serialized += "\nmodule.exports = fsm;\n";

    return serialized;
}
module.exports = { serialize };
