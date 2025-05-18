// src/email-templates/AdminCouponUsedEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var AdminCouponUsedEmail = ({ couponCode, customerName, orderId, time }) => /* @__PURE__ */ jsxs(Html, { children: [
  /* @__PURE__ */ jsx(Head, {}),
  /* @__PURE__ */ jsxs(Preview, { children: [
    "M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng: ",
    couponCode
  ] }),
  /* @__PURE__ */ jsx(Body, { style: { background: "#f9f9f9", fontFamily: "Arial, sans-serif" }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }, children: [
    /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 12, padding: "24px 0 12px 0", marginBottom: 24, textAlign: "center" }, children: [
      /* @__PURE__ */ jsx("img", { src: "https://sport-store.vercel.app/vju-logo-main.png", width: "140", alt: "Sport Store Logo", style: { display: "block", margin: "0 auto 8px auto" } }),
      /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 22, margin: 0 }, children: "M\xE3 gi\u1EA3m gi\xE1 \u0111\xE3 \u0111\u01B0\u1EE3c s\u1EED d\u1EE5ng" })
    ] }),
    /* @__PURE__ */ jsxs(Section, { style: { border: "2px solid #2563eb", borderRadius: 10, boxShadow: "0 2px 8px 0 #2563eb22", background: "#f3f4f6", padding: 20, textAlign: "center" }, children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        "M\xE3 coupon: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: couponCode })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Kh\xE1ch h\xE0ng: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: customerName })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "\u0110\u01A1n h\xE0ng li\xEAn quan: ",
        orderId
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Th\u1EDDi gian s\u1EED d\u1EE5ng: ",
        time
      ] })
    ] }),
    /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
    /* @__PURE__ */ jsxs(Section, { style: { textAlign: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "Vui l\xF2ng ki\u1EC3m tra l\u1ECBch s\u1EED s\u1EED d\u1EE5ng m\xE3 gi\u1EA3m gi\xE1 tr\xEAn h\u1EC7 th\u1ED1ng." }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "M\u1ECDi th\u1EAFc m\u1EAFc li\xEAn h\u1EC7: support@sportstore.com" })
    ] })
  ] }) })
] });
var AdminCouponUsedEmail_default = AdminCouponUsedEmail;
export {
  AdminCouponUsedEmail_default as default
};
