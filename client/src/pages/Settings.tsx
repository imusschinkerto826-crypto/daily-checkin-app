import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Bell, Shield, Clock, Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useCustomAuth();
  
  // 签到提醒状态
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderHour, setReminderHour] = useState(8);
  
  // 修改密码状态
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { data: settings, isLoading: settingsLoading } = trpc.reminder.getSettings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const updateSettingsMutation = trpc.reminder.updateSettings.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message || "保存失败，请重试");
    },
  });

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // 清空密码输入框
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (error) => {
      toast.error(error.message || "密码修改失败，请重试");
    },
  });

  // 加载设置
  useEffect(() => {
    if (settings) {
      setReminderEnabled(settings.reminderEnabled);
      setReminderEmail(settings.reminderEmail || "");
      setReminderHour(settings.reminderHour ?? 8);
    }
  }, [settings]);

  // 未登录时重定向到登录页
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleSaveReminder = () => {
    updateSettingsMutation.mutate({
      reminderEnabled,
      reminderEmail: reminderEnabled ? reminderEmail : null,
      reminderHour,
    });
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 前端验证
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error("新密码至少需要6个字符");
      return;
    }

    changePasswordMutation.mutate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
  };

  // 计算密码强度
  const getPasswordStrength = (password: string) => {
    if (!password) return { level: 0, text: "", color: "" };
    
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 10) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return { level: 1, text: "弱", color: "bg-red-500" };
    if (strength <= 3) return { level: 2, text: "中", color: "bg-yellow-500" };
    return { level: 3, text: "强", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(newPassword);

  // 生成小时选项
  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: `${i.toString().padStart(2, "0")}:00 UTC`,
    localLabel: getLocalTimeLabel(i),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">设置</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 修改密码 */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>修改密码</CardTitle>
              </div>
              <CardDescription>
                定期更改密码可以提高账户安全性
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleChangePassword} className="space-y-4">
                {/* 当前密码 */}
                <div className="space-y-2">
                  <Label htmlFor="current-password">当前密码</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      placeholder="请输入当前密码"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 新密码 */}
                <div className="space-y-2">
                  <Label htmlFor="new-password">新密码</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="请输入新密码（至少6个字符）"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {/* 密码强度指示器 */}
                  {newPassword && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength.level
                                ? passwordStrength.color
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        密码强度: {passwordStrength.text}
                      </p>
                    </div>
                  )}
                </div>

                {/* 确认新密码 */}
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">确认新密码</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入新密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">两次输入的密码不一致</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
                >
                  {changePasswordMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      修改中...
                    </>
                  ) : (
                    "修改密码"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 签到提醒设置 */}
          <Card className="shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>签到提醒</CardTitle>
              </div>
              <CardDescription>
                设置每日签到提醒，系统会在指定时间发送邮件提醒您签到
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 启用开关 */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reminder-enabled" className="text-base">启用签到提醒</Label>
                  <p className="text-sm text-muted-foreground">
                    开启后，系统会在您设置的时间发送提醒邮件
                  </p>
                </div>
                <Switch
                  id="reminder-enabled"
                  checked={reminderEnabled}
                  onCheckedChange={setReminderEnabled}
                />
              </div>

              {/* 提醒邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="reminder-email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  提醒邮箱
                </Label>
                <Input
                  id="reminder-email"
                  type="email"
                  placeholder="请输入接收提醒的邮箱地址"
                  value={reminderEmail}
                  onChange={(e) => setReminderEmail(e.target.value)}
                  disabled={!reminderEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  提醒邮件将发送到此邮箱
                </p>
              </div>

              {/* 提醒时间 */}
              <div className="space-y-2">
                <Label htmlFor="reminder-hour" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  提醒时间
                </Label>
                <Select
                  value={reminderHour.toString()}
                  onValueChange={(value) => setReminderHour(parseInt(value))}
                  disabled={!reminderEnabled}
                >
                  <SelectTrigger id="reminder-hour">
                    <SelectValue placeholder="选择提醒时间" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label} ({option.localLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  选择每天发送提醒的时间（显示为 UTC 时间和本地时间）
                </p>
              </div>

              {/* 保存按钮 */}
              <Button
                className="w-full"
                onClick={handleSaveReminder}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存提醒设置"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 提示信息 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Bell className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">关于签到提醒</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>提醒邮件会在您设置的时间发送</li>
                    <li>如果您当天已经签到，则不会收到提醒</li>
                    <li>提醒时间使用 UTC 时区，请根据您的本地时间选择</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

/**
 * 将 UTC 小时转换为本地时间标签
 */
function getLocalTimeLabel(utcHour: number): string {
  const now = new Date();
  now.setUTCHours(utcHour, 0, 0, 0);
  return now.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }) + " 本地";
}
