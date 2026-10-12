# Kiến trúc đề xuất cho NÉT ART

## Quyết định đề xuất

Next.js (React) + TypeScript cho storefront và trang quản trị; Node.js + Express + TypeScript cho API nếu cần backend độc lập; MongoDB Atlas cho dữ liệu; Firebase Storage cho ảnh; Firebase Authentication cho đăng nhập. Nếu MVP nhỏ và chỉ có một website, dùng Next.js Route Handlers trên Node.js thay API Express riêng để giảm triển khai, nhưng tách service nghiệp vụ để sau này chuyển được.

Không cần triển khai hai backend cùng lúc. Chốt theo nhu cầu học FE/BE riêng hay ưu tiên ra MVP nhanh. Next.js vẫn là React; frontend chạy trên browser và phần render phía server chạy trên Node.js.

## Vì sao phù hợp

- Trang tranh, danh mục và bài viết cần HTML phía server, metadata, sitemap và ảnh chia sẻ để hỗ trợ tìm kiếm. Next.js có hệ thống metadata và Server Components.
- MongoDB phù hợp catalog có thuộc tính khác nhau như chất liệu, kích thước, phong cách, tác giả, bộ ảnh. Không bắt buộc đổi sang SQL cho một gallery quy mô nhỏ.
- Nếu sau này nhiều người bán, chia hoa hồng, đối soát, hoàn tiền và báo cáo phức tạp, cân nhắc PostgreSQL để biểu diễn quan hệ và ràng buộc giao dịch dễ hơn.
- Firebase Storage là nơi lưu tệp, không dùng Firestore đồng thời để lưu lại toàn bộ catalog đã có trong MongoDB.

## Luồng ảnh

Admin đăng nhập → API xác minh Firebase ID token và role → upload ảnh theo Storage Rules chỉ cho admin → tạo ảnh thumbnail/ảnh chi tiết tối ưu → API lưu storagePath, URL ảnh công khai được phép, kích thước và alt trong MongoDB. Cần giới hạn MIME, dung lượng, số lượng, kiểm tra file phía server, xử lý ảnh và dọn upload mồ côi. Không công khai bản gốc độ phân giải cao nếu chưa muốn phân phối; bản preview có thể thêm watermark.

Frontend chỉ nhận API và Firebase client config. URI MongoDB, Firebase Admin credential, khóa thanh toán chỉ nằm phía server. API tự kiểm tra role; ẩn nút admin không phải phân quyền. Nếu dùng custom claims cho Storage Rules, cấp claims bằng Admin SDK và đồng bộ role phía API.

Cloud Storage for Firebase hiện yêu cầu gói Blaze. Theo dõi dung lượng, lượt tải, xử lý ảnh và chi phí băng thông; budget alert không phải trần chi phí. Không coi lưu ảnh là miễn phí không giới hạn.

## Mô hình dữ liệu

- artworks: slug (unique), title, description, artistId, medium, widthCm, heightCm, priceVnd (integer), images[], status, reservationExpiresAt, reservationId, createdAt.
- artists: tên, bio, ảnh, thông tin xuất xứ được xác minh.
- users: firebaseUid (unique), role, thông tin liên hệ cần thiết.
- orders: userId, items[] chứa snapshot tên/giá/chất liệu lúc mua, totalVnd, paymentStatus, fulfillmentStatus, address, reservationId, idempotencyKey (unique).
- paymentEvents: provider, eventId (unique), orderId, trạng thái và thời điểm xử lý.

Thêm collections, favorites hoặc bài viết khi có nhu cầu thực tế. Index theo slug, status, medium, artistId, priceVnd và createdAt; lựa chọn text search theo nhu cầu tiếng Việt và bỏ dấu.

## Tranh độc bản và checkout

Không để browser tự quyết định giá/tồn kho. API đọc giá hiện tại, cập nhật có điều kiện available → reserved bằng thao tác atomic và reservationId. Chỉ một khách thắng giữ chỗ. Khi tạo đơn cùng giữ chỗ nhiều tranh, dùng transaction trên MongoDB replica set/Atlas.

Đơn chờ thanh toán có thời hạn. Job chủ động giải phóng reservation hết hạn; không chỉ dựa vào TTL xóa dữ liệu vì xóa TTL không xảy ra đúng tức thì. Xác minh chữ ký webhook, unique eventId và xử lý idempotent. Webhook thành công đổi reserved → sold đúng reservationId. Không dùng trang redirect “thành công” của browser làm chứng từ thanh toán. Xử lý thanh toán đến sau khi hết giữ chỗ bằng quy trình kiểm tra/hoàn tiền, không tự bán bức đã thuộc đơn khác.

## Các bước triển khai

1. Chốt trang chủ, thay SVG minh họa bằng tranh thật và nội dung thương hiệu.
2. Storefront Next.js: catalog, lọc/tìm, chi tiết, SEO, ảnh responsive; admin quản lý tranh, upload và trạng thái.
3. Auth, phân quyền, MongoDB schema/index, API validation và lỗi.
4. Giỏ hàng, giữ chỗ, đơn hàng; tích hợp cổng thanh toán sau khi chọn nhà cung cấp.
5. Kiểm tra tranh bị mua đồng thời, webhook lặp, hết giữ chỗ, upload trái phép; backup và theo dõi lỗi trước mở bán.

## Nguồn chính thức

- Next.js metadata: https://nextjs.org/docs/app/getting-started/metadata-and-og-images
- Firebase Storage setup và Blaze: https://firebase.google.com/docs/storage/web/start
- Firebase upload: https://firebase.google.com/docs/storage/web/upload-files
- MongoDB atomicity và transactions: https://www.mongodb.com/docs/manual/core/transactions/
