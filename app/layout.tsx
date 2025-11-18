import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import Loading from "@/components/Loading/Loading";

export const metadata = {
    title: "VicenzaTech - Tile Counter System",
    description: "Hệ thống giám sát và quản lý sản xuất gạch men thông minh",
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
                    <div className="app-layout">
                        <Navbar />
                        <main className="main-content">{children}</main>
                        <Footer />
                    </div>
                </AuthProvider>
            </body>
        </html>
    );
}
