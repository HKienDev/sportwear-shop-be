import React from 'react';
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Link,
} from '@react-email/components';

const toVNTimeString = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
};

export const NewOrderEmail = ({
  shortId,
  fullName,
  createdAt,
  deliveryDate,
  items,
  subtotal,
  directDiscount,
  couponDiscount,
  shippingFee,
  totalPrice,
  shippingAddress,
  paymentMethod,
  paymentStatus,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Xác nhận đơn hàng #{shortId} từ Sport Store</Preview>
      <Body style={{ background: '#f4f7fa', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 650, margin: '32px auto', background: '#fff', borderRadius: 12, boxShadow: '0 4px 24px #e0e7ef', padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <Section style={{ background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)', padding: '32px 0 16px 0', textAlign: 'center' }}>
            <Img
              src="https://sport-store.vercel.app/vju-logo-main.png"
              width="160"
              alt="Sport Store Logo"
              style={{ margin: '0 auto 12px auto', display: 'block' }}
            />
            <Heading style={{ color: '#fff', fontSize: 28, fontWeight: 700, margin: 0 }}>Cảm ơn bạn đã đặt hàng!</Heading>
            <Text style={{ color: '#e0e7ef', fontSize: 16, margin: '8px 0 0 0' }}>
              Xin chào <b>{fullName}</b>, đơn hàng của bạn đã được ghi nhận.
            </Text>
          </Section>

          {/* Thông tin đơn */}
          <Section style={{ padding: '24px 32px 0 32px', textAlign: 'center' }}>
            <table style={{ width: '100%', margin: '0 auto', borderCollapse: 'collapse' }}>
              <tbody>
                <tr>
                  <td style={orderInfoLabel}>Mã đơn hàng</td>
                  <td style={orderInfoValue}>#{shortId}</td>
                  <td style={orderInfoLabel}>Ngày đặt</td>
                  <td style={orderInfoValue}>{toVNTimeString(createdAt)}</td>
                  <td style={orderInfoLabel}>Dự kiến giao</td>
                  <td style={orderInfoValue}>{toVNTimeString(deliveryDate)}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Sản phẩm */}
          <Section style={{ padding: '24px 32px 0 32px' }}>
            <Heading style={{ fontSize: 18, color: '#222', fontWeight: 700, marginBottom: 12, borderLeft: '4px solid #2563eb', paddingLeft: 12 }}>
              Chi tiết đơn hàng
            </Heading>
            <table style={productTable}>
              <thead>
                <tr>
                  <th style={thStyle}>Sản phẩm</th>
                  <th style={thStyle}>Số lượng</th>
                  <th style={thStyle}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} style={idx % 2 === 0 ? rowEven : rowOdd}>
                    <td style={{ ...tdStyle, minWidth: 180 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Img src={item.image} alt={item.name} width="48" style={{ borderRadius: 8, background: '#f3f4f6' }} />
                        <div>
                          <div style={{ fontWeight: 600, color: '#222', fontSize: 15 }}>{item.name}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{item.price} / sản phẩm</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 500 }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* Tổng tiền */}
          <Section style={{ padding: '24px 32px 0 32px' }}>
            <table style={{ width: '100%', background: '#f1f5f9', borderRadius: 8, padding: 16 }}>
              <tbody>
                <tr><td style={summaryLabel}>Tổng tiền hàng:</td><td style={summaryValue}>{subtotal}</td></tr>
                <tr><td style={summaryLabel}>Giảm giá trực tiếp:</td><td style={{ ...summaryValue, color: '#ef4444' }}>-{directDiscount}</td></tr>
                <tr><td style={summaryLabel}>Mã giảm giá:</td><td style={{ ...summaryValue, color: '#ef4444' }}>-{couponDiscount}</td></tr>
                <tr><td style={summaryLabel}>Phí vận chuyển:</td><td style={summaryValue}>{shippingFee}</td></tr>
                <tr><td style={{ ...summaryLabel, fontWeight: 700, fontSize: 16 }}>Tổng thanh toán:</td><td style={{ ...summaryValue, color: '#2563eb', fontWeight: 700, fontSize: 18 }}>{totalPrice}</td></tr>
              </tbody>
            </table>
          </Section>

          {/* Thông tin giao hàng */}
          <Section style={{ padding: '24px 32px 0 32px' }}>
            <Heading style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Thông tin giao hàng</Heading>
            <Text style={{ fontSize: 15 }}>{shippingAddress}</Text>
          </Section>

          {/* Thanh toán */}
          <Section style={{ padding: '24px 32px 0 32px' }}>
            <Heading style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Phương thức thanh toán</Heading>
            <Text style={{ fontSize: 15 }}>{paymentMethod}</Text>
            <Text style={{ fontSize: 15 }}>Trạng thái: {paymentStatus}</Text>
          </Section>

          {/* Footer */}
          <Section style={{ background: '#f1f5f9', marginTop: 32, padding: '32px 0', textAlign: 'center' }}>
            <Text style={{ color: '#64748b', fontSize: 14 }}>
              Mọi thắc mắc vui lòng liên hệ <Link href="mailto:support@sportstore.com" style={{ color: '#2563eb' }}>support@sportstore.com</Link> hoặc <Link href="tel:0362195258" style={{ color: '#2563eb' }}>0362195258</Link>
            </Text>
            <Text style={{ color: '#94a3b8', fontSize: 12, marginTop: 8 }}>
              © 2025 Sport Store. Email tự động, vui lòng không trả lời.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

// Export các style để không bị lỗi scope
const orderInfoLabel = { color: '#2563eb', fontWeight: 600, fontSize: 13, padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.5px' };
const orderInfoValue = { color: '#222', fontWeight: 700, fontSize: 15, padding: '4px 8px' };
const productTable = { width: '100%', borderCollapse: 'collapse', marginBottom: 8 };
const thStyle = { background: '#f1f5f9', color: '#2563eb', fontWeight: 700, fontSize: 13, padding: '10px 8px', borderBottom: '2px solid #e5e7eb', textAlign: 'left' };
const tdStyle = { padding: '10px 8px', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#222' };
const rowEven = { background: '#f8fafc' };
const rowOdd = { background: '#fff' };
const summaryLabel = { color: '#64748b', fontWeight: 500, fontSize: 14, padding: '6px 0' };
const summaryValue = { color: '#222', fontWeight: 600, fontSize: 15, textAlign: 'right', padding: '6px 0' };