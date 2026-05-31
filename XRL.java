/**
 * XRL Java SDK v1.0
 * 
 * 用法：
 *   1. 确保安装了 Node.js
 *   2. 把 xrl-engine.js 和 xrl-parser.js 放在项目根目录
 
 
 /**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
 */

import java.io.*;
import java.nio.file.*;
import java.util.*;

public class XRL {
    private String enginePath;
    private String parserPath;

    /**
     * 构造函数
     */
    public XRL() {
        this("./xrl-engine.js", "./xrl-parser.js");
    }

    public XRL(String enginePath, String parserPath) {
        this.enginePath = enginePath;
        this.parserPath = parserPath;
        checkNode();
    }

    /**
     * 检查 Node.js 是否安装
     */
    private void checkNode() {
        try {
            Process p = Runtime.getRuntime().exec("node --version");
            p.waitFor();
        } catch (Exception e) {
            throw new RuntimeException("请先安装 Node.js: https://nodejs.org");
        }
    }

    /**
     * 执行 JS 代码并返回结果
     */
    private String runJS(String code) throws Exception {
        // 写临时文件
        File tmpFile = File.createTempFile("xrl_", ".js");
        Files.write(tmpFile.toPath(), code.getBytes());

        // 执行
        ProcessBuilder pb = new ProcessBuilder("node", tmpFile.getAbsolutePath());
        pb.redirectErrorStream(true);
        Process p = pb.start();

        // 读结果
        BufferedReader reader = new BufferedReader(new InputStreamReader(p.getInputStream()));
        StringBuilder result = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            result.append(line);
        }
        p.waitFor();

        // 删临时文件
        tmpFile.delete();

        if (p.exitValue() != 0) {
            throw new RuntimeException("JS 执行错误: " + result.toString());
        }

        return result.toString();
    }

    /**
     * 执行 XRL 指令
     * @param commands 指令列表
     * @param rows     行数
     * @param cols     列数
     * @return JSON 字符串
     */
    public String execute(List<String> commands, int rows, int cols) throws Exception {
        StringBuilder cmdJson = new StringBuilder("[");
        for (int i = 0; i < commands.size(); i++) {
            if (i > 0) cmdJson.append(",");
            cmdJson.append("\"").append(escapeJSON(commands.get(i))).append("\"");
        }
        cmdJson.append("]");

        String code = 
            "const XRLEngine = require('" + enginePath + "');\n" +
            "const state = XRLEngine.createState(" + rows + ", " + cols + ");\n" +
            "const cmds = " + cmdJson.toString() + ";\n" +
            "const result = XRLEngine.execute(state, cmds);\n" +
            "console.log(JSON.stringify({data: result.state.cellData, formats: result.state.cellFormats}));\n";

        return runJS(code);
    }

    /**
     * 执行 XRL 指令（默认 50 行 20 列）
     */
    public String execute(List<String> commands) throws Exception {
        return execute(commands, 50, 20);
    }

    /**
     * 从自然语言生成 XRL 指令
     * @param text 自然语言文本
     * @return JSON 字符串
     */
    public String parse(String text) throws Exception {
        String code = 
            "const XRLParser = require('" + parserPath + "');\n" +
            "const cmds = XRLParser.parseNaturalLanguage(\"" + escapeJSON(text) + "\");\n" +
            "console.log(JSON.stringify(cmds || []));\n";

        return runJS(code);
    }

    /**
     * 解析并执行
     * @param text 自然语言文本
     * @return JSON 字符串
     */
    public String parseAndExecute(String text) throws Exception {
        return parseAndExecute(text, 50, 20);
    }

    public String parseAndExecute(String text, int rows, int cols) throws Exception {
        String cmdsStr = parse(text);
        // 简单解析 JSON 数组
        List<String> commands = new ArrayList<>();
        cmdsStr = cmdsStr.trim();
        if (cmdsStr.startsWith("[") && cmdsStr.endsWith("]")) {
            cmdsStr = cmdsStr.substring(1, cmdsStr.length() - 1);
            String[] parts = cmdsStr.split(",");
            for (String part : parts) {
                part = part.trim();
                if (part.startsWith("\"") && part.endsWith("\"")) {
                    commands.add(part.substring(1, part.length() - 1));
                }
            }
        }

        if (commands.isEmpty()) {
            return "{\"data\":{}, \"formats\":{}, \"commands\":[]}";
        }

        return execute(commands, rows, cols);
    }

    /**
     * 验证单条指令
     */
    public boolean validate(String command) throws Exception {
        String code = 
            "const XRLEngine = require('" + enginePath + "');\n" +
            "const r = XRLEngine.validateCommand(\"" + escapeJSON(command) + "\");\n" +
            "console.log(JSON.stringify(r.valid));\n";

        String result = runJS(code);
        return result.contains("true");
    }

    /**
     * 转义 JSON 字符串
     */
    private String escapeJSON(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    // ==================== 测试 ====================
    public static void main(String[] args) {
        try {
            XRL xrl = new XRL();

            // 示例1：执行指令
            System.out.println("=== 执行指令 ===");
            List<String> commands = Arrays.asList(
                "xr/A1/姓名",
                "xr/B1/分数",
                "xr/A2/张三",
                "xr/B2/85",
                "xr/A3/李四",
                "xr/B3/92",
                "xr/A4/合计",
                "sum/B2:B3/B4",
                "bg/HEADER/蓝色背景",
                "ct/A4"
            );
            String result = xrl.execute(commands);
            System.out.println(result);

            // 示例2：自然语言解析
            System.out.println("\n=== 自然语言解析 ===");
            result = xrl.parseAndExecute("张三85分，李四92分，王五78分");
            System.out.println(result);

            // 示例3：验证
            System.out.println("\n=== 验证 ===");
            System.out.println(xrl.validate("xr/A1/hello"));  // true
            System.out.println(xrl.validate("bad"));          // false

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}