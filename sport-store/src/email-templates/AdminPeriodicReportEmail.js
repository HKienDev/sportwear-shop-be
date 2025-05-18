// src/email-templates/AdminPeriodicReportEmail.tsx
import { Html, Head, Preview, Body, Container, Section, Heading, Text, Hr } from "@react-email/components";
import { jsx, jsxs } from "react/jsx-runtime";
var AdminPeriodicReportEmail = ({ reportType, time, description }) => /* @__PURE__ */ jsxs(Html, { children: [
  /* @__PURE__ */ jsx(Head, {}),
  /* @__PURE__ */ jsxs(Preview, { children: [
    "B\xE1o c\xE1o \u0111\u1ECBnh k\u1EF3: ",
    reportType
  ] }),
  /* @__PURE__ */ jsx(Body, { style: { background: "#f9f9f9", fontFamily: "Arial, sans-serif" }, children: /* @__PURE__ */ jsxs(Container, { style: { maxWidth: 600, margin: "0 auto", background: "#fff", borderRadius: 8, padding: 24 }, children: [
    /* @__PURE__ */ jsxs(Section, { style: { background: "linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)", borderRadius: 12, padding: "24px 0 12px 0", marginBottom: 24, textAlign: "center" }, children: [
      /* @__PURE__ */ jsx("img", { src: "https://sport-store.vercel.app/vju-logo-main.png", width: "140", alt: "Sport Store Logo", style: { display: "block", margin: "0 auto 8px auto" } }),
      /* @__PURE__ */ jsx(Heading, { style: { color: "#fff", fontWeight: 700, fontSize: 22, margin: 0 }, children: "B\xE1o c\xE1o \u0111\u1ECBnh k\u1EF3 h\u1EC7 th\u1ED1ng" })
    ] }),
    /* @__PURE__ */ jsxs(Section, { style: { border: "2px solid #2563eb", borderRadius: 10, boxShadow: "0 2px 8px 0 #2563eb22", background: "#f3f4f6", padding: 20, textAlign: "center" }, children: [
      /* @__PURE__ */ jsxs(Text, { children: [
        "Lo\u1EA1i b\xE1o c\xE1o: ",
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: reportType })
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        "Th\u1EDDi gian: ",
        time
      ] }),
      /* @__PURE__ */ jsxs(Text, { children: [
        /* @__PURE__ */ jsx(Text, { style: { fontWeight: "bold", display: "inline" }, children: "M\xF4 t\u1EA3:" }),
        " ",
        description
      ] })
    ] }),
    /* @__PURE__ */ jsx(Hr, { style: { borderTop: "1.5px solid #e5e7eb", margin: "32px 0 16px 0" } }),
    /* @__PURE__ */ jsxs(Section, { style: { textAlign: "center" }, children: [
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "Vui l\xF2ng ki\u1EC3m tra chi ti\u1EBFt b\xE1o c\xE1o tr\xEAn h\u1EC7 th\u1ED1ng qu\u1EA3n tr\u1ECB." }),
      /* @__PURE__ */ jsx(Text, { style: { fontSize: 12, color: "#888" }, children: "M\u1ECDi th\u1EAFc m\u1EAFc li\xEAn h\u1EC7: support@sportstore.com" })
    ] })
  ] }) })
] });
var AdminPeriodicReportEmail_default = AdminPeriodicReportEmail;
export {
  AdminPeriodicReportEmail_default as default
};
