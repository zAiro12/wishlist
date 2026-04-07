import { Routes, Route } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import DashboardPage from './pages/DashboardPage';
import MyWishlistPage from './pages/MyWishlistPage';
import GroupsPage from './pages/GroupsPage';
import GroupDetailPage from './pages/GroupDetailPage';
import FriendsWishlistsPage from './pages/FriendsWishlistsPage';
import AdminPage from './pages/AdminPage';
import ForbiddenPage from './pages/ForbiddenPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* Protected: birthdate check bypass for complete-profile */}
      <Route
        path="/complete-profile"
        element={
          <RequireAuth>
            <CompleteProfilePage />
          </RequireAuth>
        }
      />

      {/* Protected */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <DashboardPage />
          </RequireAuth>
        }
      />
      <Route
        path="/wishlist"
        element={
          <RequireAuth>
            <MyWishlistPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups"
        element={
          <RequireAuth>
            <GroupsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <RequireAuth>
            <GroupDetailPage />
          </RequireAuth>
        }
      />
      <Route
        path="/groups/:groupId/wishlists"
        element={
          <RequireAuth>
            <FriendsWishlistsPage />
          </RequireAuth>
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RequireAuth requireAdmin>
            <AdminPage />
          </RequireAuth>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
