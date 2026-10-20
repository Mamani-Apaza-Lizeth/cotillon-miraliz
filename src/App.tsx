// Rutas de la aplicación. Las secciones de administración y producción se cargan
// bajo demanda (lazy) para que la tienda pública sea liviana.
import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Spinner } from './components/ui/Feedback';
import { HomePage } from './pages/public/HomePage';
import { CatalogPage } from './pages/public/CatalogPage';
import { ProductPage } from './pages/public/ProductPage';
import { ForgotPasswordPage, LoginPage, NotFoundPage, RegisterPage, ResetPasswordPage } from './pages/public/AuthPages';

const named = <T extends Record<string, unknown>>(loader: () => Promise<T>, name: keyof T) =>
  lazy(async () => ({ default: (await loader())[name] as ComponentType }));

const CartPage = named(() => import('./pages/customer/CartPage'), 'CartPage');
const CheckoutPage = named(() => import('./pages/customer/CheckoutPage'), 'CheckoutPage');
const OrdersPage = named(() => import('./pages/customer/OrdersPage'), 'OrdersPage');
const OrderDetailPage = named(() => import('./pages/customer/OrderDetailPage'), 'OrderDetailPage');
const QuoteRequestPage = named(() => import('./pages/customer/QuoteRequestPage'), 'QuoteRequestPage');
const ProfilePage = named(() => import('./pages/customer/ProfilePage'), 'ProfilePage');
const EmployeeTasksPage = named(() => import('./pages/employee/EmployeeTasksPage'), 'EmployeeTasksPage');
const AdminLayout = named(() => import('./components/layout/AdminLayout'), 'AdminLayout');
const AdminDashboardPage = named(() => import('./pages/admin/AdminDashboardPage'), 'AdminDashboardPage');
const AdminOrdersPage = named(() => import('./pages/admin/AdminOrdersPage'), 'AdminOrdersPage');
const AdminOrderDetailPage = named(() => import('./pages/admin/AdminOrderDetailPage'), 'AdminOrderDetailPage');
const AdminCounterSalePage = named(() => import('./pages/admin/AdminCounterSalePage'), 'AdminCounterSalePage');
const AdminProductsPage = named(() => import('./pages/admin/AdminProductsPage'), 'AdminProductsPage');
const AdminProductEditPage = named(() => import('./pages/admin/AdminProductEditPage'), 'AdminProductEditPage');
const AdminCategoriesPage = named(() => import('./pages/admin/AdminCategoriesPage'), 'AdminCategoriesPage');
const AdminInventoryPage = named(() => import('./pages/admin/AdminInventoryPage'), 'AdminInventoryPage');
const AdminRecipesPage = named(() => import('./pages/admin/AdminRecipesPage'), 'AdminRecipesPage');
const AdminSuppliersPage = named(() => import('./pages/admin/AdminSuppliersPage'), 'AdminSuppliersPage');
const AdminProductionPage = named(() => import('./pages/admin/AdminProductionPage'), 'AdminProductionPage');
const AdminUsersPage = named(() => import('./pages/admin/AdminUsersPage'), 'AdminUsersPage');
const AdminSettingsPage = named(() => import('./pages/admin/AdminSettingsPage'), 'AdminSettingsPage');
const AdminAuditPage = named(() => import('./pages/admin/AdminAuditPage'), 'AdminAuditPage');

const suspense = (node: ReactNode) => <Suspense fallback={<Spinner />}>{node}</Suspense>;
const customer = (node: ReactNode) => <ProtectedRoute>{suspense(node)}</ProtectedRoute>;

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/catalogo', element: <CatalogPage /> },
      { path: '/producto/:slug', element: <ProductPage /> },
      { path: '/ingresar', element: <LoginPage /> },
      { path: '/registro', element: <RegisterPage /> },
      { path: '/recuperar-contrasena', element: <ForgotPasswordPage /> },
      { path: '/restablecer-contrasena', element: <ResetPasswordPage /> },
      { path: '/carrito', element: customer(<CartPage />) },
      { path: '/confirmar-pedido', element: customer(<CheckoutPage />) },
      { path: '/mis-pedidos', element: customer(<OrdersPage />) },
      { path: '/mis-pedidos/:id', element: customer(<OrderDetailPage />) },
      { path: '/personalizar/:slug', element: customer(<QuoteRequestPage />) },
      { path: '/perfil', element: customer(<ProfilePage />) },
      { path: '/empleado/tareas', element: <ProtectedRoute roles={['empleado', 'admin']}>{suspense(<EmployeeTasksPage />)}</ProtectedRoute> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute roles={['admin']}>{suspense(<AdminLayout />)}</ProtectedRoute>,
    children: [
      { index: true, element: suspense(<AdminDashboardPage />) },
      { path: 'pedidos', element: suspense(<AdminOrdersPage />) },
      { path: 'pedidos/:id', element: suspense(<AdminOrderDetailPage />) },
      { path: 'mostrador', element: suspense(<AdminCounterSalePage />) },
      { path: 'produccion', element: suspense(<AdminProductionPage />) },
      { path: 'productos', element: suspense(<AdminProductsPage />) },
      { path: 'productos/nuevo', element: suspense(<AdminProductEditPage />) },
      { path: 'productos/:id', element: suspense(<AdminProductEditPage />) },
      { path: 'categorias', element: suspense(<AdminCategoriesPage />) },
      { path: 'inventario', element: suspense(<AdminInventoryPage />) },
      { path: 'recetas', element: suspense(<AdminRecipesPage />) },
      { path: 'proveedores', element: suspense(<AdminSuppliersPage />) },
      { path: 'usuarios', element: suspense(<AdminUsersPage />) },
      { path: 'configuracion', element: suspense(<AdminSettingsPage />) },
      { path: 'auditoria', element: suspense(<AdminAuditPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);

export function App() {
  return <RouterProvider router={router} />;
}
