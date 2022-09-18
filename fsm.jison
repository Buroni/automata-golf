%lex

%%

\s*\@[^\n\r]*               /* skip line comments */
\s+                         /* skip whitespace */

";"                         return "LINE_END";
"("                         return "(";
")"                         return ")";
">"                         return ">";
"<"                         return "<";
"-"                         return "-";

[A-Za-z_$][A-Za-z0-9_$]*    return "IDENT";

/lex

%%
start
    : rules { return $1; }
    ;
rules
    : rules rule -> [...$1, $2]
    | rule -> [$1]
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
    : "(" IDENT ")" -> { type: "state", name: $2, initial: true }
    | IDENT -> { type: "state", name: $1 }
    ;
transition
    : "<" IDENT ">" -> { direction: "lr", name: $2 }
    | "<" IDENT "-" -> { direction: "l", name: $2 }
    | "-" IDENT ">" -> { direction: "r", name: $2 }
    ;


