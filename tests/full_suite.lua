local passed = 0
local failed = 0
local tests = {}

local function test(name, fn)
    tests[#tests + 1] = {
        name = name,
        fn = fn
    }
end

local function assertEq(a, b, msg)
    if a ~= b then
        error(msg or ("expected " .. tostring(b) .. ", got " .. tostring(a)))
    end
end

local function assertTrue(v, msg)
    if not v then
        error(msg or "expected true")
    end
end

local function assertFalse(v, msg)
    if v then
        error(msg or "expected false")
    end
end

test("nil", function()
    local x = nil
    assertEq(x, nil)
end)

test("booleans", function()
    assertTrue(true)
    assertFalse(false)
end)

test("numbers", function()
    local a = 123456789
    local b = -98765.4321
    local c = 0xFF
    local d = 1e10
    assertEq(a, 123456789)
    assertEq(b, -98765.4321)
    assertEq(c, 255)
    assertEq(d, 10000000000)
end)

test("strings", function()
    local a = "hello"
    local b = 'world'
    local c = [[multi
line
string]]
    assertEq(a .. " " .. b, "hello world")
    assertTrue(string.find(c, "multi") ~= nil)
end)

test("string escapes", function()
    local s = "\n\t\r\\\"\'"
    assertTrue(#s > 0)
    local unicode = "UwU ✓ λ Ω"
    assertTrue(#unicode > 0)
end)

test("string operations", function()
    local s = "ZumHub-DoggoJr-123"
    assertEq(string.upper(s), "ZUMHUB-DOGGOJR-123")
    assertEq(string.lower(s), "zumhub-doggojr-123")
    assertEq(string.sub(s, 1, 6), "ZumHub")
    assertTrue(string.find(s, "DoggoJr") ~= nil)
end)

test("arithmetic", function()
    assertEq(10 + 5, 15)
    assertEq(10 - 5, 5)
    assertEq(10 * 5, 50)
    assertEq(10 / 5, 2)
    assertEq(10 % 3, 1)
    assertEq(2 ^ 8, 256)
    assertEq(-10, -10)
end)

test("bitwise", function()
    assertEq(bit32.band(0xFF, 0x0F), 15)
    assertEq(bit32.bor(0xF0, 0x0F), 255)
    assertEq(bit32.bxor(0xFF, 0x0F), 240)
    assertEq(bit32.lshift(1, 4), 16)
    assertEq(bit32.rshift(16, 4), 1)
end)

test("comparisons", function()
    assertTrue(10 > 5)
    assertTrue(5 < 10)
    assertTrue(10 >= 10)
    assertTrue(10 <= 10)
    assertTrue(10 == 10)
    assertTrue(10 ~= 5)
end)

test("logical operators", function()
    assertEq(true and 123, 123)
    assertEq(false or 456, 456)
    assertEq(nil or "fallback", "fallback")
end)

test("variable handling", function()
    local a = 10
    local b = 20
    local function inner()
        local c = 30
        return a + b + c
    end
    assertEq(inner(), 60)
end)

test("functions", function()
    local function add(a, b)
        return a + b
    end
    assertEq(add(5, 7), 12)
end)

test("multiple returns", function()
    local function values()
        return 10, 20, 30
    end
    local a, b, c = values()
    assertEq(a, 10)
    assertEq(b, 20)
    assertEq(c, 30)
end)

test("varargs", function(...)
    local function count(...)
        return select("#", ...)
    end
    assertEq(count(1, 2, 3, 4, 5), 5)
end)

test("closure", function()
    local function counter()
        local n = 0
        return function()
            n += 1
            return n
        end
    end
    local c = counter()
    assertEq(c(), 1)
    assertEq(c(), 2)
    assertEq(c(), 3)
end)

test("closure capture", function()
    local funcs = {}
    for i = 1, 5 do
        local value = i
        funcs[i] = function()
            return value * 2
        end
    end
    assertEq(funcs[1](), 2)
    assertEq(funcs[5](), 10)
end)

test("array table", function()
    local t = {10, 20, 30, 40}
    assertEq(t[1], 10)
    assertEq(t[4], 40)
    assertEq(#t, 4)
end)

test("dictionary table", function()
    local t = {
        name = "ZumHub",
        version = 2,
        enabled = true
    }
    assertEq(t.name, "ZumHub")
    assertEq(t.version, 2)
    assertTrue(t.enabled)
end)

test("nested tables", function()
    local t = { a = { b = { c = { value = 123 } } } }
    assertEq(t.a.b.c.value, 123)
end)

test("mixed table", function()
    local t = {
        [1] = "one",
        ["two"] = 2,
        [true] = "boolean",
        [{}] = "table key"
    }
    assertEq(t[1], "one")
    assertEq(t["two"], 2)
    assertEq(t[true], "boolean")
end)

test("table operations", function()
    local t = {1, 2, 3}
    table.insert(t, 4)
    assertEq(t[4], 4)
    table.remove(t, 1)
    assertEq(t[1], 2)
    table.insert(t, 1, 99)
    assertEq(t[1], 99)
    table.sort(t, function(a, b) return a < b end)
    assertEq(t[1], 2)
end)

test("numeric for", function()
    local sum = 0
    for i = 1, 10 do sum += i end
    assertEq(sum, 55)
end)

test("numeric for with step", function()
    local sum = 0
    for i = 0, 10, 2 do sum += i end
    assertEq(sum, 30)
end)

test("while loop", function()
    local i = 0
    local sum = 0
    while i < 5 do i += 1; sum += i end
    assertEq(sum, 15)
end)

test("repeat loop", function()
    local i = 0
    repeat i += 1 until i == 5
    assertEq(i, 5)
end)

test("generic loop", function()
    local t = { a = 10, b = 20, c = 30 }
    local sum = 0
    for _, value in pairs(t) do sum += value end
    assertEq(sum, 60)
end)

test("if elseif else", function()
    local value = 20
    local result
    if value < 10 then result = 1
    elseif value < 20 then result = 2
    else result = 3 end
    assertEq(result, 3)
end)

test("break", function()
    local count = 0
    for i = 1, 100 do
        count += 1
        if i == 5 then break end
    end
    assertEq(count, 5)
end)

test("continue", function()
    local sum = 0
    for i = 1, 10 do
        if i % 2 == 0 then continue end
        sum += i
    end
    assertEq(sum, 25)
end)

test("metatable __index", function()
    local defaults = { speed = 10 }
    local obj = {}
    setmetatable(obj, { __index = defaults })
    assertEq(obj.speed, 10)
    obj.speed = 20
    assertEq(obj.speed, 20)
end)

test("metatable arithmetic", function()
    local a = {value = 10}
    local b = {value = 20}
    setmetatable(a, { __add = function(x, y) return { value = x.value + y.value } end })
    local c = a + b
    assertEq(c.value, 30)
end)

test("metatable tostring", function()
    local obj = {}
    setmetatable(obj, { __tostring = function() return "CUSTOM_OBJECT" end })
    assertEq(tostring(obj), "CUSTOM_OBJECT")
end)

test("object methods", function()
    local Object = {}
    Object.__index = Object
    function Object.new(value)
        return setmetatable({ value = value }, Object)
    end
    function Object:add(n) self.value += n end
    local obj = Object.new(10)
    obj:add(15)
    assertEq(obj.value, 25)
end)

test("recursion", function()
    local function factorial(n)
        if n <= 1 then return 1 end
        return n * factorial(n - 1)
    end
    assertEq(factorial(6), 720)
end)

test("recursive fibonacci", function()
    local function fib(n)
        if n <= 1 then return n end
        return fib(n - 1) + fib(n - 2)
    end
    assertEq(fib(10), 55)
end)

test("coroutine", function()
    local co = coroutine.create(function()
        coroutine.yield(10)
        coroutine.yield(20)
        return 30
    end)
    local ok, a = coroutine.resume(co)
    assertTrue(ok)
    assertEq(a, 10)
    ok, a = coroutine.resume(co)
    assertTrue(ok)
    assertEq(a, 20)
    ok, a = coroutine.resume(co)
    assertTrue(ok)
    assertEq(a, 30)
end)

test("pcall", function()
    local ok, result = pcall(function() return 123 end)
    assertTrue(ok)
    assertEq(result, 123)
end)

test("pcall error", function()
    local ok = pcall(function() error("expected test error") end)
    assertFalse(ok)
end)

test("xpcall", function()
    local handled = false
    local ok = xpcall(function() error("test") end, function() handled = true return "handled" end)
    assertFalse(ok)
    assertTrue(handled)
end)

test("select", function()
    local function test(...)
        return select(2, ...)
    end
    assertEq(test("a", "b", "c"), "b")
end)

test("type annotations", function()
    local function add(a: number, b: number): number
        return a + b
    end
    local value: number = add(10, 20)
    assertEq(value, 30)
end)

test("typed table", function()
    type Data = {
        name: string,
        value: number
    }
    local data: Data = {
        name = "test",
        value = 123
    }
    assertEq(data.name, "test")
    assertEq(data.value, 123)
end)

test("patterns", function()
    local s = "User123-Test456"
    local a, b = string.match(s, "(%a+)(%d+)")
    assertEq(a, "User")
    assertEq(b, "123")
end)

test("gsub", function()
    local s = "hello hello hello"
    local result = string.gsub(s, "hello", "world")
    assertEq(result, "world world world")
end)

test("table pack/unpack", function()
    local packed = table.pack(10, 20, 30)
    assertEq(packed.n, 3)
    assertEq(packed[1], 10)
    assertEq(packed[3], 30)
    local a, b, c = table.unpack(packed)
    assertEq(a, 10)
    assertEq(b, 20)
    assertEq(c, 30)
end)

test("closure factory", function()
    local function makeMultiplier(multiplier)
        return function(value) return value * multiplier end
    end
    local double = makeMultiplier(2)
    local triple = makeMultiplier(3)
    assertEq(double(10), 20)
    assertEq(triple(10), 30)
end)

test("complex control flow", function()
    local result = 0
    for i = 1, 20 do
        if i % 3 == 0 then result += i * 2
        elseif i % 2 == 0 then result -= i
        else result += 1 end
    end
    assertEq(result, 42)
end)

test("constant density", function()
    local values = {
        0, 1, -1, 3.1415926535, 0.000001, 999999999, 0xDEADBEEF,
        "short", "medium string", "this is a much longer string constant",
        true, false
    }
    assertEq(values[1], 0)
    assertEq(values[4], 3.1415926535)
    assertEq(values[7], 0xDEADBEEF)
    assertEq(values[12], false)
end)

test("dynamic access", function()
    local t = { alpha = 10, beta = 20, gamma = 30 }
    local keys = {"alpha", "beta", "gamma"}
    local sum = 0
    for _, key in ipairs(keys) do sum += t[key] end
    assertEq(sum, 60)
end)

test("function dispatch table", function()
    local operations = {
        add = function(a, b) return a + b end,
        sub = function(a, b) return a - b end,
        mul = function(a, b) return a * b end,
        div = function(a, b) return a / b end
    }
    assertEq(operations.add(10, 5), 15)
    assertEq(operations.sub(10, 5), 5)
    assertEq(operations.mul(10, 5), 50)
    assertEq(operations.div(10, 5), 2)
end)

test("deep nesting", function()
    local value = { a = { b = { c = { d = { e = { f = { g = { h = { result = "deep" } } } } } } } } }
    assertEq(value.a.b.c.d.e.f.g.h.result, "deep")
end)

test("multiple upvalues", function()
    local a = 10
    local b = 20
    local c = 30
    local function calculate() return a + b + c end
    a = 100
    b = 200
    assertEq(calculate(), 330)
end)

test("deterministic calculation", function()
    local function hash(str)
        local h = 2166136261
        for i = 1, #str do
            h = bit32.bxor(h, string.byte(str, i))
            h = (h * 16777619) % 4294967296
        end
        return h
    end
    local a = hash("ZumHub")
    local b = hash("ZumHub")
    assertEq(a, b)
end)

test("integration", function()
    local state = { count = 0, values = {} }
    local function process(value)
        local transformed = value * 2
        table.insert(state.values, transformed)
        state.count += 1
        return transformed
    end
    local processor = {}
    processor.__index = processor
    function processor.new(multiplier)
        return setmetatable({ multiplier = multiplier }, processor)
    end
    function processor:run(value)
        return process(value * self.multiplier)
    end
    local obj = processor.new(3)
    local a = obj:run(5)
    local b = obj:run(10)
    assertEq(a, 30)
    assertEq(b, 60)
    assertEq(state.count, 2)
    assertEq(state.values[1], 30)
    assertEq(state.values[2], 60)
end)

print("========================================")
print("       LUAU OBFUSCATOR TEST SUITE")
print("========================================")
print("Tests: " .. #tests)
print("")
for _, testData in ipairs(tests) do
    local ok, err = pcall(testData.fn)
    if ok then
        passed += 1
        print("[PASS] " .. testData.name)
    else
        failed += 1
        warn("[FAIL] " .. testData.name)
        warn("       " .. tostring(err))
    end
end
print("")
print("========================================")
print("PASSED: " .. passed)
print("FAILED: " .. failed)
print("TOTAL : " .. #tests)
print("========================================")
if failed == 0 then
    print("RESULT: ALL TESTS PASSED")
else
    warn("RESULT: OBFUSCATED OUTPUT FAILED " .. failed .. " TEST(S)")
end
return { passed = passed, failed = failed, total = #tests, success = failed == 0 }
