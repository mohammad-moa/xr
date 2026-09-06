import './globals.css';
import type { Metadata } from 'next';
export const metadata: Metadata = { title:'Hospital AR Navigation', description:'Single QR indoor navigation proof of concept' };
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fa" dir="rtl"><body>{children}</body></html>}
