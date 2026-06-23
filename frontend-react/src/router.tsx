import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RootLayout from "@/root-layout";
import Home, { homeLoader } from "@/routes/home";
import Categories, { categoriesLoader } from "@/routes/categories/index";
import CategoriesLoading from "@/routes/categories/loading";
import CategoriesError from "@/routes/categories/error";
import Category, { categoryLoader } from "@/routes/categories/category";
import Article, { articleLoader } from "@/routes/categories/article";
import Faq, { faqLoader } from "@/routes/faq/index";
import FaqPath, { faqPathLoader } from "@/routes/faq/path";

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
      {
        path: "categories/:category",
        element: <Category />,
        loader: categoryLoader,
        errorElement: <CategoriesError />,
      },
      { path: "categories/:category/*", element: <Article />, loader: articleLoader, errorElement: <CategoriesError /> },
      { path: "faq", element: <Faq />, loader: faqLoader },
      { path: "faq/*", element: <FaqPath />, loader: faqPathLoader, errorElement: <CategoriesError /> },
      { path: "activity", element: ph("activity") },
      { path: "admin/activity", element: ph("admin-activity") },
      { path: "chat", element: ph("chat") },
      { path: "*", element: ph("not-found") },
    ],
  },
];

export const router = createBrowserRouter(routes);
