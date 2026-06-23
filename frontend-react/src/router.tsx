import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RootLayout from "@/root-layout";
import Home, { homeLoader } from "@/routes/home";
import Categories, { categoriesLoader } from "@/routes/categories/index";
import CategoriesLoading from "@/routes/categories/loading";
import CategoriesError from "@/routes/categories/error";

const ph = (id: string) => <div data-testid={`route-${id}`} />;

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: <Home />, loader: homeLoader },
      {
        path: "categories",
        element: <Categories />,
        loader: categoriesLoader,
        errorElement: <CategoriesError />,
        HydrateFallback: CategoriesLoading,
      },
      { path: "categories/:category", element: ph("category") },
      { path: "categories/:category/*", element: ph("article") },
      { path: "faq", element: ph("faq") },
      { path: "faq/*", element: ph("faq-path") },
      { path: "activity", element: ph("activity") },
      { path: "admin/activity", element: ph("admin-activity") },
      { path: "chat", element: ph("chat") },
      { path: "*", element: ph("not-found") },
    ],
  },
];

export const router = createBrowserRouter(routes);
