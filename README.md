# automata-golf

A domain-specific language (DSL) for parsing regular, context-free and recursively enumerable languages. 

In `automata-golf`, a machine is defined by a series of path statements.
There's no need to explicitly define states or transitions.

The example below shows a machine with an initial state `s0`, which transitions
via `f` to and from the accepted state `s1` .

<img width="519" alt="Screenshot 2022-10-05 at 13 28 29" src="https://user-images.githubusercontent.com/3934417/194060304-5931d456-66b7-4297-ba61-1b987a5000bb.png">

```
# 1,2, and 3 are all equivalent:

# 1
.s0 -f> (s1) -f> s0;

# 2
.s0 <f> (s1);

# 3
s1 -f> .s0;
s0 <f- (s1);
```

Starting states are prefixed with `.`; Success states are wrapped in `(` `)`.

## Pattern matching

Regex is supported for pattern matching

```
/^s[0-9]/ -g> t1;
```

## Stacking transitions

Multiple transitions from the same state can be stacked up:

```
.s0 -f> -g> -h> s1;
```

## Pushdown automata

`automata-golf` supports pushdown automota, i.e. a finite-state machine with
a stack and transitions that push/pop the stack.

The following transitions to `s1` on input `f` when `a` is top of the stack.
Upon the transition, it pushes `b` to the stack.

```
.s0 -f[a:b]> s1;
```

<img width="507" alt="Screenshot 2022-10-05 at 13 35 39" src="https://user-images.githubusercontent.com/3934417/194061616-49be2ba3-ca5b-48a7-9eb5-5c520bb6c1e1.png">

### Multiple stacks

2-stack PDAs are supported, making them equivalent to Turing machines. See the
example and corresponding automaton diagram below.

```
.s0 -f[a:b, _:c]> s1;
```

<img width="506" src="https://i.imgur.com/Lct66bk.png"/>

### Epsilon transitions

Epsilon is represented by `_`. For example the following transitions to `s1`
and pushes `$` to the second stack without consuming any input or popping either stack.

```
.s0 -_[_:_, _:$]> (s1);

# or equivalently:

.s0 -[_, :$]> (s1);
```

# Examples

## Regular languages

Regular languages can be captured using finite-state machines.

### Odd binary numbers

The following program accepts all binary numbers ending in `1`

```js
const { build } = require("./automata-golf/index.js");

const { machine } = build(`
.s0 -0> -1> s0 -1> (s1);
`);

machine.consume("10110").inAcceptState(); // false
machine.consume("1011").inAcceptState(); // true
```

<img width="542" alt="Screenshot 2022-10-05 at 13 25 48" src="https://user-images.githubusercontent.com/3934417/194059891-9494d69e-fdcc-4f84-9d19-05c327609e94.png">

### Self-driving robot

The following finite-state machine creates a robot that can be turned on and off,
and switches direction when it collides.

```js
const { build } = require("./automata-golf/index.js");

const { machine } = build(`
.off <push> forward <collide> backward -push> off;
`);

machine.consume(["push", "collide"]).state; // backward
```

## Context-free languages

Pushdown automota are required to parse context-free languages.

### Odd-length palindromes

The following accepts all odd-length palindromes in the language `{a, b}`

```js
const { build } = require("automata-golf/index.js");

const { machine } = build(`
.s0 -[:$]> s1;
s1 -a[:a]> -b[:b]> s1;
s1 -a> -b> s2;
s2 -a[a]> -b[b]> s2;
s2 -[$]> (s3); 
`);

machine.consume("abbba").inAcceptState(); // true
machine.consume("abb").inAcceptState(); // false
```

Note the program can be condensed to

```
.s0 -[:$]> s1 -a[_:a]> -b[:b]> s1 -a> -b> s2 -a[a]> -b[b]> s2 -[$]> (s3);
```


<img width="962" alt="Screenshot 2022-10-05 at 13 27 33" src="https://user-images.githubusercontent.com/3934417/194060144-a14c4114-08a5-4b30-8a07-a273357aa8ae.png">

## Recursively enumerable languages

Recursively enumerable languages can be parsed by using a pushdown automaton with 2 stacks, equivalent to a Turing machine.

### a<sup>n</sup>b<sup>n</sup>c<sup>n</sup>

The following accepts input of the format a<sup>n</sup>b<sup>n</sup>c<sup>n</sup>:

```js
const { build } = require("automata-golf/index.js");

const machine = build(`
.s0 -a[:a]> s0 -_> s1 -b[a, :b]> s1 -_> s2 -c[_, b]> (s2);
`);

machine.consume("aabbcc").inAcceptState(); // true
machine.consume("abbc").inAcceptState(); // false
```

<img width="962" src="https://i.imgur.com/cdBeBF4.png"/>

## Build to JS

The machine can be written to a JS file

```js
// A.js
const { build } = require("automata-golf/index.js");
build(".s0 -f> (s1)", { emitFile: "./machine.js" });

// B.js
const machine = require("./machine.js");
machine.consume("f");
```

### Target

Set `target` to `'browser'` to generate a machine that can be run in a browser
environment:

```js
build(".s0 -f> (s1)", { emitFile: "./machine.js", target: "browser" });
```
