import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import Loading from "@/components/Loading/Loading";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "VicenzaTech - Tile Counter System",
    description: "Hệ thống giám sát và quản lý sản xuất gạch men thông minh",
    icons: '/logo-preview.png'
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    const initialUser = undefined;
    return (
        <html lang="vi">
            <body>
                <AuthProvider
                    initialUser={initialUser}
                    fallback={<Loading />}
                >
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
