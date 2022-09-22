function ParseError(msg) {
    throw `FSM parse error: ${msg}`;
}

ParseError.prototype = Error.prototype;

function isMetaProperty(property) {
    return property.startsWith("@@");
}

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
        let outSrc;
        let transitionFun;

        if (transition.stackVal) {
            transitionFun = function () {
                this.state = nextState.name;
                this.stack.push(...transition.stackVal.split(","));
            };
            outSrc = `'${transition.name}': 
                function() { 
                    this.state = '${nextState.name}'; 
                    this.stack.push(${transition.stackVal.split(",").map(el => `'${el}'`).join(",")});
                 }`;
        } else {
            transitionFun = function () {
                this.state = nextState.name;
            };
            outSrc = `'${transition.name}': 
                function() { 
                    this.state = '${nextState.name}'; 
                }`;
        }

        const {name} = state;
        const transitionObj = {
            [transition.name]: transitionFun,
            [`@@src_${transition.name}`] : outSrc,
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
    const statesFound = [];

    const pushStatesFound = (stateName) => {
        if (!statesFound.includes(stateName) && !isMetaProperty(stateName)) {
            statesFound.push(stateName);
        }
    }

    ruleArr.forEach((item, i) => {
        if (item.type === "state" && i !== ruleArr.length - 1) {
            const transition = ruleArr[i + 1];
            const nextState = ruleArr[i + 2];

            pushStatesFound(item.name);
            pushStatesFound(nextState.name);

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
        statesFound,
    };
}

function addRegexToTransitions(transitions, statesFound, regexp, regexState) {
    for (const state of statesFound) {
        for (const transitionName in regexState) {
            if (!transitions[state]) {
                transitions[state] = {};
            }
            if (!transitions[state][transitionName] && state.match(regexp)) {
                transitions[state][transitionName] = regexState[transitionName]
            } else if (transitions[state][transitionName]) {
                throw new ParseError(
                `Multiple possible paths from state '${state}' via transition '${transitionName}'`
                 );
            }
        }
    }
}

function applyRegex(transitions, statesFound) {
    for (const state in transitions) {
        const [, regex] = state.split("@@regexp:")
        if (!regex) {
            continue;
        }
        const regexState = transitions[state];
        const regexp = new RegExp(regex);
        delete transitions[state];
        addRegexToTransitions(transitions, statesFound, regexp, regexState);
    }
}

function mergeRules(rules) {
    const transitions = mergeTransitions({}, ...rules.map(r => r.transitions));
    const statesFound = [...new Set(rules.map(r => r.statesFound).flat())];

    applyRegex(transitions, statesFound);

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