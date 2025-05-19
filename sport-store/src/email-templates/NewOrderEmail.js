/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

// src/email-templates/NewOrderEmail.tsx
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
  Link
} from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var toVNTimeString = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
};
var NewOrderEmail = ({
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
  paymentStatus
}) => {
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsxs(Preview, { children: [
      "Xác nhận đơn hàng #",
      shortId,
      " từ Sport Store"
    ] }),
    /* @__PURE__ */ jsx(Body, { style: { background: "#f4f7fa", fontFamily: "Arial, sans-serif", margin: 0, padding: 0 }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 650, margin: "32px auto", background: "#fff", borderRadius: 12, boxShadow: "0 4px 24px #e0e7ef", padding: 0, overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", padding: "32px 0 16px 0", textAlign: "center" }, children: [
        /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: 1 }, children: "Cảm ơn bạn đã đặt hàng!" }),
        /* @__PURE__ */ jsxs(Text, { style: { color: "#e0e7ef", fontSize: 16, margin: "8px 0 0 0" }, children: [
          "Xin chào ",
          /* @__PURE__ */ jsx("b", { children: fullName }),
          ", đơn hàng của bạn đã được ghi nhận."
        ] })
      ] }),
      /* @__PURE__ */ jsx(Section, { style: { padding: "24px 32px 0 32px", textAlign: "center" }, children: /* @__PURE__ */ jsx("table", { style: { width: "100%", margin: "0 auto", borderCollapse: "collapse" }, children: /* @__PURE__ */ jsx("tbody", { children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("td", { style: orderInfoLabel, children: "Mã đơn hàng" }),
        /* @__PURE__ */ jsxs("td", { style: orderInfoValue, children: [
          "#",
          shortId
        ] }),
        /* @__PURE__ */ jsx("td", { style: orderInfoLabel, children: "Ngày đặt" }),
        /* @__PURE__ */ jsx("td", { style: orderInfoValue, children: toVNTimeString(createdAt) }),
        /* @__PURE__ */ jsx("td", { style: orderInfoLabel, children: "Dự kiến giao" }),
        /* @__PURE__ */ jsx("td", { style: orderInfoValue, children: toVNTimeString(deliveryDate) })
      ] }) }) }) }),
      /* @__PURE__ */ jsxs(Section, { style: { padding: "24px 32px 0 32px" }, children: [
        /* @__PURE__ */ jsx(Heading, { style: { fontSize: 18, color: "#222", fontWeight: 700, margin: "0 0 12px 0", borderLeft: "4px solid #2563eb", paddingLeft: 12 }, children: "Chi tiết đơn hàng" }),
        /* @__PURE__ */ jsxs("table", { style: productTable, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
            /* @__PURE__ */ jsx("th", { style: thStyle, children: "Sản phẩm" }),
            /* @__PURE__ */ jsx("th", { style: thStyle, children: "Số lượng" }),
            /* @__PURE__ */ jsx("th", { style: thStyle, children: "Thành tiền" })
          ] }) }),
          /* @__PURE__ */ jsx("tbody", { children: items.map((item, idx) => /* @__PURE__ */ jsxs("tr", { style: idx % 2 === 0 ? rowEven : rowOdd, children: [
            /* @__PURE__ */ jsx("td", { style: { ...tdStyle, minWidth: 180 }, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 12 }, children: [
              /* @__PURE__ */ jsx("div", { children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 600, color: "#222", fontSize: 15 }, children: item.name }),
                /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "#888" }, children: [
                  item.price,
                  " / sản phẩm"
                ] })
              ] })
            ] }) }),
            /* @__PURE__ */ jsx("td", { style: { ...tdStyle, textAlign: "center", fontWeight: 500 }, children: item.quantity }),
            /* @__PURE__ */ jsx("td", { style: { ...tdStyle, textAlign: "right", fontWeight: 700 }, children: item.price })
          ] }, idx)) })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Section, { style: { padding: "24px 32px 0 32px" }, children: /* @__PURE__ */ jsx("table", { style: { width: "100%", background: "#f1f5f9", borderRadius: 8, padding: 16, margin: "0 0 8px 0" }, children: /* @__PURE__ */ jsxs("tbody", { children: [
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: summaryLabel, children: "Tổng tiền hàng:" }),
          /* @__PURE__ */ jsx("td", { style: summaryValue, children: subtotal })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: summaryLabel, children: "Giảm giá trực tiếp:" }),
          /* @__PURE__ */ jsxs("td", { style: { ...summaryValue, color: "#ef4444" }, children: [
            "-",
            directDiscount
          ] })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: summaryLabel, children: "Mã giảm giá:" }),
          /* @__PURE__ */ jsxs("td", { style: { ...summaryValue, color: "#ef4444" }, children: [
            "-",
            couponDiscount
          ] })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: summaryLabel, children: "Phí vận chuyển:" }),
          /* @__PURE__ */ jsx("td", { style: summaryValue, children: shippingFee })
        ] }),
        /* @__PURE__ */ jsxs("tr", { children: [
          /* @__PURE__ */ jsx("td", { style: { ...summaryLabel, fontWeight: 700, fontSize: 16 }, children: "Tổng thanh toán:" }),
          /* @__PURE__ */ jsx("td", { style: { ...summaryValue, color: "#2563eb", fontWeight: 700, fontSize: 18 }, children: totalPrice })
        ] })
      ] }) }) }),
      /* @__PURE__ */ jsxs(Section, { style: { padding: "24px 32px 0 32px" }, children: [
        /* @__PURE__ */ jsx(Heading, { style: { fontSize: 16, color: "#222", fontWeight: 700, margin: "0 0 8px 0" }, children: "Thông tin giao hàng" }),
        /* @__PURE__ */ jsx(Text, { style: { color: "#444", fontSize: 15 }, children: shippingAddress })
      ] }),
      /* @__PURE__ */ jsxs(Section, { style: { padding: "24px 32px 0 32px" }, children: [
        /* @__PURE__ */ jsx(Heading, { style: { fontSize: 16, color: "#222", fontWeight: 700, margin: "0 0 8px 0" }, children: "Phương thức thanh toán" }),
        /* @__PURE__ */ jsx(Text, { style: { color: "#444", fontSize: 15 }, children: paymentMethod }),
        /* @__PURE__ */ jsxs(Text, { style: { color: "#444", fontSize: 15 }, children: [
          "Trạng thái: ",
          paymentStatus
        ] })
      ] }),
      /* @__PURE__ */ jsx(Section, { style: { textAlign: "center", padding: "32px 0 0 0" }, children: /* @__PURE__ */ jsx(
        Link,
        {
          href: `https://sport-store.vercel.app/orders/${shortId}`,
          style: { display: "inline-block", background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", color: "#fff", padding: "14px 40px", borderRadius: 32, fontWeight: 700, fontSize: 16, textDecoration: "none", boxShadow: "0 2px 8px #dbeafe", margin: "0 auto" },
          children: "Xem chi tiết đơn hàng"
        }
      ) }),
      /* @__PURE__ */ jsxs(Section, { style: { background: "#f1f5f9", marginTop: 32, padding: "32px 0 0 0", textAlign: "center", borderTop: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsxs(Text, { style: { color: "#64748b", fontSize: 14, margin: 0 }, children: [
          "Mọi thắc mắc vui lòng liên hệ ",
          /* @__PURE__ */ jsx(Link, { href: "mailto:support@sportstore.com", style: { color: "#2563eb", textDecoration: "underline" }, children: "support@sportstore.com" }),
          " hoặc ",
          /* @__PURE__ */ jsx(Link, { href: "tel:0362195258", style: { color: "#2563eb", textDecoration: "underline" }, children: "0362195258" })
        ] }),
        /* @__PURE__ */ jsxs(Text, { style: { color: "#94a3b8", fontSize: 12, margin: "8px 0 0 0" }, children: [
          "\xA9 2025 Sport Store. Tất cả các quyền được bảo lưu.",
          /* @__PURE__ */ jsx("br", {}),
          "Email này được gửi từ động, vui lòng không trả lời."
        ] })
      ] })
    ] }) })
  ] });
};
var NewOrderEmail_default = NewOrderEmail;
var orderInfoLabel = {
  color: "#2563eb",
  fontWeight: 600,
  fontSize: 13,
  padding: "4px 8px",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};
var orderInfoValue = { color: "#222", fontWeight: 700, fontSize: 15, padding: "4px 8px" };
var productTable = { width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", marginBottom: 8 };
var thStyle = { background: "#f1f5f9", color: "#2563eb", fontWeight: 700, fontSize: 13, padding: "10px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "left" };
var tdStyle = { padding: "10px 8px", borderBottom: "1px solid #e5e7eb", fontSize: 14, color: "#222", background: "#fff" };
var rowEven = { background: "#f8fafc" };
var rowOdd = { background: "#fff" };
var summaryLabel = { color: "#64748b", fontWeight: 500, fontSize: 14, padding: "6px 0" };
var summaryValue = { color: "#222", fontWeight: 600, fontSize: 15, textAlign: "right", padding: "6px 0" };
export {
  NewOrderEmail_default as default
};
