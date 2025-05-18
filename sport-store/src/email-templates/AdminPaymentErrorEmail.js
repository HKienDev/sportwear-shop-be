// src/email-templates/AdminPaymentErrorEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var AdminPaymentErrorEmail = ({ orderId, customerName, error, time }) => /* @__PURE__ */ jsxs(Html, { children: [
  /* @__PURE__ */ jsx(Head, {}),
  /* @__PURE__ */ jsxs(Preview, { children: [
    "L\u1ED7i thanh to\xE1n \u0111\u01A1n h\xE0ng #",
    orderId
  ] }),
  /* @__PURE__ */ jsx(Body, { style: { background: "#f9f9f9", fontFamily: "Arial, sans-serif" }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }, children: [
    /* @__PURE__ */ jsxs(Section, { style: { textAlign: "center" }, children: [
      /* @__PURE__ */ jsx(Heading, { children: "L\u1ED7i thanh to\xE1n \u0111\u01A1n h\xE0ng" }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "\u0110\u01A1n h\xE0ng ",
        /* @__PURE__ */ jsxs(Text, { style: { fontWeight: "bold", display: "inline" }, children: [
          "#",
          orderId
        ] }),
        " c\u1EE7a kh\xE1ch h\xE0ng ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: customerName }),
        " g\u1EB7p l\u1ED7i khi thanh to\xE1n."
      ] })
    ] }),
    /* @__PURE__ */ jsxs(Section, { children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "M\xF4 t\u1EA3 l\u1ED7i:" }),
        " ",
        error
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "Th\u1EDDi gian:" }),
        " ",
        time
      ] })
    ] }),
    /* @__PURE__ */ jsx(Hr, {}),
    /* @__PURE__ */ jsxs(Section, { children: [
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "Vui l\xF2ng ki\u1EC3m tra v\xE0 x\u1EED l\xFD tr\xEAn h\u1EC7 th\u1ED1ng qu\u1EA3n tr\u1ECB." }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "M\u1ECDi th\u1EAFc m\u1EAFc li\xEAn h\u1EC7: support@sportstore.com" })
    ] })
  ] }) })
] });
var AdminPaymentErrorEmail_default = AdminPaymentErrorEmail;
export {
  AdminPaymentErrorEmail_default as default
};
