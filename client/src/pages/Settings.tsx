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
import { toast } from "sonner";
import { Loader2, ArrowLeft, Bell, Shield, Clock, Mail } from "lucide-react";

export default function Settings() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useCustomAuth();
  
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [reminderHour, setReminderHour] = useState(8);
  
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

  const handleSave = () => {
    updateSettingsMutation.mutate({
      reminderEnabled,
      reminderEmail: reminderEnabled ? reminderEmail : null,
      reminderHour,
    });
  };

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
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
                onClick={handleSave}
                disabled={updateSettingsMutation.isPending}
              >
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  "保存设置"
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
