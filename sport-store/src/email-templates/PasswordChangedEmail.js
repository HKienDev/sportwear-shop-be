/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

// src/email-templates/PasswordChangedEmail.tsx
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
var PasswordChangedEmail = ({
  name = "Kh\xE1ch h\xE0ng",
  time = (/* @__PURE__ */ new Date()).toLocaleString("vi-VN")
}) => {
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsx(Preview, { children: "M\u1EADt kh\u1EA9u c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i th\xE0nh c\xF4ng" }),
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
        /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 26, margin: 0 }, children: "M\u1EADt kh\u1EA9u \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i" })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsxs(Text, { className: "text-gray-600", children: [
          "Xin ch\xE0o ",
          /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: name }),
          ","
        ] }),
        /* @__PURE__ */ jsxs(Text, { className: "mt-2 text-gray-600", children: [
          "Ch\xFAng t\xF4i x\xE1c nh\u1EADn r\u1EB1ng m\u1EADt kh\u1EA9u t\xE0i kho\u1EA3n Sport Store c\u1EE7a b\u1EA1n \u0111\xE3 \u0111\u01B0\u1EE3c thay \u0111\u1ED5i th\xE0nh c\xF4ng v\xE0o l\xFAc ",
          time,
          "."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 rounded-lg bg-green-50 p-6", style: { border: "2px solid #22c55e", boxShadow: "0 2px 8px 0 #22c55e22" }, children: [
        /* @__PURE__ */ jsx(Text, { className: "text-center text-green-700", children: /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "Thay \u0111\u1ED5i m\u1EADt kh\u1EA9u th\xE0nh c\xF4ng!" }) }),
        /* @__PURE__ */ jsx(Text, { className: "mt-2 text-center text-sm text-green-700", children: "B\xE2y gi\u1EDD b\u1EA1n c\xF3 th\u1EC3 \u0111\u0103ng nh\u1EADp b\u1EB1ng m\u1EADt kh\u1EA9u m\u1EDBi c\u1EE7a m\xECnh." })
      ] }),
      /* @__PURE__ */ jsx(Section, { className: "mt-8 rounded-lg bg-blue-50 p-4", children: /* @__PURE__ */ jsxs(Text, { className: "text-sm text-blue-700", children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "L\u1EDDi khuy\xEAn b\u1EA3o m\u1EADt:" }),
        " Lu\xF4n ch\u1ECDn m\u1EADt kh\u1EA9u m\u1EA1nh v\xE0 kh\xF4ng s\u1EED d\u1EE5ng l\u1EA1i m\u1EADt kh\u1EA9u tr\xEAn nhi\u1EC1u trang web kh\xE1c nhau."
      ] }) }),
      /* @__PURE__ */ jsxs(Section, { className: "mt-8 text-center", children: [
        /* @__PURE__ */ jsx(
          Link,
          {
            href: "https://sport-store.vercel.app/auth/login",
            style: {
              display: "inline-block",
              borderRadius: 8,
              background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)",
              padding: "14px 36px",
              fontWeight: 600,
              fontSize: 16,
              color: "#fff",
              boxShadow: "0 2px 8px 0 #2563eb22",
              textDecoration: "none",
              margin: "0 auto"
            },
            children: "\u0110\u0103ng nh\u1EADp ngay"
          }
        ),
        /* @__PURE__ */ jsxs(Text, { className: "mt-6 text-sm text-gray-600", children: [
          "N\u1EBFu b\u1EA1n kh\xF4ng th\u1EF1c hi\u1EC7n thay \u0111\u1ED5i n\xE0y, vui l\xF2ng li\xEAn h\u1EC7 ngay v\u1EDBi ch\xFAng t\xF4i qua email: ",
          /* @__PURE__ */ jsx(Link, { href: "mailto:support@sportstore.com", className: "text-blue-600 underline", children: "support@sportstore.com" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsx(Text, { className: "text-xs text-gray-500", children: "\xA9 2025 Sport Store. T\u1EA5t c\u1EA3 c\xE1c quy\u1EC1n \u0111\u01B0\u1EE3c b\u1EA3o l\u01B0u." }),
        /* @__PURE__ */ jsx(Text, { className: "mt-1 text-xs text-gray-500", children: "\u0110\u1ECBa ch\u1EC9: 97 \u0110\u01B0\u1EDDng V\xF5 V\u0103n T\u1EA7n, Ph\u01B0\u1EDDng 6, Qu\u1EADn 3, Th\xE0nh ph\u1ED1 H\u1ED3 Ch\xED Minh" })
      ] })
    ] }) }) })
  ] });
};
var PasswordChangedEmail_default = PasswordChangedEmail;
export {
  PasswordChangedEmail_default as default
};
