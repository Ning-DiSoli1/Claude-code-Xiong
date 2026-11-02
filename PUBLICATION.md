# 公开发布边界

## 当前保护措施

- `scripts/build-site.js` 使用精确允许清单输出网站，可用于静态托管；不依赖招生/OCR npm 包。
- `_config.yml` 为现有 Jekyll / GitHub Pages 构建排除已识别的非网站资料。它是部署层排除规则，不是仓库访问控制。新增资料也必须审查，不能依赖这份排除清单自动识别。
- `server.js` 限制可访问的静态文件；其他演示能力保留。
- `.gitignore` 防止常见本地资料被意外新增，不会取消既有文件的跟踪，也不会清除任何历史。
- 考生配置示例不包含个人数据；真实配置保存在 `candidate.local.json`、`*.private.json` 或 `private-data/`，禁止使用 `git add -f` 提交这些文件。

## 仍需完成的资料迁移

招生/OCR 脚本和素材、第三方检测报告及截图有潜在业务价值，应先核实归属、公开权限和私有保存位置，再从公开仓库移出。保留在仓库其他目录、加入 `.gitignore`、或只限制网页发布，都不会停止 GitHub 源码公开访问。

辅助脚本使用的 `xlsx` 旧依赖需要在迁移后的工具项目单独升级和做工作簿回归；不应通过运行不可信工作簿验证其风险。

## 历史清理为单独操作

已经公开的考生数据和第三方资料在旧提交中仍存在。本次普通修复不会抹去它们。历史重写前，应确认准确清除路径/内容、私有备份、全部分支及标签、已有 PR 引用、协作者副本和 Pages 重新发布安排。不要在同一公开仓库创建保留敏感旧历史的备份分支或标签。

重写会更改受影响提交及后续提交的 SHA，需要协调强制更新。GitHub 缓存/PR 引用可能还需 GitHub Support 处理；无法撤回已被第三方下载的副本。若发现有效凭据，应先撤销或轮换。

参考：
- https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
- https://jekyllrb.com/docs/configuration/options/

## 上线验收

修复合并并重新部署后，复核首页、四个专题、图片、资料库搜索、问答和更新日志；检查非网站脚本、检测报告、本地配置路径在网站返回 404。仓库中的原资料和旧 SHA 访问另行处理，不能以网站 404 代替历史清理验收。
