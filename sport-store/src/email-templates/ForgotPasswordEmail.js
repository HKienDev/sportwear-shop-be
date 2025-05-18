/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

// src/email-templates/ForgotPasswordEmail.tsx
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
var ForgotPasswordEmail = ({
  otp,
  name = "Kh\xE1ch h\xE0ng"
}) => {
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsx(Preview, { children: "M\xE3 OTP \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u t\u1EA1i Sport Store" }),
    /* @__PURE__ */ jsx(Tailwind, { children: /* @__PURE__ */ jsx(Body, { className: "bg-gray-100 font-sans", children: /* @__PURE__ */ jsxs(Container, { className: "mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg", children: [
      /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 12, padding: "24px 0 12px 0", marginBottom: 24 }, children: [
        /* @__PURE__ */ jsx(
          Img,
          {
            src: "https://sport-store.vercel.app/vju-logo-main.png",
            width: "160",
            height: "auto",
            alt: "Sport Store Logo",
            className: "mx-auto mb-2"
          }
        ),
        /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 26, margin: 0 }, children: "Y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u" })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsxs(Text, { className: "text-gray-600", children: [
          "Xin ch\xE0o ",
          /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: name }),
          ","
        ] }),
        /* @__PURE__ */ jsx(Text, { className: "mt-2 text-gray-600", children: "Ch\xFAng t\xF4i \u0111\xE3 nh\u1EADn \u0111\u01B0\u1EE3c y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u cho t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n. Vui l\xF2ng s\u1EED d\u1EE5ng m\xE3 OTP d\u01B0\u1EDBi \u0111\xE2y \u0111\u1EC3 ho\xE0n t\u1EA5t qu\xE1 tr\xECnh \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u." })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 text-center", children: [
        /* @__PURE__ */ jsx(Section, { style: {
          borderRadius: 10,
          background: "#f3f4f6",
          padding: "18px 0",
          fontSize: 28,
          fontWeight: "bold",
          letterSpacing: 6,
          display: "inline-block",
          width: "auto",
          margin: "0 auto",
          border: "2px solid #2563eb",
          boxShadow: "0 2px 8px 0 #2563eb22"
        }, children: /* @__PURE__ */ jsx(Text, { style: { fontSize: 28, fontWeight: "bold", letterSpacing: 6, color: "#2563eb" }, children: otp }) }),
        /* @__PURE__ */ jsx(Text, { className: "mt-4 text-sm text-gray-600", children: "M\xE3 n\xE0y s\u1EBD h\u1EBFt h\u1EA1n sau 10 ph\xFAt." })
      ] }),
      /* @__PURE__ */ jsx(Section, { className: "mt-8 rounded-lg bg-red-50 p-4", children: /* @__PURE__ */ jsxs(Text, { className: "text-sm text-red-700", children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "C\u1EA3nh b\xE1o b\u1EA3o m\u1EADt:" }),
        " N\u1EBFu b\u1EA1n kh\xF4ng y\xEAu c\u1EA7u \u0111\u1EB7t l\u1EA1i m\u1EADt kh\u1EA9u, h\xE3y b\u1ECF qua email n\xE0y v\xE0 xem x\xE9t vi\u1EC7c \u0111\u1ED5i m\u1EADt kh\u1EA9u t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n ngay l\u1EADp t\u1EE9c."
      ] }) }),
      /* @__PURE__ */ jsx(Section, { className: "mt-8 text-center", children: /* @__PURE__ */ jsxs(Text, { className: "text-sm text-gray-600", children: [
        "N\u1EBFu b\u1EA1n c\u1EA7n h\u1ED7 tr\u1EE3, h\xE3y li\xEAn h\u1EC7 v\u1EDBi ch\xFAng t\xF4i qua email: ",
        /* @__PURE__ */ jsx(Link, { href: "mailto:support@sportstore.com", className: "text-blue-600 underline", children: "support@sportstore.com" })
      ] }) }),
      /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(Text, { className: "text-xs text-gray-500", children: "\xA9 2025 Sport Store. T\u1EA5t c\u1EA3 c\xE1c quy\u1EC1n \u0111\u01B0\u1EE3c b\u1EA3o l\u01B0u." }),
        /* @__PURE__ */ jsx(Text, { className: "mt-1 text-xs text-gray-500", children: "\u0110\u1ECBa ch\u1EC9: 97 \u0110\u01B0\u1EDDng V\xF5 V\u0103n T\u1EA7n, Ph\u01B0\u1EDDng 6, Qu\u1EADn 3, Th\xE0nh ph\u1ED1 H\u1ED3 Ch\xED Minh" })
      ] })
    ] }) }) })
  ] });
};
var ForgotPasswordEmail_default = ForgotPasswordEmail;
export {
  ForgotPasswordEmail_default as default
};
