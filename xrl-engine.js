/**
 * ============================================================
 *  XRL 汇编引擎 v1.0
 *  XRL (eXtensible Rule Language) - 可扩展规则语言
 *  用于表格数据操作、计算、格式化
 * ============================================================
 
 /**
 * XRL Engine v1.0
 * 
 * 作者：北海
 * 邮箱：m19315506254@163.com
 * 微信：NT_88888888888
 */
 */
(function(global) {
  'use strict';

  // ==================== 颜色样式映射表 ====================
  const COLOR_STYLES = {
    '红色背景': { bg: '#FFE0E0', color: '#CC0000' },
    '绿色背景': { bg: '#D4EDDA', color: '#155724' },
    '黄色背景': { bg: '#FFF3CD', color: '#856404' },
    '蓝色背景': { bg: '#E0F0FF', color: '#004085' },
    '橙色背景': { bg: '#FFE5CC', color: '#CC5500' },
    '紫色背景': { bg: '#F3E0FF', color: '#6A0DAD' },
    '灰色背景': { bg: '#F0F0F0', color: '#333333' },
    '粉色背景': { bg: '#FFE0EC', color: '#CC0055' },
    '青色背景': { bg: '#E0FFFF', color: '#006666' },
    '红底': { bg: '#FFE0E0', color: '#CC0000' },
    '绿底': { bg: '#D4EDDA', color: '#155724' },
    '黄底': { bg: '#FFF3CD', color: '#856404' },
    '蓝底': { bg: '#E0F0FF', color: '#004085' },
    '橙底': { bg: '#FFE5CC', color: '#CC5500' },
    '紫底': { bg: '#F3E0FF', color: '#6A0DAD' },
    '灰底': { bg: '#F0F0F0', color: '#333333' },
    '红背景': { bg: '#FFE0E0', color: null },
    '绿背景': { bg: '#D4EDDA', color: null },
    '黄背景': { bg: '#FFF3CD', color: null },
    '蓝背景': { bg: '#E0F0FF', color: null },
    '不及格': { bg: '#FFE0E0', color: '#CC0000' },
    '优秀': { bg: '#D4EDDA', color: '#155724' },
    '良好': { bg: '#E0F0FF', color: '#004085' },
    '警告': { bg: '#FFF3CD', color: '#856404' },
    '危险': { bg: '#FFE0E0', color: '#CC0000' },
    '合计背景': { bg: '#E8F5E9', color: '#2E7D32' },
    '总分背景': { bg: '#FFF9E0', color: '#996600' },
    '平均背景': { bg: '#F0F0F0', color: '#333333' },
  };

  const COLOR_MAP = {
    '红色': '#FF0000', '红': '#FF0000', 'red': '#FF0000',
    '蓝色': '#0000FF', '蓝': '#0000FF', 'blue': '#0000FF',
    '绿色': '#008000', '绿': '#008000', 'green': '#008000',
    '黄色': '#CCCC00', '黄': '#CCCC00', 'yellow': '#CCCC00',
    '橙色': '#FF8C00', '橙': '#FF8C00', 'orange': '#FF8C00',
    '紫色': '#800080', '紫': '#800080', 'purple': '#800080',
    '白色': '#FFFFFF', '白': '#FFFFFF', 'white': '#FFFFFF',
    '黑色': '#000000', '黑': '#000000', 'black': '#000000',
    '灰色': '#888888', '灰': '#888888', 'gray': '#888888',
  };

  // ==================== 单元格工具函数 ====================

  /**
   * 将列索引转换为列字母
   * @param {number} index - 列索引 (0=A, 1=B, ..., 25=Z, 26=AA)
   * @returns {string} 列字母
   */
  function getColumnLetter(index) {
    let r = '';
    while (index >= 0) {
      r = String.fromCharCode(65 + (index % 26)) + r;
      index = Math.floor(index / 26) - 1;
    }
    return r;
  }

  /**
   * 将列字母转换为列索引
   * @param {string} letter - 列字母 (A=0, B=1, ..., AA=26)
   * @returns {number} 列索引
   */
  function getColumnIndex(letter) {
    let idx = 0;
    for (let i = 0; i < letter.length; i++) {
      idx = idx * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
    }
    return idx - 1;
  }

  /**
   * 生成单元格键名
   * @param {number} row - 行索引 (0-based)
   * @param {number} col - 列索引 (0-based)
   * @returns {string} 单元格键名 (如 "A1")
   */
  function getCellKey(row, col) {
    return getColumnLetter(col) + (row + 1);
  }

  /**
   * 解析单元格引用
   * @param {string} ref - 单元格引用 (如 "B5")
   * @returns {Object|null} {row, col} 或 null
   */
  function parseCellRef(ref) {
    const m = ref.match(/^([A-Z]+)(\d+)$/i);
    if (!m) return null;
    return {
      row: parseInt(m[2]) - 1,
      col: getColumnIndex(m[1].toUpperCase())
    };
  }

  /**
   * 解析范围引用
   * @param {string} range - 范围引用 (如 "B2:D5")
   * @returns {Object|null} {start:{row,col}, end:{row,col}} 或 null
   */
  function parseRange(range) {
    if (!range || !range.includes(':')) {
      const p = parseCellRef(range);
      return p ? { start: p, end: p } : null;
    }
    const parts = range.split(':');
    if (parts.length < 2) return null;
    const sp = parseCellRef(parts[0]);
    const ep = parseCellRef(parts[1]);
    return (sp && ep) ? { start: sp, end: ep } : null;
  }

  /**
   * 从值中提取数字（支持带单位的值如"85分"、"120万"）
   * @param {*} val - 任意值
   * @returns {number} 提取的数字，无法提取时返回 NaN
   */
  function extractNumber(val) {
    if (val === undefined || val === null || val === '') return NaN;
    const match = String(val).match(/[-]?\d+(?:\.\d+)?/);
    return match ? parseFloat(match[0]) : NaN;
  }

  /**
   * 检查值是否为数字
   * @param {*} val - 任意值
   * @returns {boolean}
   */
  function isNumeric(val) {
    return !isNaN(extractNumber(val));
  }

  // ==================== 颜色解析 ====================

  /**
   * 解析颜色名称到颜色值
   * @param {string} colorName - 颜色名称
   * @returns {string|null} 颜色值（#RRGGBB）
   */
  function resolveColor(colorName) {
    if (!colorName) return null;
    const n = colorName.trim();
    if (COLOR_MAP[n]) return COLOR_MAP[n];
    if (/^#[0-9a-fA-F]{6}$/.test(n)) return n;
    return null;
  }

  /**
   * 解析背景色名称到样式配置
   * @param {string} colorName - 颜色名称
   * @returns {Object|null} {bg, color} 或 null
   */
  function resolveBgColor(colorName) {
    if (!colorName) return null;
    const n = colorName.trim();

    // 精确匹配
    if (COLOR_STYLES[n]) return COLOR_STYLES[n];

    // 尝试添加"背景"/"底"后缀
    if (COLOR_STYLES[n + '背景']) return COLOR_STYLES[n + '背景'];
    if (COLOR_STYLES[n + '底']) return COLOR_STYLES[n + '底'];

    // 模糊匹配
    for (const key of Object.keys(COLOR_STYLES)) {
      if (key.includes(n) || n.includes(key)) return COLOR_STYLES[key];
    }

    // 直接颜色值
    if (/^#[0-9a-fA-F]{6}$/.test(n)) return { bg: n, color: null };

    return null;
  }

  // ==================== 条件评估 ====================

  /**
   * 比较两个值
   * @param {*} a - 左值
   * @param {string} operator - 运算符
   * @param {*} b - 右值
   * @returns {boolean}
   */
  function compareValues(a, operator, b) {
    switch (operator) {
      case '>':  return a > b;
      case '<':  return a < b;
      case '>=': return a >= b;
      case '<=': return a <= b;
      case '==': return a == b;
      case '!=': return a != b;
      default:   return false;
    }
  }

  /**
   * 评估条件表达式
   * 
   * 支持的格式：
   *   "<60"          - 值小于60
   *   ">=90"         - 值大于等于90
   *   "==100"        - 值等于100
   *   "A1>60"        - 单元格A1大于60
   *   "B2<=50"       - 单元格B2小于等于50
   * 
   * @param {string} condition - 条件表达式
   * @param {*} cellValue - 要比较的单元格值
   * @returns {boolean} 条件是否满足
   */
  function evaluateCondition(condition, cellValue) {
    if (!condition) return false;

    // 格式1：简化格式 - 运算符+阈值 (如 "<60", ">=90")
    const simpleMatch = condition.match(/^(>=|<=|>|<|==|!=)\s*(.+)$/);
    if (simpleMatch) {
      const operator = simpleMatch[1];
      const threshold = parseFloat(simpleMatch[2]);
      const numCell = extractNumber(cellValue);
      if (!isNaN(numCell) && !isNaN(threshold)) {
        return compareValues(numCell, operator, threshold);
      }
      return false;
    }

    // 格式2：单元格引用格式 - 单元格+运算符+值 (如 "A1>=60")
    const cellMatch = condition.match(/^([A-Z]+\d+)\s*(>=|<=|>|<|==|!=)\s*(.+)$/i);
    if (cellMatch) {
      const operator = cellMatch[2];
      const compareValue = cellMatch[3].trim();
      const numCell = extractNumber(cellValue);
      const numCompare = parseFloat(compareValue);
      if (!isNaN(numCell) && !isNaN(numCompare)) {
        return compareValues(numCell, operator, numCompare);
      }
      // 字符串比较
      const strCell = String(cellValue || '').trim();
      return compareValues(strCell, operator, compareValue);
    }

    return false;
  }

  // ==================== XRL 指令执行器 ====================

  /**
   * 执行单条指令
   * @param {Object} working - 工作状态
   * @param {string} cmd - 指令字符串
   * @returns {Object} {success, error?}
   */
  function executeSingleCommand(working, cmd) {
    const parts = cmd.split('/');
    const type = parts[0].toLowerCase().trim();

    switch (type) {

      // ---- 数据操作指令 ----

      case 'xr': {
        // xr/地址/内容
        if (parts.length < 3) return { success: false, error: 'xr 需要地址和内容' };
        const addr = parts[1].toUpperCase().trim();
        const content = parts.slice(2).join('/');
        const pos = parseCellRef(addr);
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `xr: 无效地址 ${addr}` };
        }
        working.cellData[getCellKey(pos.row, pos.col)] = content || '';
        return { success: true };
      }

      case 'sum': {
        // sum/范围/目标
        if (parts.length < 3 || !parts[1].includes(':')) {
          return { success: false, error: 'sum: 格式应为 sum/范围/目标' };
        }
        const rinfo = parseRange(parts[1].toUpperCase().trim());
        const tpos = parseCellRef(parts[2].toUpperCase().trim());
        if (!rinfo || !tpos) return { success: false, error: 'sum: 无效范围或目标' };
        let sum = 0, hasValue = false;
        for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
          for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
            const v = extractNumber(working.cellData[getCellKey(r, c)]);
            if (!isNaN(v)) { sum += v; hasValue = true; }
          }
        }
        working.cellData[getCellKey(tpos.row, tpos.col)] = hasValue ? sum.toString() : '0';
        return { success: true };
      }

      case 'avg': {
        // avg/范围/目标
        if (parts.length < 3 || !parts[1].includes(':')) {
          return { success: false, error: 'avg: 格式应为 avg/范围/目标' };
        }
        const rinfo = parseRange(parts[1].toUpperCase().trim());
        const tpos = parseCellRef(parts[2].toUpperCase().trim());
        if (!rinfo || !tpos) return { success: false, error: 'avg: 无效范围或目标' };
        let sum = 0, cnt = 0;
        for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
          for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
            const v = extractNumber(working.cellData[getCellKey(r, c)]);
            if (!isNaN(v)) { sum += v; cnt++; }
          }
        }
        working.cellData[getCellKey(tpos.row, tpos.col)] = cnt > 0 ? (sum / cnt).toFixed(2) : '0';
        return { success: true };
      }

      case 'sub': {
        // sub/被减数/减数/目标
        if (parts.length < 4) return { success: false, error: 'sub: 格式应为 sub/A/B/C' };
        const aPos = parseCellRef(parts[1].toUpperCase().trim());
        const bPos = parseCellRef(parts[2].toUpperCase().trim());
        const tPos = parseCellRef(parts[3].toUpperCase().trim());
        if (!aPos || !bPos || !tPos) return { success: false, error: 'sub: 无效地址' };
        const aV = extractNumber(working.cellData[getCellKey(aPos.row, aPos.col)]);
        const bV = extractNumber(working.cellData[getCellKey(bPos.row, bPos.col)]);
        const result = (isNaN(aV) ? 0 : aV) - (isNaN(bV) ? 0 : bV);
        working.cellData[getCellKey(tPos.row, tPos.col)] = result.toString();
        return { success: true };
      }

      case 'max': {
        // max/范围/目标
        if (parts.length < 3 || !parts[1].includes(':')) {
          return { success: false, error: 'max: 格式应为 max/范围/目标' };
        }
        const rinfo = parseRange(parts[1].toUpperCase().trim());
        const tpos = parseCellRef(parts[2].toUpperCase().trim());
        if (!rinfo || !tpos) return { success: false, error: 'max: 无效范围或目标' };
        let maxV = -Infinity, hasV = false;
        for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
          for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
            const v = extractNumber(working.cellData[getCellKey(r, c)]);
            if (!isNaN(v) && v > maxV) { maxV = v; hasV = true; }
          }
        }
        working.cellData[getCellKey(tpos.row, tpos.col)] = hasV ? maxV.toString() : '0';
        return { success: true };
      }

      case 'min': {
        // min/范围/目标
        if (parts.length < 3 || !parts[1].includes(':')) {
          return { success: false, error: 'min: 格式应为 min/范围/目标' };
        }
        const rinfo = parseRange(parts[1].toUpperCase().trim());
        const tpos = parseCellRef(parts[2].toUpperCase().trim());
        if (!rinfo || !tpos) return { success: false, error: 'min: 无效范围或目标' };
        let minV = Infinity, hasV = false;
        for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
          for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
            const v = extractNumber(working.cellData[getCellKey(r, c)]);
            if (!isNaN(v) && v < minV) { minV = v; hasV = true; }
          }
        }
        working.cellData[getCellKey(tpos.row, tpos.col)] = hasV ? minV.toString() : '0';
        return { success: true };
      }

      case 'if': {
        // if/条件/真值/假值/目标
        if (parts.length < 5) return { success: false, error: 'if: 格式应为 if/条件/真值/假值/目标' };
        const tpos = parseCellRef(parts[4].toUpperCase().trim());
        if (!tpos || tpos.row >= working.rows || tpos.col >= working.cols) {
          return { success: false, error: 'if: 无效目标地址' };
        }
        const cellKey = getCellKey(tpos.row, tpos.col);
        const cellVal = working.cellData[cellKey] || '';
        working.cellData[cellKey] = evaluateCondition(parts[1], cellVal) ? parts[2] : parts[3];
        return { success: true };
      }

      case 'mul': {
        // mul/乘数A/乘数B/目标 (乘法)
        if (parts.length < 4) return { success: false, error: 'mul: 格式应为 mul/A/B/C' };
        const aPos = parseCellRef(parts[1].toUpperCase().trim());
        const bPos = parseCellRef(parts[2].toUpperCase().trim());
        const tPos = parseCellRef(parts[3].toUpperCase().trim());
        if (!aPos || !bPos || !tPos) return { success: false, error: 'mul: 无效地址' };
        const aV = extractNumber(working.cellData[getCellKey(aPos.row, aPos.col)]);
        const bV = extractNumber(working.cellData[getCellKey(bPos.row, bPos.col)]);
        const result = (isNaN(aV) ? 0 : aV) * (isNaN(bV) ? 0 : bV);
        working.cellData[getCellKey(tPos.row, tPos.col)] = result.toString();
        return { success: true };
      }

      case 'div': {
        // div/被除数/除数/目标 (除法)
        if (parts.length < 4) return { success: false, error: 'div: 格式应为 div/A/B/C' };
        const aPos = parseCellRef(parts[1].toUpperCase().trim());
        const bPos = parseCellRef(parts[2].toUpperCase().trim());
        const tPos = parseCellRef(parts[3].toUpperCase().trim());
        if (!aPos || !bPos || !tPos) return { success: false, error: 'div: 无效地址' };
        const aV = extractNumber(working.cellData[getCellKey(aPos.row, aPos.col)]);
        const bV = extractNumber(working.cellData[getCellKey(bPos.row, bPos.col)]);
        if (isNaN(bV) || bV === 0) {
          working.cellData[getCellKey(tPos.row, tPos.col)] = '#DIV/0!';
        } else {
          const result = (isNaN(aV) ? 0 : aV) / bV;
          working.cellData[getCellKey(tPos.row, tPos.col)] = result.toFixed(4);
        }
        return { success: true };
      }

      case 'count': {
        // count/范围/目标 (计数)
        if (parts.length < 3 || !parts[1].includes(':')) {
          return { success: false, error: 'count: 格式应为 count/范围/目标' };
        }
        const rinfo = parseRange(parts[1].toUpperCase().trim());
        const tpos = parseCellRef(parts[2].toUpperCase().trim());
        if (!rinfo || !tpos) return { success: false, error: 'count: 无效范围或目标' };
        let cnt = 0;
        for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
          for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
            const v = working.cellData[getCellKey(r, c)];
            if (v !== undefined && v !== null && v !== '') cnt++;
          }
        }
        working.cellData[getCellKey(tpos.row, tpos.col)] = cnt.toString();
        return { success: true };
      }

      // ---- 格式操作指令 ----

      case 'bg': {
        // bg/地址/颜色 或 bg/HEADER/颜色 或 bg/ROW_行号/颜色
        if (parts.length < 3) return { success: false, error: 'bg: 格式应为 bg/目标/颜色' };
        const target = parts[1].toUpperCase().trim();
        const styleConfig = resolveBgColor(parts.slice(2).join('/').trim()) || { bg: '#E0F0FF', color: null };

        if (target === 'HEADER') {
          for (let c = 0; c < working.cols; c++) {
            const k = getCellKey(0, c);
            if (!working.cellFormats[k]) working.cellFormats[k] = {};
            if (styleConfig.bg) working.cellFormats[k].bgColor = styleConfig.bg;
            if (styleConfig.color) working.cellFormats[k].color = styleConfig.color;
          }
          return { success: true };
        }

        if (target.startsWith('ROW_')) {
          const rn = parseInt(target.split('_')[1]) - 1;
          if (!isNaN(rn) && rn >= 0 && rn < working.rows) {
            for (let c = 0; c < working.cols; c++) {
              const k = getCellKey(rn, c);
              if (!working.cellFormats[k]) working.cellFormats[k] = {};
              if (styleConfig.bg) working.cellFormats[k].bgColor = styleConfig.bg;
              if (styleConfig.color) working.cellFormats[k].color = styleConfig.color;
            }
            return { success: true };
          }
          return { success: false, error: `bg: 无效行号 ${target}` };
        }

        const pos = parseCellRef(target);
        if (pos && pos.row < working.rows && pos.col < working.cols) {
          const k = getCellKey(pos.row, pos.col);
          if (!working.cellFormats[k]) working.cellFormats[k] = {};
          if (styleConfig.bg) working.cellFormats[k].bgColor = styleConfig.bg;
          if (styleConfig.color) working.cellFormats[k].color = styleConfig.color;
          return { success: true };
        }
        return { success: false, error: `bg: 无效地址 ${target}` };
      }

      case 'ct': {
        // ct/地址 (加粗)
        if (parts.length < 2) return { success: false, error: 'ct: 需要地址' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `ct: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].bold = true;
        return { success: true };
      }

      case 'it': {
        // it/地址 (斜体)
        if (parts.length < 2) return { success: false, error: 'it: 需要地址' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `it: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].italic = true;
        return { success: true };
      }

      case 'ul': {
        // ul/地址 (下划线)
        if (parts.length < 2) return { success: false, error: 'ul: 需要地址' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `ul: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].underline = true;
        return { success: true };
      }

      case 'fc': {
        // fc/地址/颜色 (字体颜色)
        if (parts.length < 3) return { success: false, error: 'fc: 格式应为 fc/地址/颜色' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        const colorVal = resolveColor(parts.slice(2).join('/').trim()) || '#000000';
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `fc: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].color = colorVal;
        return { success: true };
      }

      case 'fs': {
        // fs/地址/字号 (字体大小)
        if (parts.length < 3) return { success: false, error: 'fs: 格式应为 fs/地址/字号' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        const size = parseInt(parts[2]);
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `fs: 无效地址 ${parts[1]}` };
        }
        if (isNaN(size) || size < 6 || size > 72) {
          return { success: false, error: `fs: 字号应在6-72之间` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].fontSize = size;
        return { success: true };
      }

      case 'align': {
        // align/地址/对齐方式 (left/center/right)
        if (parts.length < 3) return { success: false, error: 'align: 格式应为 align/地址/对齐方式' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        const alignment = parts[2].toLowerCase().trim();
        if (!['left', 'center', 'right'].includes(alignment)) {
          return { success: false, error: 'align: 对齐方式应为 left/center/right' };
        }
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `align: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        if (!working.cellFormats[k]) working.cellFormats[k] = {};
        working.cellFormats[k].align = alignment;
        return { success: true };
      }

      // ---- 条件格式化指令（延迟执行） ----
      case 'highlight':
      case 'highlightrow':
        // 这些指令需要延迟到数据填充后执行
        return { success: true, deferred: true, cmd: cmd };

      // ---- 结构操作指令 ----
      case 'ar': {
        // ar/数量 (添加行)
        const count = Math.min(50, Math.max(1, parseInt(parts[1]) || 1));
        working.rows = Math.min(500, working.rows + count);
        return { success: true };
      }

      case 'ac': {
        // ac/数量 (添加列)
        const count = Math.min(20, Math.max(1, parseInt(parts[1]) || 1));
        working.cols = Math.min(50, working.cols + count);
        return { success: true };
      }

      case 'cl': {
        // cl/地址 (清除单元格)
        if (parts.length < 2) return { success: false, error: 'cl: 需要地址' };
        const pos = parseCellRef(parts[1].toUpperCase().trim());
        if (!pos || pos.row >= working.rows || pos.col >= working.cols) {
          return { success: false, error: `cl: 无效地址 ${parts[1]}` };
        }
        const k = getCellKey(pos.row, pos.col);
        delete working.cellData[k];
        delete working.cellFormats[k];
        return { success: true };
      }

      case 'mv': {
        // mv/源地址/目标地址 (移动单元格)
        if (parts.length < 3) return { success: false, error: 'mv: 格式应为 mv/源/目标' };
        const src = parseCellRef(parts[1].toUpperCase().trim());
        const dst = parseCellRef(parts[2].toUpperCase().trim());
        if (!src || !dst) return { success: false, error: 'mv: 无效地址' };
        const sk = getCellKey(src.row, src.col);
        const dk = getCellKey(dst.row, dst.col);
        working.cellData[dk] = working.cellData[sk] || '';
        if (working.cellFormats[sk]) {
          working.cellFormats[dk] = JSON.parse(JSON.stringify(working.cellFormats[sk]));
        }
        delete working.cellData[sk];
        delete working.cellFormats[sk];
        return { success: true };
      }

      default:
        return { success: false, error: `未知指令: ${type}` };
    }
  }

  /**
   * 执行延迟的高亮指令
   * @param {Object} working - 工作状态
   * @param {string} cmd - 高亮指令
   * @returns {Object} {success, error?}
   */
  function executeHighlightCommand(working, cmd) {
    const parts = cmd.split('/');
    const type = parts[0].toLowerCase().trim();

    if (type === 'highlight' && parts.length >= 3) {
      const rangeStr = parts[1].toUpperCase().trim();
      const conditionStr = parts[2];
      const styleName = parts[3] || '红色背景';
      const rinfo = parseRange(rangeStr);
      const styleConfig = resolveBgColor(styleName) || COLOR_STYLES['红色背景'];

      if (!rinfo) return { success: false, error: 'highlight: 无效范围' };

      let hc = 0;
      for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
        for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
          const ck = getCellKey(r, c);
          const cellVal = working.cellData[ck] || '';
          if (evaluateCondition(conditionStr, cellVal)) {
            if (!working.cellFormats[ck]) working.cellFormats[ck] = {};
            if (styleConfig.bg) working.cellFormats[ck].bgColor = styleConfig.bg;
            if (styleConfig.color) working.cellFormats[ck].color = styleConfig.color;
            hc++;
          }
        }
      }
      return hc > 0
        ? { success: true, matchedCount: hc }
        : { success: false, error: 'highlight: 无匹配单元格' };
    }

    if (type === 'highlightrow' && parts.length >= 3) {
      const rangeStr = parts[1].toUpperCase().trim();
      const conditionStr = parts[2];
      const styleName = parts[3] || '红色背景';
      const rinfo = parseRange(rangeStr);
      const styleConfig = resolveBgColor(styleName) || COLOR_STYLES['红色背景'];

      if (!rinfo) return { success: false, error: 'highlightrow: 无效范围' };

      let rowCount = 0;
      for (let r = rinfo.start.row; r <= rinfo.end.row && r < working.rows; r++) {
        let rowMatched = false;
        for (let c = rinfo.start.col; c <= rinfo.end.col && c < working.cols; c++) {
          const ck = getCellKey(r, c);
          const cellVal = working.cellData[ck] || '';
          if (evaluateCondition(conditionStr, cellVal)) {
            rowMatched = true;
            break;
          }
        }
        if (rowMatched) {
          for (let c = 0; c < working.cols; c++) {
            const ck = getCellKey(r, c);
            if (!working.cellFormats[ck]) working.cellFormats[ck] = {};
            if (styleConfig.bg) working.cellFormats[ck].bgColor = styleConfig.bg;
            if (styleConfig.color) working.cellFormats[ck].color = styleConfig.color;
          }
          rowCount++;
        }
      }
      return rowCount > 0
        ? { success: true, matchedRowCount: rowCount }
        : { success: false, error: 'highlightrow: 无匹配行' };
    }

    return { success: false, error: '未知高亮指令' };
  }

  // ==================== 主执行入口 ====================

  /**
   * 执行 XRL 指令（主入口）
   * @param {Object} state - 表格状态 {cellData, cellFormats, rows, cols}
   * @param {string|string[]} commandsStr - XRL 指令字符串或数组
   * @returns {Object} {success, successCount, failCount, errors, state}
   */
  function XRLExecute(state, commandsStr) {
    if (!state || !commandsStr) {
      return { success: false, error: '参数错误', state: state };
    }

    // 深拷贝工作状态
    const working = {
      cellData: JSON.parse(JSON.stringify(state.cellData || {})),
      cellFormats: JSON.parse(JSON.stringify(state.cellFormats || {})),
      rows: state.rows || 50,
      cols: state.cols || 20
    };

    // 解析指令列表
    const commandsArray = typeof commandsStr === 'string'
      ? commandsStr.split(/\r?\n/)
      : Array.isArray(commandsStr) ? commandsStr : [];

    let successCount = 0;
    let failCount = 0;
    const errors = [];
    const deferredCommands = [];

    // ---- 第一遍：执行数据指令 ----
    for (const line of commandsArray) {
      const cmd = line.trim();
      if (!cmd || cmd.startsWith('#')) continue;

      const result = executeSingleCommand(working, cmd);

      if (result.deferred) {
        // 延迟执行的指令
        deferredCommands.push(result.cmd);
      } else if (result.success) {
        successCount++;
      } else {
        failCount++;
        if (result.error) errors.push(result.error);
      }
    }

    // ---- 第二遍：执行延迟的高亮指令 ----
    for (const cmd of deferredCommands) {
      const result = executeHighlightCommand(working, cmd);
      if (result.success) {
        successCount++;
      } else {
        failCount++;
        if (result.error) errors.push(result.error);
      }
    }

    return {
      success: true,
      successCount,
      failCount,
      errors,
      state: working
    };
  }

  // ==================== 辅助方法 ====================

  /**
   * 验证 XRL 指令格式
   * @param {string} cmd - 指令字符串
   * @returns {Object} {valid, error?}
   */
  function validateCommand(cmd) {
    const trimmed = cmd.trim();
    if (!trimmed || trimmed.startsWith('#')) return { valid: true };

    const validTypes = [
      'xr', 'sum', 'avg', 'sub', 'max', 'min', 'if',
      'mul', 'div', 'count',
      'bg', 'ct', 'it', 'ul', 'fc', 'fs', 'align',
      'highlight', 'highlightrow',
      'ar', 'ac', 'cl', 'mv'
    ];

    const parts = trimmed.split('/');
    const type = parts[0].toLowerCase().trim();

    if (!validTypes.includes(type)) {
      return { valid: false, error: `未知指令类型: ${type}` };
    }

    const minParts = {
      'xr': 3, 'sum': 3, 'avg': 3, 'sub': 4, 'max': 3, 'min': 3, 'if': 5,
      'mul': 4, 'div': 4, 'count': 3,
      'bg': 3, 'ct': 2, 'it': 2, 'ul': 2, 'fc': 3, 'fs': 3, 'align': 3,
      'highlight': 3, 'highlightrow': 3,
      'ar': 1, 'ac': 1, 'cl': 2, 'mv': 3
    };

    if (parts.length < (minParts[type] || 1)) {
      return { valid: false, error: `${type}: 参数不足，需要至少 ${minParts[type]} 个参数` };
    }

    return { valid: true };
  }

  /**
   * 创建空的表格状态
   * @param {number} rows - 行数
   * @param {number} cols - 列数
   * @returns {Object} 表格状态
   */
  function createState(rows, cols) {
    return {
      cellData: {},
      cellFormats: {},
      rows: rows || 50,
      cols: cols || 20
    };
  }

  /**
   * 将表格状态转换为二维数组（用于渲染）
   * @param {Object} state - 表格状态
   * @returns {Object} {rows, formats, maxRow, maxCol}
   */
  function stateToArray(state) {
    let maxRow = 0, maxCol = 0;
    for (const key of Object.keys(state.cellData)) {
      const m = key.match(/([A-Z]+)(\d+)/);
      if (m) {
        maxRow = Math.max(maxRow, parseInt(m[2]));
        maxCol = Math.max(maxCol, getColumnIndex(m[1]) + 1);
      }
    }

    const rows = [];
    const formats = [];
    for (let r = 0; r < maxRow; r++) {
      const row = [];
      const rowFormats = [];
      for (let c = 0; c < maxCol; c++) {
        const key = getCellKey(r, c);
        row.push(state.cellData[key] || '');
        rowFormats.push(state.cellFormats[key] || {});
      }
      rows.push(row);
      formats.push(rowFormats);
    }

    return { rows, formats, maxRow, maxCol };
  }

  // ==================== 导出 ====================
  const XRLEngine = {
    // 版本
    version: '1.0.0',

    // 核心方法
    execute: XRLExecute,
    executeSingleCommand: executeSingleCommand,
    executeHighlightCommand: executeHighlightCommand,
    validateCommand: validateCommand,
    createState: createState,
    stateToArray: stateToArray,

    // 单元格工具
    getColumnLetter: getColumnLetter,
    getColumnIndex: getColumnIndex,
    getCellKey: getCellKey,
    parseCellRef: parseCellRef,
    parseRange: parseRange,
    extractNumber: extractNumber,
    isNumeric: isNumeric,

    // 颜色工具
    resolveColor: resolveColor,
    resolveBgColor: resolveBgColor,
    COLOR_STYLES: COLOR_STYLES,
    COLOR_MAP: COLOR_MAP,

    // 条件评估
    evaluateCondition: evaluateCondition,
    compareValues: compareValues
  };

  // 支持多种模块系统
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = XRLEngine;
  } else if (typeof define === 'function' && define.amd) {
    define([], function() { return XRLEngine; });
  } else {
    global.XRLEngine = XRLEngine;
  }

})(typeof window !== 'undefined' ? window : global);