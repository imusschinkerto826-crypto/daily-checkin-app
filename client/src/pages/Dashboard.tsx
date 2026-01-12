import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Calendar, Flame, Users, LogOut, Shield, Mail, Send, Settings, Bell } from "lucide-react";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading: authLoading, isAuthenticated, logout } = useCustomAuth();
  
  const [isTestEmailDialogOpen, setIsTestEmailDialogOpen] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  
  const { data: status, isLoading: statusLoading, refetch: refetchStatus } = trpc.checkIns.status.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const checkInMutation = trpc.checkIns.checkIn.useMutation({
    onSuccess: (data) => {
      toast.success(`签到成功！连续签到 ${data.streakDays} 天`);
      refetchStatus();
    },
    onError: (error) => {
      toast.error(error.message || "签到失败，请重试");
    },
  });

  const sendTestEmailMutation = trpc.email.sendTest.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setIsTestEmailDialogOpen(false);
      setTestEmail("");
    },
    onError: (error) => {
      toast.error(error.message || "发送失败，请重试");
    },
  });

  // 未登录时重定向到登录页
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "从未签到";
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleSendTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    sendTestEmailMutation.mutate({ email: testEmail });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">每日签到</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              欢迎, <span className="font-medium text-foreground">{user?.username}</span>
            </span>
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="h-5 w-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-1" />
              登出
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 签到卡片 */}
          <Card className="shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-2xl">每日签到</CardTitle>
              <CardDescription>
                每天签到一次，让关心你的人安心
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 签到按钮 */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  className={`w-40 h-40 rounded-full text-xl font-bold transition-all ${
                    status?.hasCheckedInToday
                      ? "bg-green-500 hover:bg-green-500 cursor-default"
                      : "bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95"
                  }`}
                  disabled={status?.hasCheckedInToday || checkInMutation.isPending}
                  onClick={() => checkInMutation.mutate()}
                >
                  {checkInMutation.isPending ? (
                    <Loader2 className="h-8 w-8 animate-spin" />
                  ) : status?.hasCheckedInToday ? (
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle2 className="h-10 w-10" />
                      <span>今日已签到</span>
                    </div>
                  ) : (
                    "签到"
                  )}
                </Button>
              </div>

              {/* 统计信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">上次签到</span>
                  </div>
                  <p className="font-medium">
                    {formatDate(status?.lastCheckIn?.checkInDate)}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-muted-foreground mb-1">
                    <Flame className="h-4 w-4 text-orange-500" />
                    <span className="text-sm">连续签到</span>
                  </div>
                  <p className="font-medium">
                    <span className="text-2xl text-orange-500">{status?.streakDays || 0}</span> 天
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 功能入口 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 紧急联系人入口 */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <Link href="/contacts" className="flex flex-col items-center justify-center gap-2 w-full h-20 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Users className="h-6 w-6" />
                  <span className="text-sm">紧急联系人</span>
                </Link>
              </CardContent>
            </Card>

            {/* 签到提醒设置入口 */}
            <Card className="shadow-lg">
              <CardContent className="p-4">
                <Link href="/settings" className="flex flex-col items-center justify-center gap-2 w-full h-20 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors">
                  <Bell className="h-6 w-6" />
                  <span className="text-sm">签到提醒</span>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* 测试邮件功能 */}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <Dialog open={isTestEmailDialogOpen} onOpenChange={setIsTestEmailDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-14 text-base">
                    <div className="flex items-center justify-center gap-3">
                      <Mail className="h-5 w-5" />
                      <span>发送测试邮件</span>
                    </div>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSendTestEmail}>
                    <DialogHeader>
                      <DialogTitle>发送测试邮件</DialogTitle>
                      <DialogDescription>
                        输入邮箱地址，验证邮件服务是否正常工作
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="testEmail">收件邮箱</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          placeholder="请输入收件邮箱地址"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsTestEmailDialogOpen(false)}
                      >
                        取消
                      </Button>
                      <Button type="submit" disabled={sendTestEmailMutation.isPending}>
                        {sendTestEmailMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            发送中...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            发送
                          </>
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <p className="text-sm text-muted-foreground text-center mt-3">
                测试邮件服务是否正常配置
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
