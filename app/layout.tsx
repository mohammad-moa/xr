import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"Hospital AR WebXR Demo",description:"Lightweight hospital indoor AR proof of concept"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}