# JT808 报文解析器

JT/T 808-2011 / 2013 / 2019 部标协议报文在线解析工具，支持主动安全扩展（ADAS / DSM / TPMS / BSD）与 JT/T 1078。

在线访问：https://ssssshql.github.io/jt808-parser/

## 功能

- 粘贴 16 进制报文，自动识别消息 ID、转义还原、校验码验证
- 按字段展示解析值与解析过程，支持位定义展开
- 内置协议文档：消息结构、报警标志与状态位、位置附加信息、主动安全、终端参数
- 内置示例报文，一键加载体验

## 技术栈

Vite 5 + React 18 + TypeScript + Tailwind CSS + Framer Motion

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

> 首次使用需在仓库 Settings → Pages 中将 Source 设置为 **GitHub Actions**。
