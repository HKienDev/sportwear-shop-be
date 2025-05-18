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
    /* @__PURE__ */ jsx(Preview, { children: "Ch\xE0o m\u1EEBng b\u1EA1n \u0111\u1EBFn v\u1EDBi Sport Store! X\xE1c nh\u1EADn \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n" }),
    /* @__PURE__ */ jsx(Tailwind, { children: /* @__PURE__ */ jsx(Body, { className: "bg-gray-100 font-sans", children: /* @__PURE__ */ jsxs(Container, { className: "mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg", children: [
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(
          Img,
          {
            src: "/vju-logo-main.png",
            width: "160",
            height: "auto",
            alt: "Sport Store Logo",
            className: "mx-auto mb-6"
          }
        ),
        /* @__PURE__ */ jsx(Heading, { className: "text-2xl font-bold text-gray-900", children: "Ch\xE0o m\u1EEBng \u0111\u1EBFn v\u1EDBi Sport Store!" }),
        /* @__PURE__ */ jsxs(Text, { className: "text-gray-600", children: [
          "Xin ch\xE0o ",
          /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: fullname }),
          ","
        ] }),
        /* @__PURE__ */ jsx(Text, { className: "mt-2 text-gray-600", children: "Ch\xFAng t\xF4i r\u1EA5t vui m\u1EEBng khi b\u1EA1n \u0111\xE3 tham gia c\xF9ng ch\xFAng t\xF4i. T\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c t\u1EA1o th\xE0nh c\xF4ng." })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 rounded-lg bg-blue-50 p-6", children: [
        /* @__PURE__ */ jsx(Heading, { className: "mb-4 text-lg font-semibold text-blue-800", children: "Th\xF4ng tin t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n" }),
        /* @__PURE__ */ jsxs(Section, { style: { background: "#fff", borderRadius: 8, padding: 16, boxShadow: "0 1px 4px #e5e7eb" }, children: [
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "M\xE3 kh\xE1ch h\xE0ng" }),
          /* @__PURE__ */ jsx(Text, { className: "mb-4 font-semibold text-gray-800", style: { fontWeight: "bold" }, children: customId }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "Email" }),
          /* @__PURE__ */ jsx(Text, { className: "font-semibold text-gray-800", style: { fontWeight: "bold" }, children: email }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 text-sm font-medium text-gray-500", children: "Ng\xE0y \u0111\u0103ng k\xFD" }),
          /* @__PURE__ */ jsx(Text, { className: "mb-2 font-semibold text-gray-800", style: { fontWeight: "bold" }, children: registerDate })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 text-center", children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            href: "https://www.vjusport.com/auth/login",
            className: "inline-block rounded-lg bg-blue-600 px-6 py-3 text-center font-medium text-white shadow-sm hover:bg-blue-700",
            children: "\u0110\u0103ng nh\u1EADp ngay"
          }
        ),
        /* @__PURE__ */ jsx(Text, { className: "mt-6 text-sm text-gray-600", children: "N\u1EBFu b\u1EA1n c\xF3 b\u1EA5t k\u1EF3 c\xE2u h\u1ECFi ho\u1EB7c c\u1EA7n h\u1ED7 tr\u1EE3, h\xE3y li\xEAn h\u1EC7 v\u1EDBi ch\xFAng t\xF4i qua email: support@sportstore.com" })
      ] }),
      /* @__PURE__ */ jsx(Hr, { className: "my-8 border-gray-200" }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(Text, { className: "text-xs text-gray-500", children: "\xA9 2025 Sport Store. T\u1EA5t c\u1EA3 c\xE1c quy\u1EC1n \u0111\u01B0\u1EE3c b\u1EA3o l\u01B0u." }),
        /* @__PURE__ */ jsx(Text, { className: "mt-1 text-xs text-gray-500", children: "\u0110\u1ECBa ch\u1EC9: 97 \u0110\u01B0\u1EDDng V\xF5 V\u0103n T\u1EA7n, Ph\u01B0\u1EDDng 6, Qu\u1EADn 3, Th\xE0nh ph\u1ED1 H\u1ED3 Ch\xED Minh" }),
        /* @__PURE__ */ jsx(Text, { className: "mt-4 text-xs text-blue-700 font-medium", children: "Cam k\u1EBFt b\u1EA3o m\u1EADt: Sport Store cam k\u1EBFt b\u1EA3o v\u1EC7 tuy\u1EC7t \u0111\u1ED1i th\xF4ng tin c\xE1 nh\xE2n v\xE0 t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n. M\u1ECDi d\u1EEF li\u1EC7u \u0111\u1EC1u \u0111\u01B0\u1EE3c m\xE3 h\xF3a v\xE0 kh\xF4ng chia s\u1EBB cho b\xEAn th\u1EE9 ba." })
      ] })
    ] }) }) })
  ] });
};
var RegisterConfirmation_default = RegisterConfirmation;
export {
  RegisterConfirmation_default as default
};
