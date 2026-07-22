import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";
import "./admin.css";

export const metadata: Metadata = {
  title: "内容流管理 · 入镜",
  description: "管理入镜项目的视频流内容。",
};

export default function AdminPage() {
  return <AdminDashboard />;
}
