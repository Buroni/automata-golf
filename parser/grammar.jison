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
\/[^\/]*\/                  return "REGEX";

[A-Za-z0-9_$:]+    return "IDENT";

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
    : state transition -> [$1, { type: "transition", ...$2 }]
    ;
state
    : "(" IDENT ")" -> { type: "state", name: $2, accept: true }
    | "(" "." IDENT ")" -> { type: "state", name: $2, initial: true, accept: true }
    | "." IDENT -> { type: "state", name: $2, initial: true }
    | IDENT -> { type: "state", name: $1 }
    | "*" -> { type: "state", name: "@@regexp:.*" }
    | REGEX -> { type: "state", name: `@@regexp:${$1.slice(1, -1)}` }
    ;
transition
    : "<" IDENT ">" -> { direction: "lr", name: `${$2}:` }
    | "<" IDENT "-" -> { direction: "l", name: `${$2}:` }
    | "-" IDENT ">" -> { direction: "r", name: `${$2}:` }
    | "<" pda_definition ">" -> { direction: "lr", ...$2 }
    | "<" pda_definition "-" -> { direction: "l", ...$2 }
    | "-" pda_definition ">" -> { direction: "r", ...$2 }
    ;
pda_definition
    : "[" IDENT "," IDENT "]" IDENT -> { name: $4 === "_" ? `${$2}:` : `${$2}:${$4}`, stackVal: $6 === "_" ? undefined : $6 }
    | "[" IDENT "]" IDENT -> { name: `${$2}:`, stackVal: $4 === "_" ? undefined : $4 }
    | IDENT "[" IDENT "," IDENT "]" -> { name: $5 === "_" ? `${$3}:` : `${$3}:${$5}`, stackVal: $1 === "_" ? undefined : $1}
    | IDENT "[" IDENT "]" -> { name: `${$3}:`, stackVal: $1 === "_" ? undefined : $1 }
    | "[" IDENT "]" -> { name: `${$2}:` }
    | "[" IDENT "," IDENT "]" -> { name: $4 === "_" ? `${$2}:` : `${$2}:${$4}` }
    ;
