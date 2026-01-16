import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db, database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Shield,
  Loader2,
  CreditCard,
  Search,
  Users,
  Activity,
  Trash2,
  Phone,
  User,
  DollarSign,
  Wallet,
  CheckCircle,
  XCircle,
  Eye,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface LoanApplication {
  id: string;
  fullName?: string;
  phoneNumber?: string;
  loanAmount?: string;
  monthlySalary?: string;
  hasKiCard?: string;
  createdDate?: string;
  currentPage?: string;
  status?: "pending" | "approved" | "rejected" | string;
}

function ApplicationInfoCard({ application }: { application: LoanApplication }) {
  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-gray-800">معلومات الطلب</CardTitle>
            <CardDescription className="text-sm">
              {application.createdDate
                ? formatDistanceToNow(new Date(application.createdDate), {
                    addSuffix: true,
                    locale: ar,
                  })
                : "غير متوفر"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col space-y-1 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
            <span className="text-xs font-medium text-gray-600">الاسم الكامل</span>
            <span className="font-bold text-base text-gray-800">
              {application.fullName || "غير متوفر"}
            </span>
          </div>
          <div className="flex flex-col space-y-1 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
            <span className="text-xs font-medium text-gray-600">رقم الهاتف</span>
            <span className="font-bold text-base text-gray-800 font-mono tracking-wider">
              {application.phoneNumber || "غير متوفر"}
            </span>
          </div>
          <div className="flex flex-col space-y-1 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
            <span className="text-xs font-medium text-gray-600">مبلغ القرض</span>
            <span className="font-bold text-base text-green-600">
              {application.loanAmount || "غير متوفر"}
            </span>
          </div>
          <div className="flex flex-col space-y-1 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
            <span className="text-xs font-medium text-gray-600">الراتب الشهري</span>
            <span className="font-bold text-base text-gray-800">
              {application.monthlySalary || "غير متوفر"}
            </span>
          </div>
          <div className="flex flex-col space-y-1 p-4 bg-white rounded-lg border border-blue-200 shadow-sm">
            <span className="text-xs font-medium text-gray-600">بطاقة كي</span>
            <span className="font-bold text-base text-gray-800">
              {application.hasKiCard === "yes" ? "نعم" : application.hasKiCard === "no" ? "لا" : "غير متوفر"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function useOnlineUsersCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!database) return;
    
    const statusRef = ref(database, "/status");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      let onlineCount = 0;
      snapshot.forEach((childSnapshot) => {
        const data = childSnapshot.val();
        if (data && data.state === "online") {
          onlineCount++;
        }
      });
      setCount(onlineCount);
    });

    return () => unsubscribe();
  }, []);

  return count;
}

