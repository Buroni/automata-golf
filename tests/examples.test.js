const { build } = require("../index.js");

const accepted = (machine, input) =>
    machine.consume(input, { reset: true }).inAcceptState();

test("Builds a NFSA that accepts odd binary numbers", () => {
    const { machine } = build(`.s0 -0> s0 -1> s0 -1> (s1);`);
    expect(accepted(machine, "0011")).toBe(true);
    expect(accepted(machine, "0000110")).toBe(false);
});

test("Builds a NPDA that accepts odd-length palindromes", () => {
    const { machine } = build(`
        .q0 -[_]Z> q1 -[a]a> q1 -[b]b> q1 -a> q2;
        q1 -b> q2 -[a,a]> q2 -[b,b]> q2 -[_,Z]> (q3);  
    `);
    expect(accepted(machine, "aabbbaa")).toBe(true);
    expect(accepted(machine, "a")).toBe(true);
    expect(accepted(machine, "abbbaa")).toBe(false);
});

test("Builds a NPDA that accepts a^(n)b^(n)", () => {
    const { machine } = build(`
        .q0 -[a,_]a> q0;
        .q0 -[a,_]a> q0;
        q0 -_> (q1);
        q1 -[b,a]> q1;
    `);
    expect(accepted(machine, "aaabbb")).toBe(true);
    expect(accepted(machine, "")).toBe(true);
    expect(accepted(machine, "aaabbbb")).toBe(false);
    expect(accepted(machine, "ba")).toBe(false);
});

test("Builds a self-driving robot", () => {
    const { machine } = build(`
        .off <push> forward <collide> backward -push> off;
    `);
    expect(machine.consume(["push", "collide"]).state).toBe("backward");
});
