import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AccountScopeProvider } from "./context/AccountScopeContext";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VerifyRegistrationPage } from "./pages/VerifyRegistrationPage";
import { AcceptInvitePage } from "./pages/AcceptInvitePage";
import { VerifyInvitePage } from "./pages/VerifyInvitePage";
import { DashboardPage } from "./pages/DashboardPage";
import { LeadsPage } from "./pages/LeadsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { ContactsPage } from "./pages/ContactsPage";
import { OpportunitiesPage } from "./pages/OpportunitiesPage";
import { ProductsPage } from "./pages/ProductsPage";
import { AccountGroupsPage } from "./pages/AccountGroupsPage";
import { AddressesPage } from "./pages/AddressesPage";
import { ActivitiesPage } from "./pages/ActivitiesPage";
import { ForecastPage } from "./pages/ForecastPage";
import { QuotesPage } from "./pages/QuotesPage";
import { SalesOrdersPage } from "./pages/SalesOrdersPage";
import { ContractsPage } from "./pages/ContractsPage";
import { PaymentRequestsPage } from "./pages/PaymentRequestsPage";
import { PaymentRequestDocumentPage } from "./pages/PaymentRequestDocumentPage";
import { TaxDocumentsPage } from "./pages/TaxDocumentsPage";
import { UsersPage } from "./pages/UsersPage";
import { WorkspacesPage } from "./pages/WorkspacesPage";
import { ScheduledTasksPage } from "./pages/ScheduledTasksPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { SavedSearchesPage } from "./pages/SavedSearchesPage";
import { TimeClockPage } from "./pages/TimeClockPage";
import { AttendanceCalendarPage } from "./pages/AttendanceCalendarPage";
import { TimesheetPage } from "./pages/TimesheetPage";
import { MonthlySummaryPage } from "./pages/MonthlySummaryPage";
import { CalendarPage } from "./pages/CalendarPage";
import { MyProfilePage } from "./pages/MyProfilePage";
import { AttendanceCorrectionsPage } from "./pages/AttendanceCorrectionsPage";

const queryClient = new QueryClient();

function RequireAuth() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AccountScopeProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/verify-registration" element={<VerifyRegistrationPage />} />
              <Route path="/accept-invite/:token?" element={<AcceptInvitePage />} />
              <Route path="/verify-invite" element={<VerifyInvitePage />} />

              <Route element={<RequireAuth />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/leads" element={<LeadsPage />} />
                <Route path="/accounts" element={<AccountsPage />} />
                <Route path="/contacts" element={<ContactsPage />} />
                <Route path="/opportunities" element={<OpportunitiesPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/account-groups" element={<AccountGroupsPage />} />
                <Route path="/addresses" element={<AddressesPage />} />
                <Route path="/activities" element={<ActivitiesPage />} />
                <Route path="/forecast" element={<ForecastPage />} />
                <Route path="/quotes" element={<QuotesPage />} />
                <Route path="/sales-orders" element={<SalesOrdersPage />} />
                <Route path="/contracts" element={<ContractsPage />} />
                <Route path="/payment-requests" element={<PaymentRequestsPage />} />
                <Route path="/payment-request-document/:id" element={<PaymentRequestDocumentPage />} />
                <Route path="/tax-documents" element={<TaxDocumentsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/workspaces" element={<WorkspacesPage />} />
                <Route path="/scheduled-tasks" element={<ScheduledTasksPage />} />
                <Route path="/subscriptions" element={<SubscriptionsPage />} />
                <Route path="/saved-searches" element={<SavedSearchesPage />} />
                <Route path="/time-clock" element={<TimeClockPage />} />
                <Route path="/attendance-calendar" element={<AttendanceCalendarPage />} />
                <Route path="/timesheet" element={<TimesheetPage />} />
                <Route path="/monthly-summary" element={<MonthlySummaryPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/my-profile" element={<MyProfilePage />} />
                <Route path="/attendance-corrections" element={<AttendanceCorrectionsPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AccountScopeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
