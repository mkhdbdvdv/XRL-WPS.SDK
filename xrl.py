"""
XRL Python SDK v1.0
用法：把 xrl-engine.js 和 xrl-parser.js 放在同目录下
/**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
"""

import subprocess
import json
import os
import tempfile


class XRL:
    def __init__(self):
        """初始化，检查 Node.js 是否安装"""
        try:
            subprocess.run(['node', '--version'], capture_output=True, check=True)
        except FileNotFoundError:
            raise RuntimeError('请先安装 Node.js: https://nodejs.org')

        # 获取 JS 文件路径
        self.dir = os.path.dirname(os.path.abspath(__file__))
        self.engine = os.path.join(self.dir, 'xrl-engine.js')
        self.parser = os.path.join(self.dir, 'xrl-parser.js')

    def _run_js(self, code):
        """执行 JS 代码并返回 JSON 结果"""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8') as f:
            f.write(code)
            tmpfile = f.name

        try:
            result = subprocess.run(
                ['node', tmpfile],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip())
            return json.loads(result.stdout.strip())
        finally:
            os.unlink(tmpfile)

    def execute(self, commands, rows=50, cols=20):
        """
        执行 XRL 指令
        :param commands: XRL 指令列表
        :param rows: 行数
        :param cols: 列数
        :return: dict {'data': {...}, 'formats': {...}}
        """
        code = f'''
const XRLEngine = require('{self.engine.replace(chr(92), '/')}');
const state = XRLEngine.createState({rows}, {cols});
const cmds = {json.dumps(commands)};
const result = XRLEngine.execute(state, cmds);
console.log(JSON.stringify({{ data: result.state.cellData, formats: result.state.cellFormats }}));
'''
        return self._run_js(code)

    def parse(self, text):
        """
        从自然语言生成 XRL 指令
        :param text: 自然语言文本
        :return: list XRL 指令列表
        """
        code = f'''
const XRLParser = require('{self.parser.replace(chr(92), '/')}');
const cmds = XRLParser.parseNaturalLanguage({json.dumps(text)});
console.log(JSON.stringify(cmds || []));
'''
        return self._run_js(code)

    def parse_and_execute(self, text, rows=50, cols=20):
        """
        解析自然语言并执行
        :param text: 自然语言文本
        :param rows: 行数
        :param cols: 列数
        :return: dict {'data': {...}, 'formats': {...}, 'commands': [...]}
        """
        commands = self.parse(text)
        if not commands:
            return {'data': {}, 'formats': {}, 'commands': []}
        result = self.execute(commands, rows, cols)
        result['commands'] = commands
        return result

    def validate(self, command):
        """
        验证单条指令
        :param command: XRL 指令字符串
        :return: bool
        """
        code = f'''
const XRLEngine = require('{self.engine.replace(chr(92), '/')}');
const r = XRLEngine.validateCommand({json.dumps(command)});
console.log(JSON.stringify(r.valid));
'''
        return self._run_js(code)


# ==================== 使用示例 ====================
if __name__ == '__main__':
    xrl = XRL()

    # 示例1：执行纯指令
    print("=== 示例1：执行指令 ===")
    result = xrl.execute([
        'xr/A1/姓名',
        'xr/B1/分数',
        'xr/A2/张三',
        'xr/B2/85',
        'xr/A3/李四',
        'xr/B3/92',
        'xr/A4/合计',
        'sum/B2:B3/B4',
        'bg/HEADER/蓝色背景',
        'ct/A4'
    ])
    print(result['data'])   # {'A1': '姓名', 'B1': '分数', 'A2': '张三', 'B2': '85', ...}

    # 示例2：自然语言解析
    print("\n=== 示例2：自然语言解析 ===")
    result = xrl.parse_and_execute('张三85分，李四92分，王五78分')
    print(result['data'])       # 表格数据
    print(result['commands'])   # 生成的指令

    # 示例3：验证指令
    print("\n=== 示例3：验证指令 ===")
    print(xrl.validate('xr/A1/hello'))     # True
    print(xrl.validate('bad command'))     # False