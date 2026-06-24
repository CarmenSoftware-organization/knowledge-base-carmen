import { createBrowserRouter } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RootLayout from "@/root-layout";
import RootLoading from "@/routes/root-loading";
import Home, { homeLoader } from "@/routes/home";
import Categories, { categoriesLoader } from "@/routes/categories/index";
import CategoriesLoading from "@/routes/categories/loading";
import CategoriesError from "@/routes/categories/error";
import Category, { categoryLoader } from "@/routes/categories/category";
import Article, { articleLoader } from "@/routes/categories/article";
import Faq, { faqLoader } from "@/routes/faq/index";
import FaqPath, { faqPathLoader } from "@/routes/faq/path";
import Activity from "@/routes/activity";
import AdminActivity, { adminActivityLoader } from "@/routes/admin-activity";
import Chat from "@/routes/chat";
import NotFound from "@/routes/not-found";

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <RootLayout />,
    HydrateFallback: RootLoading,
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
      { path: "categories/:category/*", element: <Article />, loader: articleLoader, errorElement: <NotFound /> },
      { path: "faq", element: <Faq />, loader: faqLoader },
      { path: "faq/*", element: <FaqPath />, loader: faqPathLoader, errorElement: <NotFound /> },
      { path: "activity", element: <Activity /> },
      { path: "admin/activity", element: <AdminActivity />, loader: adminActivityLoader },
      { path: "chat", element: <Chat /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
