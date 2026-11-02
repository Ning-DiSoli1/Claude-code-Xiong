# 山海之凶兽

《山海经》异兽展示静态网站：四大凶兽专题、作品图片、异兽资料库、站内搜索与本地关键词问答。

问答逻辑运行在浏览器内，目前没有模型 API、模型凭据或服务端大模型调用。

## 网站文件与运行

网站入口为 `index.html`。四个 `*-portfolio.html`、`updates.html`、`shanhaijing-data.js` 与所引用的 `assets/` 图片构成网站。精确发布清单见 `site-manifest.json`（25 个文件）。其他作品素材保留在仓库中。

完整检出后，无需安装 npm 依赖，即可生成独立发布目录：

```sh
node scripts/build-site.js
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist
```

访问 `http://127.0.0.1:8000/`。构建器只复制清单内文件；缺失任何文件时失败；已有输出目录不会被覆盖。再次构建可传入新的输出目录，如 `node scripts/build-site.js dist-next`。

Google Fonts 是可选外部字体，网络不可达时使用 CSS 回退字体。

## 其他项目

- `server.js` / `stock.html` 是股票演示，根路由保持其原有语义，不是本网站必需服务。启动后可单独访问 `/index.html`，但正式部署推荐发布上面的独立目录。
- `gesture-particles.html`、`ppt.html`、`tech-dashboard.html` 是其他演示。
- 招生表格、PDF/OCR 处理脚本及相关素材属于辅助项目。不要为运行静态网站而执行这些脚本或安装其依赖。
- 考生表格脚本要求显式提供本地配置；使用方式见 `docs/admissions-tools.md`。

## 验证

```sh
node --test tests/*.test.js
```

发布与历史资料处理边界见 [PUBLICATION.md](PUBLICATION.md)。
