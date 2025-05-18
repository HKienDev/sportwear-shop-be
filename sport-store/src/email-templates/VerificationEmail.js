// src/email-templates/VerificationEmail.tsx
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
var VerificationEmail = ({
  otp,
  name = "Kh\xE1ch h\xE0ng"
}) => {
  return /* @__PURE__ */ jsxs(Html, { children: [
    /* @__PURE__ */ jsx(Head, {}),
    /* @__PURE__ */ jsx(Preview, { children: "M\xE3 OTP x\xE1c th\u1EF1c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n t\u1EA1i Sport Store" }),
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
        /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 26, margin: 0 }, children: "X\xE1c th\u1EF1c t\xE0i kho\u1EA3n" })
      ] }),
      /* @__PURE__ */ jsxs(Section, { className: "text-center", children: [
        /* @__PURE__ */ jsxs(Text, { className: "text-gray-600", children: [
          "Xin ch\xE0o ",
          /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: name }),
          ","
        ] }),
        /* @__PURE__ */ jsx(Text, { className: "mt-2 text-gray-600", children: "C\u1EA3m \u01A1n b\u1EA1n \u0111\xE3 \u0111\u0103ng k\xFD t\xE0i kho\u1EA3n t\u1EA1i Sport Store. Vui l\xF2ng s\u1EED d\u1EE5ng m\xE3 OTP d\u01B0\u1EDBi \u0111\xE2y \u0111\u1EC3 x\xE1c th\u1EF1c t\xE0i kho\u1EA3n c\u1EE7a b\u1EA1n." })
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
      /* @__PURE__ */ jsx(Section, { className: "mt-8 rounded-lg bg-yellow-50 p-4", children: /* @__PURE__ */ jsxs(Text, { className: "text-sm text-yellow-700", children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "L\u01B0u \xFD:" }),
        " N\u1EBFu b\u1EA1n kh\xF4ng y\xEAu c\u1EA7u m\xE3 n\xE0y, vui l\xF2ng b\u1ECF qua email n\xE0y ho\u1EB7c li\xEAn h\u1EC7 v\u1EDBi ch\xFAng t\xF4i n\u1EBFu b\u1EA1n c\xF3 b\u1EA5t k\u1EF3 th\u1EAFc m\u1EAFc n\xE0o."
      ] }) }),
      /* @__PURE__ */ jsx(Section, { className: "mt-8 text-center", children: /* @__PURE__ */ jsxs(Text, { className: "text-sm text-gray-600", children: [
        "C\u1EA7n h\u1ED7 tr\u1EE3? H\xE3y li\xEAn h\u1EC7 v\u1EDBi ch\xFAng t\xF4i qua email: ",
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
var VerificationEmail_default = VerificationEmail;
export {
  VerificationEmail_default as default
};
