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
        .s0 -[_:$]> s1;
        s1 -a[_:a]> -b[_:b]> s1;
        s1 -a> -b> s2;
        s2 -a[a]> -b[b]> s2;
        s2 -[$]> (s3); 
    `);
    expect(accepted(machine, "aabbbaa")).toBe(true);
    expect(accepted(machine, "a")).toBe(true);
    expect(accepted(machine, "abbbaa")).toBe(false);
});

test("Builds a NPDA that accepts a^(n)b^(n)", () => {
    const { machine } = build(`
        .s0 -a[_:a]> s0;
        s0 -_> (s1);
        s1 -b[a]> s1;
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

test("Builds a NPDA that accepts a^(n)b^(n)c^(n)", () => {
    const { machine } = build(`
        .s0 -a[:a]> s0 -_> s1 -b[a, :b]> s1 -_> s2 -c[_, b]> (s2);
    `);
    expect(accepted(machine, "aaabbbccc")).toBe(true);
    expect(accepted(machine, "abc")).toBe(true);
    expect(accepted(machine, "aabbccc")).toBe(false);
    expect(accepted(machine, "aabcc")).toBe(false);
});
