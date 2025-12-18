import Navbar from "@/components/Navbar/Navbar";
import PaddingContent from "@/components/PaddingContent/PaddingContent";
import React from "react";

export default function TestWebsocketLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="app-layout">
            <Navbar />
            <main className="main-content">
                <PaddingContent>
                    {children}
                </PaddingContent>
            </main>
        </div>
    );
}
