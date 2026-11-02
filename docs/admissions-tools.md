# 招生资料辅助脚本

这些脚本不属于《山海之凶兽》网站运行依赖。它们保留在源码中供后续私有迁移评估；不要把仓库根目录整体作为网站发布目录。

`fill_form.js` 和 `fill_volunteer_table.js` 不再内置考生资料。将 `candidate.example.json` 复制为被忽略的 `candidate.local.json`，仅在本地填写。也可以使用被忽略的 `private-data/` 目录。禁止把真实配置、输入工作簿或生成结果提交到公开仓库。

```sh
node fill_form.js candidate.local.json
node fill_volunteer_table.js candidate.local.json
```

也可通过 `CANDIDATE_CONFIG` 指定私有 JSON 路径。命令行参数优先。示例所有值均为空，占位示例不能直接运行；缺少配置、JSON 错误或字段无效时，在加载 `xlsx`、打开或写入工作簿之前报错。

字段：`name`、`ethnicity`、`subjectCombination`、`gender`、`region` 为非空字符串；`subjects` 为按原模板顺序填写的三个非空科目名；`totalScore` 为非负有限数值，`rank` 为正整数。所有字符串上限为 200 字符。

此次改动只把个人资料改为显式本地输入。原有筛选条件、院校列表、分层区间和年份数据仍是特定情境的脚本逻辑，并不会根据新考生的分数、位次自动重新计算。必须人工核对当前招生规则、科目组合、年份和模板适配；不要将其作为通用志愿推荐工具。两个原始脚本的选科描述曾不一致，现统一从同一个配置读取。

原始 Excel/PDF 输入未随仓库提交，其他脚本仍有本地路径。不要为让程序运行而把原始个人资料重新上传。`fill_volunteer_table.js` 沿用原有输出位置及覆盖行为，运行前在私有位置备份工作簿。

辅助依赖中的 `xlsx@0.18.5` 存在已公开的工作簿解析安全公告。正式使用前应按 [SheetJS 官方安装文档](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/) 迁移到修复版本，并用业务样本验证兼容性；本次不在缺少原始工作簿的情况下擅自更换解析器。不要用旧依赖处理来源不明的工作簿。

离线验证：`node --test tests/candidate-profile.test.js`。测试使用合成配置和内存工作簿替身，不读取真实招生文件，不连接第三方服务。
