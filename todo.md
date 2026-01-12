# 每日签到应用 - 项目 TODO

## 数据库设计
- [x] 创建 users 表（自定义认证，包含 username, password_hash）
- [x] 创建 emergency_contacts 表
- [x] 创建 check_ins 表

## 后端 API
- [x] POST /api/auth/register - 用户注册
- [x] POST /api/auth/login - 用户登录
- [x] GET /api/auth/me - 获取当前用户信息
- [x] POST /api/auth/logout - 用户登出
- [x] POST /api/check-ins - 执行今日签到
- [x] GET /api/check-ins/status - 获取签到状态
- [x] GET /api/contacts - 获取所有紧急联系人
- [x] POST /api/contacts - 添加紧急联系人
- [x] DELETE /api/contacts/:id - 删除紧急联系人

## 定时任务与邮件
- [x] 配置 SendGrid 邮件服务
- [x] 实现每日 UTC 01:00 定时任务
- [x] 实现未签到用户检测逻辑
- [x] 实现邮件发送功能

## 前端页面
- [x] /register - 注册页面（含密码强度指示器）
- [x] /login - 登录页面
- [x] / - 主面板（签到按钮、状态显示）
- [x] /contacts - 紧急联系人管理页面

## 测试
- [x] 用户认证测试
- [x] 签到功能测试
- [x] 紧急联系人管理测试

## 部署
- [x] 上传代码到 GitHub: https://github.com/imusschinkerto826-crypto/daily-checkin-app


## 邮件服务更新
- [x] 将 SendGrid 替换为 163 邮箱 SMTP
- [x] 配置 SMTP 环境变量

## 测试邮件功能
- [x] 添加发送测试邮件 API
- [x] 在前端添加发送测试邮件按钮

## 签到邮件提醒功能
- [x] 在用户表中添加提醒邮箱和提醒时间字段
- [x] 创建定时任务发送签到提醒邮件
- [x] 添加前端设置页面让用户配置提醒
- [x] 编写相关测试

## 修改密码功能
- [x] 添加修改密码后端 API
- [x] 在设置页面添加修改密码表单
- [x] 编写相关测试

## Bug 修复
- [x] 修复设置页面返回时出现的 NotFoundError: removeChild 错误
  - 移除 Link 内部嵌套的 Button 组件
  - 直接在 Link 上应用样式

## 代码审查与 Bug 修复
- [x] 检查前端组件代码
- [x] 检查后端 API 代码
- [x] 修复发现的问题
  - 修复 Link 和 Button 嵌套导致的 DOM 结构问题
  - 抽取公共 getCurrentUser 函数到 utils/auth.ts
  - 重构所有路由文件使用公共工具函数

## 版本同步
- [x] 修复发布版本同步问题
