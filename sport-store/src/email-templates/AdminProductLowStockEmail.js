/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

// src/email-templates/AdminProductLowStockEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var AdminProductLowStockEmail = ({ productName, productId, quantity, time }) => /* @__PURE__ */ jsxs(Html, { children: [
  /* @__PURE__ */ jsx(Head, {}),
  /* @__PURE__ */ jsxs(Preview, { children: [
    "C\u1EA3nh b\xE1o s\u1EA3n ph\u1EA9m s\u1EAFp h\u1EBFt: ",
    productName
  ] }),
  /* @__PURE__ */ jsx(Body, { style: { background: "#f9f9f9", fontFamily: "Arial, sans-serif" }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }, children: [
    /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 12, padding: "24px 0 12px 0", marginBottom: 24, textAlign: "center" }, children: [
      /* @__PURE__ */ jsx("img", { src: "https://sport-store.vercel.app/vju-logo-main.png", width: "140", alt: "Sport Store Logo", style: { display: "block", margin: "0 auto 8px auto" } }),
      /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 22, margin: 0 }, children: "C\u1EA3nh b\xE1o s\u1EA3n ph\u1EA9m s\u1EAFp h\u1EBFt h\xE0ng" })
    ] }),
    /* @__PURE__ */ jsxs(Section, { style: { border: "2px solid #f59e42", borderRadius: 10, boxShadow: "0 2px 8px 0 #f59e4222", background: "#fff7ed", padding: 20, textAlign: "center" }, children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        "S\u1EA3n ph\u1EA9m: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: productName }),
        " (M\xE3: ",
        productId,
        ")"
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "S\u1ED1 l\u01B0\u1EE3ng c\xF2n l\u1EA1i: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: quantity })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Th\u1EDDi gian c\u1EA3nh b\xE1o: ",
        time
      ] })
    ] }),
    /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
    /* @__PURE__ */ jsxs(Section, { style: { textAlign: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "Vui l\xF2ng ki\u1EC3m tra kho v\xE0 nh\u1EADp th\xEAm h\xE0ng n\u1EBFu c\u1EA7n." }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "M\u1ECDi th\u1EAFc m\u1EAFc li\xEAn h\u1EC7: support@sportstore.com" })
    ] })
  ] }) })
] });
var AdminProductLowStockEmail_default = AdminProductLowStockEmail;
export {
  AdminProductLowStockEmail_default as default
};
