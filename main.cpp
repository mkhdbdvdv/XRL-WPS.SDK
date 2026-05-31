/**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
#include <iostream>
#include "xrl.h"

int main() {
    try {
        XRL xrl;

        // 示例1：执行指令
        std::cout << "=== 执行指令 ===" << std::endl;
        std::vector<std::string> commands = {
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
        };
        std::string result = xrl.execute(commands);
        std::cout << result << std::endl;

        // 示例2：自然语言解析
        std::cout << "\n=== 自然语言解析 ===" << std::endl;
        result = xrl.parseAndExecute("张三85分，李四92分，王五78分");
        std::cout << result << std::endl;

        // 示例3：验证指令
        std::cout << "\n=== 验证 ===" << std::endl;
        std::cout << xrl.validate("xr/A1/hello") << std::endl;  // 1
        std::cout << xrl.validate("bad") << std::endl;          // 0

    } catch (const std::exception& e) {
        std::cerr << "错误: " << e.what() << std::endl;
    }

    return 0;
}