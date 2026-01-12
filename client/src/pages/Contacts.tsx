import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Loader2, ArrowLeft, Plus, Trash2, Mail, User, Shield, Users } from "lucide-react";

export default function Contacts() {
  const [, setLocation] = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useCustomAuth();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  const { data: contactsData, isLoading: contactsLoading, refetch } = trpc.contacts.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const addMutation = trpc.contacts.add.useMutation({
    onSuccess: () => {
      toast.success("联系人添加成功");
      setIsAddDialogOpen(false);
      setNewContactName("");
      setNewContactEmail("");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "添加失败，请重试");
    },
  });

  const deleteMutation = trpc.contacts.delete.useMutation({
    onSuccess: () => {
      toast.success("联系人已删除");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "删除失败，请重试");
    },
  });

  // 未登录时重定向到登录页
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  if (authLoading || contactsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      name: newContactName,
      email: newContactEmail,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-9 px-3">
            <ArrowLeft className="h-4 w-4 mr-1" />
            返回
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">紧急联系人</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* 说明卡片 */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <p className="text-sm text-blue-800">
                当您连续一天未签到时，系统会自动向您的紧急联系人发送提醒邮件，
                提醒他们与您联系确认安全。每位用户最多可设置 {contactsData?.maxContacts || 3} 位紧急联系人。
              </p>
            </CardContent>
          </Card>

          {/* 联系人列表 */}
          <Card className="shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  联系人列表
                </CardTitle>
                <CardDescription>
                  已添加 {contactsData?.contacts.length || 0} / {contactsData?.maxContacts || 3} 位联系人
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    disabled={!contactsData?.canAddMore}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    添加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleAddContact}>
                    <DialogHeader>
                      <DialogTitle>添加紧急联系人</DialogTitle>
                      <DialogDescription>
                        请填写联系人的姓名和邮箱地址
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">姓名</Label>
                        <Input
                          id="name"
                          placeholder="请输入联系人姓名"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">邮箱</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="请输入联系人邮箱"
                          value={newContactEmail}
                          onChange={(e) => setNewContactEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsAddDialogOpen(false)}
                      >
                        取消
                      </Button>
                      <Button type="submit" disabled={addMutation.isPending}>
                        {addMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            添加中...
                          </>
                        ) : (
                          "添加"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {contactsData?.contacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>还没有添加紧急联系人</p>
                  <p className="text-sm mt-1">点击上方"添加"按钮添加联系人</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contactsData?.contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{contact.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{contact.email}</span>
                          </div>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>确认删除</AlertDialogTitle>
                            <AlertDialogDescription>
                              确定要删除联系人 "{contact.name}" 吗？删除后，该联系人将不再收到您的签到提醒。
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>取消</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteMutation.mutate({ id: contact.id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deleteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                "删除"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
