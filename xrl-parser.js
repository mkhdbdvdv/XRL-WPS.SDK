/**
 * ============================================================
 *  XRL 编码指令解析器 v1.0
 *  负责将 AI 生成的文本响应解析为 XRL 指令
 *  支持从自然语言中提取数据并生成表格指令
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

  // 依赖 XRLEngine（如果可用）
  const Engine = global.XRLEngine || {};

  /**
   * 获取列字母（独立实现，避免依赖）
   */
  function colLetter(idx) {
    let r = '';
    while (idx >= 0) {
      r = String.fromCharCode(65 + (idx % 26)) + r;
      idx = Math.floor(idx / 26) - 1;
    }
    return r;
  }

  // ==================== 指令提取 ====================

  /**
   * 从 AI 响应文本中提取 XRL 指令
   * @param {string} text - AI 响应文本
   * @returns {string[]} XRL 指令数组
   */
  function extractCommands(text) {
    if (!text) return [];

    // 移除代码块标记
    let cleaned = text.replace(/```[\s\S]*?```/g, function(match) {
      return match.replace(/```/g, '');
    });
    cleaned = cleaned.replace(/^```|```$/g, '');

    // 有效的指令前缀
    const validTypes = [
      'xr/', 'sum/', 'avg/', 'sub/', 'max/', 'min/',
      'if/', 'mul/', 'div/', 'count/',
      'bg/', 'ct/', 'it/', 'ul/', 'fc/', 'fs/', 'align/',
      'highlight/', 'highlightrow/',
      'ar/', 'ac/', 'cl/', 'mv/'
    ];

    return cleaned.split('\n')
      .map(function(line) { return line.trim(); })
      .filter(function(line) {
        if (!line || line.startsWith('#')) return false;
        return validTypes.some(function(type) {
          return line.toLowerCase().startsWith(type);
        });
      });
  }

  /**
   * 判断文本是否包含 XRL 指令
   * @param {string} text - 文本
   * @returns {boolean}
   */
  function hasCommands(text) {
    var cmds = extractCommands(text);
    return cmds.length > 0;
  }

  // ==================== 自然语言解析 ====================

  /**
   * 非名称过滤词列表
   */
  var FILTER_WORDS = [
    '预算', '实际', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理',
    '政治', '音乐', '美术', '体育', '计算机',
    '业绩', '考勤', '团队', '创新', '协作', '沟通', '领导力', '执行力',
    '销售', '合计', '总分', '综合', '评定', '总评',
    '项目', '开发', '采购', '推广', '培训', '运维', '租赁',
    '万', '分', '元', '人', '次', '个', '件', '台', '套',
    '季度', '月份', '销售额', '流量', '转化', '客单价', '退货率', 'GMV',
    '日均', '月均', '同比', '环比', '达成率', '完成率',
    'Q1', 'Q2', 'Q3', 'Q4', 'Q1:', 'Q2:', 'Q3:', 'Q4:'
  ];

  /**
   * 检测文本包含的关键词类型
   * @param {string} text - 文本
   * @returns {Object} 检测结果
   */
  function detectDataType(text) {
    return {
      hasMultipleSubjects: /数学|语文|英语|物理|化学|生物|历史|地理|政治/.test(text),
      hasPerformance: /业绩|考勤|团队|创新|协作|沟通|领导力|执行力/.test(text),
      hasBudget: text.includes('预算') && text.includes('实际'),
      hasQuarterly: /\bQ[1-4]\b/i.test(text),
      hasMonthly: /(\d+)月/.test(text),
      hasCompare: /同比|环比|增长|下降/.test(text),
      hasEcommerce: /流量|转化|客单价|GMV|退货率|UV/.test(text),
    };
  }

  /**
   * 从文本中提取唯一名称
   * @param {string} text - 文本
   * @returns {string[]} 名称数组
   */
  function extractNames(text) {
    var names = text.match(/[\u4e00-\u9fa5]{2,6}(?=[^\u4e00-\u9fa5]|$)/g) || [];
    return names.filter(function(n) {
      return !(/^\d/.test(n)) &&
        n.length >= 2 &&
        FILTER_WORDS.indexOf(n) === -1;
    });
  }

  /**
   * 从文本中提取所有数值
   * @param {string} text - 文本
   * @returns {number[]} 数值数组
   */
  function extractNumbers(text) {
    var matches = text.match(/\d+(?:\.\d+)?/g) || [];
    return matches.map(function(n) { return parseFloat(n); });
  }

  /**
   * 从指定位置后提取数值
   * @param {string} text - 文本
   * @param {number} startIndex - 起始位置
   * @returns {number[]} 数值数组
   */
  function extractNumbersAfter(text, startIndex) {
    var after = text.substring(startIndex);
    var matches = after.match(/\d+(?:\.\d+)?/g) || [];
    return matches.map(function(n) { return parseFloat(n); });
  }

  // ==================== 指令生成 ====================

  /**
   * 生成表头指令
   * @param {string[]} headers - 表头数组
   * @returns {string[]} 指令数组
   */
  function generateHeaderCommands(headers) {
    return headers.map(function(h, i) {
      return 'xr/' + colLetter(i) + '1/' + h;
    });
  }

  /**
   * 生成数据行指令
   * @param {string[][]} dataRows - 数据行数组
   * @param {number} startRow - 起始行号
   * @returns {string[]} 指令数组
   */
  function generateDataCommands(dataRows, startRow) {
    var commands = [];
    for (var r = 0; r < dataRows.length; r++) {
      for (var c = 0; c < dataRows[r].length; c++) {
        var val = dataRows[r][c];
        if (val !== undefined && val !== null) {
          commands.push('xr/' + colLetter(c) + (startRow + r) + '/' + val);
        }
      }
    }
    return commands;
  }

  /**
   * 生成合计行指令
   * @param {number} numCols - 列数
   * @param {number} dataStartRow - 数据起始行
   * @param {number} dataEndRow - 数据结束行
   * @param {number} totalRow - 合计行号
   * @returns {string[]} 指令数组
   */
  function generateTotalCommands(numCols, dataStartRow, dataEndRow, totalRow) {
    var commands = [];
    // 合计标签
    commands.push('xr/A' + totalRow + '/合计');
    // 每列求和
    for (var c = 1; c < numCols; c++) {
      var col = colLetter(c);
      commands.push('sum/' + col + dataStartRow + ':' + col + dataEndRow + '/' + col + totalRow);
    }
    // 样式
    commands.push('bg/ROW_' + totalRow + '/合计背景');
    commands.push('ct/A' + totalRow);
    return commands;
  }

  /**
   * 生成平均行指令
   * @param {number} numCols - 列数
   * @param {number} dataStartRow - 数据起始行
   * @param {number} dataEndRow - 数据结束行
   * @param {number} avgRow - 平均行号
   * @returns {string[]} 指令数组
   */
  function generateAvgCommands(numCols, dataStartRow, dataEndRow, avgRow) {
    var commands = [];
    commands.push('xr/A' + avgRow + '/平均');
    for (var c = 1; c < numCols; c++) {
      var col = colLetter(c);
      commands.push('avg/' + col + dataStartRow + ':' + col + dataEndRow + '/' + col + avgRow);
    }
    commands.push('bg/ROW_' + avgRow + '/平均背景');
    commands.push('ct/A' + avgRow);
    return commands;
  }

  /**
   * 生成条件高亮指令
   * @param {number} numCols - 列数
   * @param {number} dataStartRow - 数据起始行
   * @param {number} dataEndRow - 数据结束行
   * @param {boolean} isScore - 是否为成绩/绩效类数据
   * @returns {string[]} 指令数组
   */
  function generateHighlightCommands(numCols, dataStartRow, dataEndRow, isScore) {
    var commands = [];
    if (!isScore) return commands;

    var firstDataCol = colLetter(1);
    var lastDataCol = colLetter(numCols - 2); // 排除最后一列（总分列）

    var range = firstDataCol + dataStartRow + ':' + lastDataCol + dataEndRow;
    commands.push('highlight/' + range + '/<60/红色背景');
    commands.push('highlight/' + range + '/>=90/绿色背景');

    return commands;
  }

  /**
   * 生成差异列高亮指令
   * @param {number} diffColIndex - 差异列索引
   * @param {number} dataStartRow - 数据起始行
   * @param {number} dataEndRow - 数据结束行
   * @returns {string[]} 指令数组
   */
  function generateDiffHighlightCommands(diffColIndex, dataStartRow, dataEndRow) {
    var col = colLetter(diffColIndex);
    return [
      'highlight/' + col + dataStartRow + ':' + col + dataEndRow + '/<0/红色背景',
      'highlight/' + col + dataStartRow + ':' + col + dataEndRow + '/>=0/绿色背景'
    ];
  }

  // ==================== 各类型数据解析 ====================

  /**
   * 解析成绩/绩效类数据
   */
  function parseScoreData(text) {
    var dataType = detectDataType(text);
    var subjectMatches = text.match(/数学|语文|英语|物理|化学|生物|历史|地理|政治|业绩|考勤|团队|创新|协作|沟通|领导力|执行力/g) || [];
    var uniqueSubjects = [];
    subjectMatches.forEach(function(s) {
      if (uniqueSubjects.indexOf(s) === -1) uniqueSubjects.push(s);
    });

    if (uniqueSubjects.length === 0) return null;

    var headers = ['姓名'].concat(uniqueSubjects).concat(['总分']);
    var names = extractNames(text);
    var uniqueNames = [];
    names.forEach(function(n) {
      if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n);
    });

    var dataRows = [];
    for (var i = 0; i < uniqueNames.length; i++) {
      var name = uniqueNames[i];
      var row = [name];
      var total = 0;
      var nameIdx = text.indexOf(name);
      var nums = extractNumbersAfter(text, nameIdx + name.length);

      for (var k = 0; k < uniqueSubjects.length && k < nums.length; k++) {
        row.push(nums[k].toString());
        total += nums[k];
      }
      while (row.length <= uniqueSubjects.length) row.push('-');
      row.push(total.toString());
      dataRows.push(row);
    }

    return {
      headers: headers,
      dataRows: dataRows,
      isScore: true
    };
  }

  /**
   * 解析预算对比数据
   */
  function parseBudgetData(text) {
    var names = extractNames(text);
    var uniqueNames = [];
    names.forEach(function(n) {
      if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n);
    });

    if (uniqueNames.length === 0) return null;

    var headers = ['项目名称', '预算', '实际', '差异'];
    var dataRows = [];

    for (var i = 0; i < uniqueNames.length; i++) {
      var name = uniqueNames[i];
      var row = [name];
      var nameIdx = text.indexOf(name);
      var nums = extractNumbersAfter(text, nameIdx + name.length);

      if (nums.length >= 2) {
        var budget = nums[0];
        var actual = nums[1];
        var diff = actual - budget;
        row.push(budget.toString());
        row.push(actual.toString());
        row.push((diff >= 0 ? '+' : '') + diff.toString());
        dataRows.push(row);
      }
    }

    return {
      headers: headers,
      dataRows: dataRows,
      isScore: false,
      hasDiff: true,
      diffColIndex: 3
    };
  }

  /**
   * 解析季度/月度数据
   */
  function parsePeriodData(text) {
    var dataType = detectDataType(text);
    var periodMatches = [];
    if (dataType.hasQuarterly) {
      periodMatches = text.match(/Q[1-4]/gi) || [];
    } else if (dataType.hasMonthly) {
      periodMatches = text.match(/\d+月/g) || [];
    }
    var uniquePeriods = [];
    periodMatches.forEach(function(p) {
      var upper = p.toUpperCase();
      if (uniquePeriods.indexOf(upper) === -1) uniquePeriods.push(upper);
    });
    uniquePeriods.sort();

    if (uniquePeriods.length === 0) return null;

    var names = extractNames(text);
    var uniqueNames = [];
    names.forEach(function(n) {
      if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n);
    });

    var headers = ['区域'].concat(uniquePeriods).concat(['合计']);
    var dataRows = [];

    for (var i = 0; i < uniqueNames.length; i++) {
      var name = uniqueNames[i];
      var row = [name];
      var total = 0;
      var nameIdx = text.indexOf(name);
      var nums = extractNumbersAfter(text, nameIdx + name.length);

      for (var k = 0; k < uniquePeriods.length && k < nums.length; k++) {
        row.push(nums[k].toString());
        total += nums[k];
      }
      while (row.length <= uniquePeriods.length) row.push('-');
      row.push(total.toString());
      dataRows.push(row);
    }

    return {
      headers: headers,
      dataRows: dataRows,
      isScore: false
    };
  }

  /**
   * 解析简单数据
   */
  function parseSimpleData(text) {
    var names = extractNames(text);
    var uniqueNames = [];
    names.forEach(function(n) {
      if (uniqueNames.indexOf(n) === -1) uniqueNames.push(n);
    });

    if (uniqueNames.length < 2) return null;

    var headers = ['名称', '数值'];
    var dataRows = [];

    for (var i = 0; i < uniqueNames.length; i++) {
      var name = uniqueNames[i];
      var nameIdx = text.indexOf(name);
      var nums = extractNumbersAfter(text, nameIdx + name.length);
      if (nums.length > 0) {
        dataRows.push([name, nums[0].toString()]);
      }
    }

    return {
      headers: headers,
      dataRows: dataRows,
      isScore: false
    };
  }

  // ==================== 主解析入口 ====================

  /**
   * 从自然语言文本中解析数据并生成 XRL 指令
   * @param {string} rawText - 用户输入的原始文本
   * @returns {string[]|null} XRL 指令数组，无法解析时返回 null
   */
  function parseNaturalLanguage(rawText) {
    if (!rawText || !rawText.trim()) return null;

    var text = rawText.trim();
    var dataType = detectDataType(text);
    var parsed = null;

    // 按优先级尝试各种解析器
    if (dataType.hasBudget) {
      parsed = parseBudgetData(text);
    }
    if (!parsed && (dataType.hasMultipleSubjects || dataType.hasPerformance)) {
      parsed = parseScoreData(text);
    }
    if (!parsed && (dataType.hasQuarterly || dataType.hasMonthly)) {
      parsed = parsePeriodData(text);
    }
    if (!parsed) {
      parsed = parseSimpleData(text);
    }

    if (!parsed || parsed.dataRows.length === 0) return null;

    // 生成指令
    var numCols = parsed.headers.length;
    var dataStartRow = 2;
    var dataEndRow = dataStartRow + parsed.dataRows.length - 1;
    var totalRow = dataEndRow + 1;
    var avgRow = totalRow + 1;

    var commands = [];

    // 表头
    commands = commands.concat(generateHeaderCommands(parsed.headers));

    // 数据行
    commands = commands.concat(generateDataCommands(parsed.dataRows, dataStartRow));

    // 条件高亮
    if (parsed.isScore) {
      commands = commands.concat(generateHighlightCommands(numCols, dataStartRow, dataEndRow, true));
    }
    if (parsed.hasDiff) {
      commands = commands.concat(generateDiffHighlightCommands(parsed.diffColIndex, dataStartRow, dataEndRow));
    }

    // 合计行
    if (parsed.dataRows.length >= 2) {
      commands = commands.concat(generateTotalCommands(numCols, dataStartRow, dataEndRow, totalRow));

      // 平均行
      if (numCols >= 3) {
        commands = commands.concat(generateAvgCommands(numCols, dataStartRow, dataEndRow, avgRow));
      }
    }

    // 表头样式
    commands.push('bg/HEADER/蓝色背景');

    return commands;
  }

  /**
   * 判断文本是否需要生成表格
   * @param {string} text - 文本
   * @returns {boolean}
   */
  function shouldGenerateTable(text) {
    if (!text) return false;
    var hasNumbers = /\d+/.test(text);
    var hasNames = /[\u4e00-\u9fa5]{2,4}/.test(text);
    var keywords = [
      '创建', '生成', '表格', '表',
      '预算', '成绩', '销售', '项目', '数据',
      '分', '万', '元',
      'Q1', 'Q2', 'Q3', 'Q4',
      '数学', '语文', '英语', '物理', '化学',
      '业绩', '考勤', '团队', '创新',
      '流量', '转化', 'GMV', 'UV', '客单价'
    ];
    var hasKeyword = keywords.some(function(kw) {
      return text.includes(kw);
    });
    return (hasNumbers && hasNames) || hasKeyword;
  }

  /**
   * 检测文本是否为纯 XRL 指令
   * @param {string} text - 文本
   * @returns {boolean}
   */
  function isRawXRL(text) {
    if (!text) return false;
    var lines = text.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length === 0) return false;
    var cmdCount = 0;
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.includes('/') && !line.includes('：') && !line.includes(': ')) {
        cmdCount++;
      }
    }
    return cmdCount >= lines.length * 0.7;
  }

  // ==================== 导出 ====================
  var XRLParser = {
    version: '1.0.0',

    // 指令提取
    extractCommands: extractCommands,
    hasCommands: hasCommands,
    isRawXRL: isRawXRL,

    // 自然语言解析
    parseNaturalLanguage: parseNaturalLanguage,
    shouldGenerateTable: shouldGenerateTable,

    // 数据类型检测
    detectDataType: detectDataType,
    extractNames: extractNames,
    extractNumbers: extractNumbers,

    // 子解析器
    parseScoreData: parseScoreData,
    parseBudgetData: parseBudgetData,
    parsePeriodData: parsePeriodData,
    parseSimpleData: parseSimpleData,

    // 指令生成器
    generateHeaderCommands: generateHeaderCommands,
    generateDataCommands: generateDataCommands,
    generateTotalCommands: generateTotalCommands,
    generateAvgCommands: generateAvgCommands,
    generateHighlightCommands: generateHighlightCommands,
    generateDiffHighlightCommands: generateDiffHighlightCommands
  };

  // 支持多种模块系统
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = XRLParser;
  } else if (typeof define === 'function' && define.amd) {
    define(['XRLEngine'], function(XRLEngine) {
      return XRLParser;
    });
  } else {
    global.XRLParser = XRLParser;
  }

})(typeof window !== 'undefined' ? window : global);