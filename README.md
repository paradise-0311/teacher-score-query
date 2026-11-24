# 领世研习所 · 教资成绩查询

面向手机和电脑的教资模拟考试查分网页。老师选择考试、输入姓名，即可查看成绩、排名和百分位次。

当前使用 **GitHub Pages 静态部署**，无需独立服务器或数据库。首次上线为空，待本次模拟考试完成登分后发布。

- [老师查分](https://paradise-0311.github.io/teacher-score-query/)
- [成绩文件准备](https://paradise-0311.github.io/teacher-score-query/prepare.html)
- [部署与成绩更新说明](GITHUB-PAGES.md)

## 更新成绩

在成绩文件准备页导入 Excel → 加入待发布成绩 → 下载 scores.json → 上传到仓库 docs 文件夹并提交。部署完成后，老师可使用同一网址查询。

同名选择、缺考、未录入、不参培和真实0分保持区分；排名及百分位继续使用原有算法。

## 开发

```text
npm ci
npm run dev:pages
npm run test:scores
npm run build:pages
```

构建产物在 docs，GitHub Pages 从 main 分支的 /docs 发布。成绩只需更新 docs/scores.json，重建会保留它。

原服务器版本源码保留，原 Sites 技术文档见 [README.sites.md](README.sites.md)。本仓库不包含环境密钥、数据库文件或原始 Excel。
