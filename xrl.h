/**
 * XRL C++ SDK v1.0
 * 
 * 用法：
 *   1. 确保安装了 Node.js
 *   2. 把 xrl-engine.js 和 xrl-parser.js 放在可执行文件同目录
 *   3. 编译：g++ -std=c++11 main.cpp -o main
 
 /**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
 */

#ifndef XRL_H
#define XRL_H

#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <fstream>
#include <cstdio>
#include <cstdlib>
#include <sstream>
#include <json/json.h>  // 需要安装 jsoncpp

class XRL {
private:
    std::string enginePath;
    std::string parserPath;

    /**
     * 执行 JS 代码并返回 JSON 字符串
     */
    std::string runJS(const std::string& code) {
        // 写临时文件
        std::string tmpFile = "xrl_tmp_" + std::to_string(rand()) + ".js";
        std::ofstream f(tmpFile);
        f << code;
        f.close();

        // 执行
        std::string cmd = "node " + tmpFile + " 2>&1";
        FILE* pipe = popen(cmd.c_str(), "r");
        if (!pipe) {
            std::remove(tmpFile.c_str());
            throw std::runtime_error("无法执行 Node.js，请确认已安装");
        }

        // 读结果
        char buffer[4096];
        std::string result;
        while (fgets(buffer, sizeof(buffer), pipe)) {
            result += buffer;
        }
        int status = pclose(pipe);

        // 删临时文件
        std::remove(tmpFile.c_str());

        if (status != 0) {
            throw std::runtime_error("JS 执行错误: " + result);
        }

        return result;
    }

public:
    /**
     * 构造函数
     * @param engine  xrl-engine.js 路径，默认当前目录
     * @param parser  xrl-parser.js 路径，默认当前目录
     */
    XRL(const std::string& engine = "./xrl-engine.js", 
        const std::string& parser = "./xrl-parser.js")
        : enginePath(engine), parserPath(parser) {
        // 检查 Node.js
        if (system("node --version > /dev/null 2>&1") != 0) {
            throw std::runtime_error("请先安装 Node.js: https://nodejs.org");
        }
    }

    /**
     * 执行 XRL 指令
     * @param commands 指令列表
     * @param rows     行数
     * @param cols     列数
     * @return JSON 字符串
     */
    std::string execute(const std::vector<std::string>& commands, 
                        int rows = 50, int cols = 20) {
        // 构建命令数组 JSON
        std::string cmdJson = "[";
        for (size_t i = 0; i < commands.size(); i++) {
            if (i > 0) cmdJson += ",";
            cmdJson += "\"" + escapeJSON(commands[i]) + "\"";
        }
        cmdJson += "]";

        std::string code = 
            "const XRLEngine = require('" + enginePath + "');\n"
            "const state = XRLEngine.createState(" + std::to_string(rows) + ", " + std::to_string(cols) + ");\n"
            "const cmds = " + cmdJson + ";\n"
            "const result = XRLEngine.execute(state, cmds);\n"
            "console.log(JSON.stringify({data: result.state.cellData, formats: result.state.cellFormats}));\n";

        return runJS(code);
    }

    /**
     * 从自然语言生成 XRL 指令
     * @param text 自然语言文本
     * @return JSON 字符串（指令数组）
     */
    std::string parse(const std::string& text) {
        std::string code = 
            "const XRLParser = require('" + parserPath + "');\n"
            "const cmds = XRLParser.parseNaturalLanguage(\"" + escapeJSON(text) + "\");\n"
            "console.log(JSON.stringify(cmds || []));\n";

        return runJS(code);
    }

    /**
     * 解析并执行
     * @param text 自然语言文本
     * @return JSON 字符串
     */
    std::string parseAndExecute(const std::string& text, 
                                int rows = 50, int cols = 20) {
        // 先解析
        std::string cmdsStr = parse(text);
        
        // 解析 JSON
        Json::Value cmdsJson;
        Json::Reader reader;
        if (!reader.parse(cmdsStr, cmdsJson)) {
            return "{\"error\":\"解析失败\"}";
        }

        // 转成 vector
        std::vector<std::string> commands;
        for (const auto& cmd : cmdsJson) {
            commands.push_back(cmd.asString());
        }

        if (commands.empty()) {
            return "{\"data\":{}, \"formats\":{}, \"commands\":[]}";
        }

        // 执行
        std::string result = execute(commands, rows, cols);
        
        // 把 commands 也塞进结果
        result.pop_back();  // 去掉最后的 }
        result += ", \"commands\":" + cmdsStr + "}";
        return result;
    }

    /**
     * 验证单条指令
     */
    bool validate(const std::string& command) {
        std::string code = 
            "const XRLEngine = require('" + enginePath + "');\n"
            "const r = XRLEngine.validateCommand(\"" + escapeJSON(command) + "\");\n"
            "console.log(JSON.stringify(r.valid));\n";

        std::string result = runJS(code);
        return result.find("true") != std::string::npos;
    }

private:
    /**
     * 转义 JSON 字符串
     */
    std::string escapeJSON(const std::string& s) {
        std::string result;
        for (char c : s) {
            switch (c) {
                case '"':  result += "\\\""; break;
                case '\\': result += "\\\\"; break;
                case '\n': result += "\\n";  break;
                case '\r': result += "\\r";  break;
                case '\t': result += "\\t";  break;
                default:   result += c;
            }
        }
        return result;
    }
};

#endif // XRL_H