# 每日签到应用 (Daily Check-in App)

一款个人安全提醒工具，帮助您每天签到确认安全状态。如果您忘记签到，系统将自动通知您的紧急联系人，确保您的安全得到关注。

## 功能特性

### 用户认证
- 用户名/密码注册登录（自定义认证系统）
- 密码强度指示器
- 密码修改功能
- JWT 会话管理

### 每日签到
- 醒目的签到按钮
- 显示连续签到天数
- 显示上次签到时间
- 每天只能签到一次

### 紧急联系人管理
- 最多添加 3 位紧急联系人
- 支持姓名、邮箱、关系字段
- 联系人增删管理

### 自动邮件提醒
- **未签到提醒**：每日 UTC 01:00 检查，向未签到用户的紧急联系人发送提醒邮件
- **签到提醒**：用户可设置每日签到提醒时间，系统会在指定时间发送提醒邮件
- 支持 163 邮箱 SMTP 服务

## 技术栈

### 前端
- React 19
- TypeScript
- Tailwind CSS 4
- shadcn/ui 组件库
- tRPC 客户端
- wouter 路由

### 后端
- Node.js + Express
- tRPC 服务端
- Drizzle ORM
- MySQL/TiDB 数据库
- bcrypt 密码加密
- JWT 认证
- node-cron 定时任务
- nodemailer 邮件发送

## 项目结构

```
daily-checkin-app/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # UI 组件
│   │   ├── hooks/          # 自定义 Hooks
│   │   ├── pages/          # 页面组件
│   │   └── lib/            # 工具库
│   └── index.html
├── server/                 # 后端代码
│   ├── routers/            # tRPC 路由
│   ├── services/           # 服务模块（邮件、定时任务）
│   ├── utils/              # 工具函数
│   └── db.ts               # 数据库操作
├── drizzle/                # 数据库 Schema
└── shared/                 # 前后端共享代码
```

## 环境变量

| 变量名 | 说明 |
|--------|------|
| `DATABASE_URL` | 数据库连接字符串 |
| `JWT_SECRET` | JWT 签名密钥 |
| `SMTP_USER` | SMTP 邮箱账号 |
| `SMTP_PASS` | SMTP 邮箱授权码 |

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 数据库迁移

```bash
pnpm db:push
```

### 启动开发服务器

```bash
pnpm dev
```

### 运行测试

```bash
pnpm test
```

### 构建生产版本

```bash
pnpm build
pnpm start
```

## API 接口

### 认证相关
- `POST /api/trpc/auth.register` - 用户注册
- `POST /api/trpc/auth.login` - 用户登录
- `GET /api/trpc/auth.me` - 获取当前用户信息
- `POST /api/trpc/auth.logout` - 用户登出
- `POST /api/trpc/auth.changePassword` - 修改密码

### 签到相关
- `POST /api/trpc/checkIns.checkIn` - 执行签到
- `GET /api/trpc/checkIns.status` - 获取签到状态

### 紧急联系人
- `GET /api/trpc/contacts.list` - 获取联系人列表
- `POST /api/trpc/contacts.add` - 添加联系人
- `DELETE /api/trpc/contacts.delete` - 删除联系人

### 签到提醒
- `GET /api/trpc/reminder.getSettings` - 获取提醒设置
- `POST /api/trpc/reminder.updateSettings` - 更新提醒设置

## 许可证

MIT License
