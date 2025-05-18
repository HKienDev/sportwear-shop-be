// src/email-templates/AdminNewUserEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var AdminNewUserEmail = ({ userName, email, time }) => /* @__PURE__ */ jsxs(Html, { children: [
  /* @__PURE__ */ jsx(Head, {}),
  /* @__PURE__ */ jsxs(Preview, { children: [
    "Ng\u01B0\u1EDDi d\xF9ng m\u1EDBi \u0111\u0103ng k\xFD: ",
    userName
  ] }),
  /* @__PURE__ */ jsx(Body, { style: { background: "#f9f9f9", fontFamily: "Arial, sans-serif" }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }, children: [
    /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 12, padding: "24px 0 12px 0", marginBottom: 24, textAlign: "center" }, children: [
      /* @__PURE__ */ jsx("img", { src: "https://sport-store.vercel.app/vju-logo-main.png", width: "140", alt: "Sport Store Logo", style: { display: "block", margin: "0 auto 8px auto" } }),
      /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 22, margin: 0 }, children: "Ng\u01B0\u1EDDi d\xF9ng m\u1EDBi \u0111\u0103ng k\xFD" })
    ] }),
    /* @__PURE__ */ jsxs(Section, { style: { border: "2px solid #2563eb", borderRadius: 10, boxShadow: "0 2px 8px 0 #2563eb22", background: "#f3f4f6", padding: 20, textAlign: "center" }, children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        "T\xEAn: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: userName })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Email: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: email })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Th\u1EDDi gian \u0111\u0103ng k\xFD: ",
        time
      ] })
    ] }),
    /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
    /* @__PURE__ */ jsxs(Section, { style: { textAlign: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "Vui l\xF2ng ki\u1EC3m tra v\xE0 x\xE1c th\u1EF1c t\xE0i kho\u1EA3n n\u1EBFu c\u1EA7n." }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "M\u1ECDi th\u1EAFc m\u1EAFc li\xEAn h\u1EC7: support@sportstore.com" })
    ] })
  ] }) })
] });
var AdminNewUserEmail_default = AdminNewUserEmail;
export {
  AdminNewUserEmail_default as default
};
