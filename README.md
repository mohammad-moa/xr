# Hospital AR Camera Demo v2

نسخه سبک برای تست گوشی: Camera واقعی + QR Anchor + Heading + Step Detection + Distance + Re-calibration.

## اجرا
`npm install`
`npm run dev`

روی دسکتاپ: `http://localhost:3000`
برای گوشی: Camera API به HTTPS نیاز دارد؛ Render Static Site یا HTTPS لوکال استفاده کنید.

## مدل PoC
QR = موقعیت مرجع دقیق؛ نقشه = فاصله واقعی بین نقاط؛ Step Detection = تخمین حرکت بین دو QR؛ Heading = جهت فلش؛ QR بعدی = اصلاح موقعیت.

این نسخه هنوز positioning تجاری/سانتی‌متری نیست. برای Production می‌توان Step/AR tracking را با ARCore/ARKit یا راهکار دقیق‌تر جایگزین کرد.


### Camera selection
On desktop, the demo automatically prefers an iVCam/e2eSoft virtual camera when Windows exposes it to the browser. On real phones it prefers the rear/environment camera. No camera selector is shown to the user.
