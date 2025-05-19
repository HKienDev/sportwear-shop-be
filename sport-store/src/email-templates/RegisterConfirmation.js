/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

// src/email-templates/RegisterConfirmation.tsx
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
  Hr
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";
import { jsx, jsxs } from "react/jsx-runtime";
var RegisterConfirmation = ({
  fullname,
  email,
  customId,
  createdAt
}) => {
  const registerDate = createdAt ? new Date(createdAt).toLocaleDateString("vi-VN") : (/* @__PURE__ */ new Date()).toLocaleDateString("vi-VN");
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsx(Preview, { children: "Chào mừng đến với Sport Store! Xác nhận đăng ký tài khoản" }),
    /* @__PURE__ */ jsx(Tailwind, { children: /* @__PURE__ */ jsx(Body, { className: "bg-gray-100 font-sans", children: /* @__PURE__ */ jsxs(Container, { className: "mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg", children: [
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(Heading, { className: "text-2xl font-bold text-gray-900", children: "Chào mừng đến với Sport Store!" }),
        /* @__PURE__ */ jsxs(Text, { className: "text-gray-600", children: [
          "Xin chào ",
          /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: fullname }),
          ","
        ] }),
        /* @__PURE__ */ jsx(Text, { className: "mt-2 text-gray-600", children: "Chúng tôi rất vui mừng khi bạn đã tham gia cùng chúng tôi. Tài khoản của bạn đã được tạo thành công." })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 rounded-lg bg-blue-50 p-6", children: [
        /* @__PURE__ */ jsx(Heading, { className: "mb-4 text-lg font-semibold text-blue-800", children: "Thông tin tài khoản của bạn" }),
        /* @__PURE__ */ jsxs(Section, { style: { background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 4px #e5e7eb" }, children: [
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "Mã khách hàng" }),
          /* @__PURE__ */ jsx(Text, { className: "mb-4 font-semibold text-gray-800", style: { fontWeight: "bold" }, children: customId }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "Email" }),
          /* @__PURE__ */ jsx(Text, { className: "font-semibold text-gray-800", style: { fontWeight: "bold" }, children: email }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "Ngày đăng ký" }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 font-semibold text-gray-800", style: { fontWeight: "bold" }, children: registerDate })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 text-center", children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            href: "https://www.vjusport.com/auth/login",
            className: "inline-block rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white shadow-sm hover:bg-blue-700",
            children: "Đăng nhập ngay"
          }
        ),
        /* @__PURE__ */ jsx(Text, { className: "mt-6 text-sm text-gray-600", children: "Nếu bạn có bất kỳ câu hỏi hoặc cần hỗ trợ, hãy liên hệ với chúng tôi qua email: support@sportstore.com" })
      ] }),
      /* @__PURE__ */ jsx(Hr, { className: "my-8 border-gray-200" }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(Text, { className: "text-xs text-gray-500", children: "\xA9 2025 Sport Store. Tất cả các quyền được bảo lưu." }),
        /* @__PURE__ */ jsx(Text, { className: "mt-1 text-xs text-gray-500", children: "\u0110ịa chỉ: 97 Đường Võ Văn Tần, Phường 6, Quận 3, Thành phố Hồ Chí Minh" }),
        /* @__PURE__ */ jsx(Text, { className: "mt-4 text-xs text-blue-700 font-medium", children: "Cam kết bảo mật: Sport Store cam kết bảo vệ tuyệt đối thông tin cá nhân và tài khoản của bạn. Mọi dữ liệu đều được mã hóa và không chia sẻ cho bất kỳ ai khác." })
      ] })
    ] }) }) })
  ] });
};
var RegisterConfirmation_default = RegisterConfirmation;
export {
  RegisterConfirmation_default as default
};
