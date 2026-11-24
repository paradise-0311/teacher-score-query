# GitHub Pages 查分版

老师端只提供姓名查询；沿用原查询组件、排版、同名选择与排名算法。无需服务器、数据库或教师登录。用户已明确选择公开静态数据的方式。

## 首次上线

仓库：`paradise-0311/teacher-score-query`。

GitHub Settings → Pages → Deploy from a branch → `main` → `/docs` → Save。

正式地址：`https://paradise-0311.github.io/teacher-score-query/`。

首次发布的 `docs/scores.json` 为空。按用户要求，等待今天的“科一 全真模拟”录分后再发布，不包含既往已录入的成绩，也不包含演示成绩。

## 用浏览器更新成绩

1. 打开网站的 `prepare.html`（成绩文件准备页）。
2. 选择已登分的 `.xlsx`，核对考试列、人数、满分、缺考及未录入记录。
3. 如需更新已有考试，在“保存到哪场考试”选择原考试。
4. 点击“加入待发布成绩”。可依次加入多场，其他已发布考试会保留。
5. 点击“下载成绩文件”，得到 `scores.json`。
6. 打开 GitHub 仓库的 `docs` 文件夹，Add file → Upload files，上传新的 `scores.json` 并提交。GitHub Pages 部署完成后即可查询。

生成页只在浏览器处理 Excel，不会自动把 Excel 或新成绩上传到服务器，也不能直接修改线上成绩。只保留当前页面时，未下载的调整不会跨设备同步。下载后仍需完成第6步。

## 用命令行更新成绩

```powershell
node scripts/import-scores.mjs --file "登分表.xlsx" --list
node scripts/import-scores.mjs --file "登分表.xlsx" --exam "科一 全真模拟"
```

脚本更新 `docs/scores.json`，保持其他场次，覆盖已有场次前在忽略的 `work/score-backups` 中保存备份。改名或调整日期时可用 `--id 原考试编号` 明确覆盖目标，避免新建场次。默认暂定排名；加 `--final` 取消暂定标记。

将更新后的 `docs/scores.json` 提交并推送到 GitHub 即可，不需要重新构建网页。

## 开发和构建

```powershell
npm ci
npm run dev:pages
npm run test:scores
npm run build:pages
npm run preview:pages
```

`pages/` 提供静态入口；查询与原服务器版本共用 `app/teacher-query.tsx`、`app/components.tsx`、`app/globals.css`。`lib/static-scores.mjs` 提供静态数据校验与查询，继续使用 `lib/scoring.mjs` 和 `lib/excel.mjs`。

构建产物位于 `docs/`，相对资源路径可用于 GitHub 仓库子目录。重建时保留 `docs/scores.json`，不会将已发布成绩还原为空。仅 `docs/` 是 GitHub Pages 的发布范围。源代码、原服务器版本和维护文档保留在其他目录。

## 计算规则

- 排名只包含有效实考分数；真实0分参与。
- 并列采用1、2、2、4的竞赛排名。
- 百分位为严格低于该老师分数的人数／实考人数，同分不算被超过，保留一位小数。
- 缺考、不参培和待录入不参与排名；整场无有效成绩时不允许加入发布文件。
- 同名先选择部门和考场，再显示对应记录。

静态数据随网页公开下载，姓名查询不是数据访问权限控制。该方式已由用户确认接受。
