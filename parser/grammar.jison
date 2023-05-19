%lex

%%

\s*\#[^\n\r]*               /* skip line comments */
\s+                         /* skip whitespace */

";"                         return "LINE_END";
"("                         return "(";
")"                         return ")";
">"                         return ">";
"<"                         return "<";
"-"                         return "-";
"*"                         return "*";
"["                         return "[";
"]"                         return "]";
","                         return ",";
","                         return ",";
"."                         return ".";
":"                         return ":";
\/[^\/]*\/                  return "REGEX";

[A-Za-z0-9_$]+    return "IDENT";

/lex

%{

const utils = require("./utils");

%}

%%
start
    : rules { return utils.mergeRules($1); }
    ;
rules
    : rules rule -> [...$1, utils.unpackRuleStmt($2)]
    | rule -> [utils.unpackRuleStmt($1)]
    ;
rule
    : LINE_END -> []
    | rule_transitions state LINE_END -> [...$1, $2]
    ;
rule_transitions
    : rule_transitions rule_transition -> [...$1, ...$2]
    | rule_transition
    ;
rule_transition
    : state transitions -> [$1, $2]
    ;
state
    : "(" IDENT ")" -> { type: "state", name: $2, accept: true }
    | "(" "." IDENT ")" -> { type: "state", name: $2, initial: true, accept: true }
    | "." IDENT -> { type: "state", name: $2, initial: true }
    | IDENT -> { type: "state", name: $1 }
    | "*" -> { type: "state", name: "@@regexp:.*" }
    | REGEX -> { type: "state", name: `@@regexp:${$1.slice(1, -1)}` }
    ;
transitions
    : transitions transition -> [$1, $2]
    | transition
    ;
transition
    : "<" IDENT ">" -> { type: "transition", direction: "lr", input: $2 }
    | "<" IDENT "-" -> { type: "transition", direction: "l", input: $2 }
    | "-" IDENT ">" -> { type: "transition", direction: "r", input: $2 }
    | "<" pda_definition ">" -> { type: "transition", direction: "lr", ...$2 }
    | "<" pda_definition "-" -> { type: "transition", direction: "l", ...$2 }
    | "-" pda_definition ">" -> { type: "transition", direction: "r", ...$2 }
    ;
pda_definition
    : IDENT "[" stack_pairs "]" -> { input: $1 === "_" ? undefined : $1, stacks: $3 }
    | "[" stack_pairs "]" -> { stacks: $1 }
    ;
stack_pairs
    : stack_pairs "," stack_pair -> [$1, $3]
    | stack_pair
    ;
stack_pair
    : IDENT -> { read: $1 }
    | IDENT ":" IDENT -> { read: $1, write: $3 }
    ;
