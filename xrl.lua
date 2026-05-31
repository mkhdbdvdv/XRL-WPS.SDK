--[[
    XRL Lua SDK v1.0

    用法：
      1. 确保安装了 Node.js
      2. 把 xrl-engine.js 和 xrl-parser.js 放在同目录
      3. local xrl = require("xrl")
      /**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
]]

local XRL = {}
XRL.__index = XRL

function XRL.new(engine_path, parser_path)
    local self = setmetatable({}, XRL)
    self.engine_path = engine_path or "./xrl-engine.js"
    self.parser_path = parser_path or "./xrl-parser.js"

    -- 检查 Node.js
    local handle = io.popen("node --version 2>&1")
    local result = handle:read("*a")
    handle:close()
    if not result:match("%d+%.") then
        error("请先安装 Node.js: https://nodejs.org")
    end

    return self
end

-- 执行 JS 代码并返回结果
function XRL:_run_js(code)
    -- 写临时文件
    local tmpfile = os.tmpname() .. ".js"
    local f = io.open(tmpfile, "w")
    f:write(code)
    f:close()

    -- 执行
    local handle = io.popen('node "' .. tmpfile .. '" 2>&1')
    local result = handle:read("*a")
    local success = handle:close()

    -- 删临时文件
    os.remove(tmpfile)

    if not success then
        error("JS 执行错误: " .. (result or ""))
    end

    return result
end

-- 转义 JSON 字符串
function XRL:_escape(s)
    return s:gsub("\\", "\\\\")
            :gsub('"', '\\"')
            :gsub("\n", "\\n")
            :gsub("\r", "\\r")
            :gsub("\t", "\\t")
end

-- 执行 XRL 指令
function XRL:execute(commands, rows, cols)
    rows = rows or 50
    cols = cols or 20

    -- 构建命令 JSON 数组
    local parts = {}
    for i, cmd in ipairs(commands) do
        table.insert(parts, '"' .. self:_escape(cmd) .. '"')
    end
    local cmd_json = "[" .. table.concat(parts, ",") .. "]"

    local code = [[
const XRLEngine = require(']] .. self.engine_path .. [[');
const state = XRLEngine.createState(]] .. rows .. ", " .. cols .. [[);
const cmds = ]] .. cmd_json .. [[;
const result = XRLEngine.execute(state, cmds);
console.log(JSON.stringify({data: result.state.cellData, formats: result.state.cellFormats}));
]]

    return self:_run_js(code)
end

-- 从自然语言生成 XRL 指令
function XRL:parse(text)
    local code = [[
const XRLParser = require(']] .. self.parser_path .. [[');
const cmds = XRLParser.parseNaturalLanguage("]] .. self:_escape(text) .. [[");
console.log(JSON.stringify(cmds || []));
]]

    return self:_run_js(code)
end

-- 解析并执行
function XRL:parse_and_execute(text, rows, cols)
    rows = rows or 50
    cols = cols or 20

    local cmds_str = self:parse(text)

    -- 解析 JSON 数组
    local commands = {}
    for cmd in cmds_str:gmatch('"([^"]*)"') do
        table.insert(commands, cmd)
    end

    if #commands == 0 then
        return '{"data":{},"formats":{},"commands":[]}'
    end

    return self:execute(commands, rows, cols)
end

-- 验证单条指令
function XRL:validate(command)
    local code = [[
const XRLEngine = require(']] .. self.engine_path .. [[');
const r = XRLEngine.validateCommand("]] .. self:_escape(command) .. [[");
console.log(JSON.stringify(r.valid));
]]

    local result = self:_run_js(code)
    return result:find("true") ~= nil
end

return XRL