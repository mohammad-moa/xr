# Hospital Single-QR AR Navigation PoC

این نسخه دقیقاً برای سناریوی جدید طراحی شده است:

1. فقط یک QR داخل اتاق A نصب است.
2. QR شامل `source` و `destinationId` است؛ یا می‌تواند مختصات مقصد را داخل `destination` بدهد.
3. بعد از اسکن، مقصد از نقشه از پیش تعریف‌شده پیدا می‌شود.
4. مسیر روی نقشه نمایش داده می‌شود.
5. Camera AR باز می‌شود و فلش جهت مسیر را نشان می‌دهد.
6. هیچ QR دیگری در اتاق B یا بین مسیر لازم نیست.

نمونه payload:
```json
{"source":"ROOM-A","destinationId":"MRI"}
```

برای مقصد سفارشی:
```json
{"source":"ROOM-A","destination":{"x":16,"y":3,"name":"MRI"}}
```

## اجرا
`npm install`
`npm run dev`

برای گوشی، Camera/Motion API باید روی HTTPS اجرا شود.

## نکته فنی
این یک PoC مرورگری است. بعد از QR اولیه، موقعیت لحظه‌ای با سنسورهای گوشی تخمین زده می‌شود و ممکن است drift داشته باشد. برای positioning دقیق production باید ARCore/ARKit یا یک سیستم indoor positioning دقیق اضافه شود.