export default function DashboardPage() {
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<LoanApplication | null>(null);
  const [filterType, setFilterType] = useState<"all" | "pending" | "approved">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [, setLocation] = useLocation();
  const onlineUsersCount = useOnlineUsersCount();
  const { toast } = useToast();

  const [onlineStatuses, setOnlineStatuses] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!database) return;
    
    const db = database;
    const statusRefs: { [key: string]: () => void } = {};
    applications.forEach((application) => {
      const userStatusRef = ref(db, `/status/${application.id}`);
      const callback = onValue(userStatusRef, (snapshot) => {
        const data = snapshot.val();
        setOnlineStatuses((prev) => ({
          ...prev,
          [application.id]: data && data.state === "online",
        }));
      });
      statusRefs[application.id] = callback;
    });

    return () => {
      Object.values(statusRefs).forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") {
          unsubscribe();
        }
      });
    };
  }, [applications]);

  const totalApplicationsCount = applications.length;
  const pendingCount = applications.filter((a) => a.status === "pending" || !a.status).length;
  const approvedCount = applications.filter((a) => a.status === "approved").length;

  const filteredApplications = useMemo(() => {
    let filtered = applications;

    if (filterType === "pending") {
      filtered = filtered.filter((app) => app.status === "pending" || !app.status);
    } else if (filterType === "approved") {
      filtered = filtered.filter((app) => app.status === "approved");
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.fullName?.toLowerCase().includes(term) ||
          app.phoneNumber?.toLowerCase().includes(term) ||
          app.loanAmount?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [applications, filterType, searchTerm]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredApplications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "pays"),
      (snapshot) => {
        const applicationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as LoanApplication[];

        const sortedApplications = applicationsData.sort((a, b) => {
          const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return dateB - dateA;
        });

        setApplications(sortedApplications);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching applications:", error);
        setIsLoading(false);
        toast({
          title: "خطأ في جلب البيانات",
          description: "حدث خطأ أثناء جلب الطلبات",
          variant: "destructive",
        });
      }
    );

    return unsubscribe;
  }, [toast]);

  const handleDelete = async (id: string) => {
    if (!db) return;
    
    try {
      await deleteDoc(doc(db, "pays", id));
      toast({
        title: "تم الحذف",
        description: "تم حذف الطلب بنجاح",
      });
    } catch (error) {
      console.error("Error deleting application:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حذف الطلب",
        variant: "destructive",
      });
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    if (!db) return;
    
    try {
      await updateDoc(doc(db, "pays", id), { status });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب بنجاح",
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث الحالة",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 font-medium">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800" data-testid="text-dashboard-title">لوحة التحكم</h1>
            <p className="text-gray-600 mt-1">إدارة طلبات القروض</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            العودة للرئيسية
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-blue-100 text-sm font-medium">إجمالي الطلبات</p>
                  <p className="text-3xl font-bold mt-2" data-testid="text-total-applications">{totalApplicationsCount}</p>
                </div>
                <Users className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">قيد الانتظار</p>
                  <p className="text-3xl font-bold mt-2" data-testid="text-pending-count">{pendingCount}</p>
                </div>
                <Wallet className="h-12 w-12 text-yellow-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-green-100 text-sm font-medium">الموافق عليها</p>
                  <p className="text-3xl font-bold mt-2" data-testid="text-approved-count">{approvedCount}</p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-purple-100 text-sm font-medium">متصل الآن</p>
                  <p className="text-3xl font-bold mt-2" data-testid="text-online-count">{onlineUsersCount}</p>
                </div>
                <Activity className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="البحث عن طريق الاسم، الهاتف، أو مبلغ القرض..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10 h-11"
                    data-testid="input-search"
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filterType === "all" ? "default" : "outline"}
                  onClick={() => setFilterType("all")}
                  data-testid="button-filter-all"
                >
                  الكل
                </Button>
                <Button
                  variant={filterType === "pending" ? "default" : "outline"}
                  onClick={() => setFilterType("pending")}
                  data-testid="button-filter-pending"
                >
                  قيد الانتظار
                </Button>
                <Button
                  variant={filterType === "approved" ? "default" : "outline"}
                  onClick={() => setFilterType("approved")}
                  data-testid="button-filter-approved"
                >
                  موافق عليها
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>طلبات القروض</CardTitle>
            <CardDescription>
              عرض {currentItems.length} من {filteredApplications.length} طلب
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentItems.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 text-lg">لا توجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentItems.map((application) => (
                  <Card 
                    key={application.id} 
                    className="border hover-elevate"
                    data-testid={`card-application-${application.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                            <User className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800" data-testid={`text-name-${application.id}`}>
                              {application.fullName || "بدون اسم"}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Phone className="h-4 w-4" />
                              <span data-testid={`text-phone-${application.id}`}>{application.phoneNumber || "غير متوفر"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {application.loanAmount || "غير محدد"}
                          </Badge>
                          <Badge variant={application.hasKiCard === "yes" ? "default" : "outline"}>
                            {application.hasKiCard === "yes" ? "لديه بطاقة كي" : "بدون بطاقة كي"}
                          </Badge>
                          <Badge 
                            variant={application.status === "approved" ? "default" : "secondary"}
                            className={application.status === "approved" ? "bg-green-500" : ""}
                          >
                            {application.status === "approved" ? "موافق عليه" : "قيد الانتظار"}
                          </Badge>
                          {onlineStatuses[application.id] && (
                            <Badge className="bg-green-500">متصل</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setSelectedApplication(application)}
                            data-testid={`button-view-${application.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {application.status !== "approved" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-green-600"
                              onClick={() => handleStatusUpdate(application.id, "approved")}
                              data-testid={`button-approve-${application.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDelete(application.id)}
                            data-testid={`button-delete-${application.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-2 text-xs text-gray-400">
                        {application.createdDate
                          ? formatDistanceToNow(new Date(application.createdDate), {
                              addSuffix: true,
                              locale: ar,
                            })
                          : ""}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                  data-testid="button-prev-page"
                >
                  السابق
                </Button>
                <span className="text-sm text-gray-600">
                  صفحة {currentPage} من {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                  data-testid="button-next-page"
                >
                  التالي
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب</DialogTitle>
          </DialogHeader>
          {selectedApplication && (
            <ApplicationInfoCard application={selectedApplication} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
