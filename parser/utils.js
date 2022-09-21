function ParseError(msg) {
    throw `FSM parse error: ${msg}`;
}

ParseError.prototype = Error.prototype;

function mergeTransitions(...sources) {
    const target = {};

    for (const source of sources) {
        for (const state in source) {

            if (!target[state]) {
                target[state] = {};
            }

            for (const transition in source[state]) {
                if (!target[state][transition]) {
                    target[state][transition] = source[state][transition];
                } else {
                    throw new ParseError(
                        `Multiple possible paths from state '${state}' via transition '${transition}'`
                    );
                }
            }
        }
    }

    return target;
}

function TransitionBuilder() {
    this.transitions = {};

    this.addTransition = function (state, transition, nextState) {
        const outSrc = `${transition.name}: function() { this.state = "${nextState.name}"; }`;

        const {name} = state;
        const transitionObj = {
            [transition.name]: function () {
                this.state = nextState.name;
            },
            [`$$src_${transition.name}`]: outSrc,
        };

        if (!this.transitions[name]) {
            this.transitions[name] = transitionObj;
        } else if (this.transitions[name][transition.name]) {
            throw new ParseError(
                `Multiple possible paths from state '${name}' via transition '${transition.name}'`
            );
        } else {
            Object.assign(this.transitions[name], transitionObj);
        }
    }
}

function unpackRuleStmt(ruleArr) {
    /**
     * Convert rule statement into an array of transitions
     */
    const builder = new TransitionBuilder();

    ruleArr.forEach((item, i) => {
        if (item.type === "state" && i !== ruleArr.length - 1) {
            const transition = ruleArr[i + 1];
            const nextState = ruleArr[i + 2];

            switch (transition.direction) {
                case "r":
                    builder.addTransition(item, transition, nextState);
                    break;
                case "l":
                    builder.addTransition(nextState, transition, item);
                    break;
                case "lr":
                    builder.addTransition(item, transition, nextState);
                    builder.addTransition(nextState, transition, item);
                    break;
                default:
                    break;
            }
        }
    });

    const initialState = ruleArr.find(r => r.initial);

    return {
        initial: initialState?.name || false,
        transitions: builder.transitions,
    };
}

function applyKleene(transitions) {
    const kleeneState = transitions["*"];
    delete transitions["*"];
    if (kleeneState) {
        for (const state in transitions) {
            for (const transitionName in kleeneState) {
                if (!transitions[state][transitionName]) {
                    transitions[state][transitionName] = kleeneState[transitionName]
                } else {
                    throw new ParseError(
                    `Multiple possible paths from state '${state}' via transition '${transitionName}'`
                     );
                }
            }
        }
    }
}

function mergeRules(rules) {
    const transitions = mergeTransitions({}, ...rules.map(r => r.transitions));

    applyKleene(transitions);
    
    for (const state in transitions) {
        delete transitions[state]["$$SELF"];
    }



    const initial = rules.find(r => r.initial)?.initial;
    if (!initial) {
        throw new ParseError(
            "Initial state not found; set initial state by wrapping in parenthesis, e.g. (s0) -f> s1 "
        );
    }

    return {
        initial,
        transitions,
    }
}

module.exports = {unpackRuleStmt, mergeRules};