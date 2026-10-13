# 知屿 · 本地知识库

基于 Electron、React 和 TypeScript 的桌面应用。左侧管理文档，右侧检索问答。

## 运行

```sh
npm install
npm run dev
```

`npm run check` 检查类型，`npm run build` 构建，`npm test` 运行服务测试。

导入 UTF-8 的 `.txt`、`.md` 文件（每份最大 10 MB），自动建立索引。支持文档搜索、预览、重新索引、删除和带来源的问答历史。问答使用本地关键词匹配与原文摘录，没有接入大语言模型，不会上传文档。

首次启动会创建 `app.getPath('userData')/knowledge-base-data`，Windows 通常为 `%APPDATA%/knowledge-base/knowledge-base-data`。其中 `documents/` 保存副本，`content/` 保存正文，`chunks/` 保存分块，JSON 文件保存元数据、索引和问答历史。界面左下角显示实际路径并可打开目录。重启后自动恢复数据；删除文档不会删除导入前的原文件，历史回答中的摘录仍保留。
