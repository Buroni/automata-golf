/**
 * Logic and source code for converting machine javascript object
 * to a string that can be written and loaded from a JS file
 */

function makeTransitionSrc(transition, nextState) {
    const transitionAction = transition.input;

    let fnStr = `this.state = '${nextState}';\n`;

    if (transitionAction !== "_") {
        fnStr += "this.input.shift();\n";
    }

    for (let i = 0; i < transition.stacks?.length || 0; i++) {
        if (transition.stacks[i].read !== "_") {
            fnStr += `this.stacks[${i}].pop();\n`;
        }
        const stackVal = transition.stacks[i].write;
        if (stackVal) {
            fnStr += `this.stacks[${i}].push("${stackVal}");`;
        }
    }
    fnStr += "console.log(this.input, this.stacks)";
    return fnStr;
}

function makeTransitionFunction(transitionName, nextState, stackVal) {
    const fnStr = makeTransitionSrc(transitionName, nextState, stackVal);
    return new Function(fnStr);
}

function serialize(
    initial,
    transitions,
    transitionsFound,
    acceptStates,
    { target, name } = { target: "node" }
) {
    if (target === "browser" && !name) {
        throw new Error(
            "`name` property must be defined when `target` property is 'browser'"
        );
    }
    let serialized = `
const initial = "${initial}";
const fsm = {
    stack: [], 
    input: [],
    acceptStates: ${JSON.stringify(acceptStates)},
    state: "${initial}",
    consume: ${this.consume.toString()},
    reset: ${this.reset.toString()},
    inAcceptState: ${this.inAcceptState.toString()},
    _mostExhausted: ${this._mostExhausted.toString()},
    _evaluateSnapshot: ${this._evaluateSnapshot.toString()},
    _getPossibleTransitions: ${this._getPossibleTransitions.toString()},
    _stackMatch: ${this._stackMatch.toString()},
    _findCompositeKey: ${this._findCompositeKey.toString()},
    _clone: ${this._clone.toString()},
    transitions: {
`;
    for (const [name, ruleTransitions] of Object.entries(transitions)) {
        serialized += `     "${name}": {\n`;
        for (const transitionName in ruleTransitions) {
            const transitionSrc = [];
            for (const transition of ruleTransitions[transitionName]) {
                const nextState = transition[`@@nextState_${transitionName}`];
                const stackVal = transition[`@@stackVal_${transitionName}`];
                transitionSrc.push(
                    `{ fn: function() {\n${makeTransitionSrc(
                        transitionName,
                        nextState,
                        stackVal
                    )} } }`.replace(/\n/g, `\n                  `)
                );
            }
            serialized += `         "${transitionName}": [
            ${transitionSrc.join(", ")}],\n`;
        }
        serialized += "     },\n";
    }

    serialized += "}};";
    serialized +=
        target === "node"
            ? "\nmodule.exports = fsm;\n"
            : `\nwindow.${name} = fsm;\n`;

    return serialized;
}
module.exports = { serialize, makeTransitionFunction };
