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
- [ ] 上传代码到 GitHub
