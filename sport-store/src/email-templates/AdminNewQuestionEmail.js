/* eslint-disable @typescript-eslint/no-unused-vars */
import * as React from "react";

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
import { jsx, jsxs } from "react/jsx-runtime";

const AdminNewQuestionEmail = ({
  userName,
  productName,
  productSku,
  question,
  questionUrl
}) => {
  return jsxs(Html, { children: [
    jsx(Head, {}),
    jsxs(Preview, { children: [
      "Câu hỏi mới từ ",
      userName,
      " cho sản phẩm ",
      productName
    ] }),
    jsxs(Body, { style: main, children: jsxs(Container, { style: container, children: [
      jsxs(Section, { style: header, children: [
        jsx(Heading, { style: h1, children: "Câu hỏi mới!" }),
        jsxs(Text, { style: headerText, children: [
          "User ",
          userName,
          " vừa đặt câu hỏi cho sản phẩm ",
          productName
        ] })
      ] }),
              jsxs(Section, { style: content, children: [
          jsx(Heading, { style: h2, children: "Thông tin sản phẩm" }),
          jsxs(Text, { style: productInfo, children: [
            jsx("strong", { children: "Sản phẩm:" }),
            " ",
            productName,
            " (",
            productSku.split('-').pop(), // Extract last part of SKU
            ")"
          ] }),
        jsx(Hr, { style: divider }),
        jsx(Heading, { style: h2, children: "Câu hỏi từ user" }),
        jsxs(Text, { style: questionText, children: [
          jsx("strong", { children: "Nội dung câu hỏi:" }),
          " ",
          question
        ] })
      ] }),
              jsxs(Section, { style: footer, children: [
          jsxs(Text, { style: footerText, children: [
            "Xem sản phẩm tại: ",
            jsx(Link, { href: `https://vjusport.com/products/${productSku}`, style: link, children: productName })
          ] }),
          jsx(Text, { style: footerText, children: "Email này được gửi tự động từ hệ thống Sport Store!" })
        ] })
    ] }) })
  ] });
};

const main = {
  backgroundColor: "#f4f7fa",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const container = {
  maxWidth: "650px",
  margin: "32px auto",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 4px 24px #e0e7ef",
  padding: 0,
  overflow: "hidden",
};

const header = {
  background: "linear-gradient(90deg, #7c3aed 0%, #a855f7 100%)",
  padding: "32px 0 16px 0",
  textAlign: "center",
};

const h1 = {
  color: "#fff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "1px",
};

const headerText = {
  color: "#e9d5ff",
  fontSize: "16px",
  margin: "8px 0 0 0",
};

const content = {
  padding: "24px 32px",
};

const h2 = {
  fontSize: "18px",
  color: "#222",
  fontWeight: "700",
  margin: "0 0 12px 0",
  borderLeft: "4px solid #7c3aed",
  paddingLeft: "12px",
};

const productInfo = {
  fontSize: "16px",
  color: "#333",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  border: "1px solid #e9ecef",
};

const questionText = {
  fontSize: "16px",
  color: "#1f2937",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
  padding: "16px",
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontStyle: "italic",
};

const divider = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footer = {
  padding: "24px 32px",
  backgroundColor: "#f8f9fa",
  borderTop: "1px solid #e9ecef",
};

const footerText = {
  fontSize: "14px",
  color: "#666",
  margin: "8px 0",
  textAlign: "center",
};

const link = {
  color: "#7c3aed",
  textDecoration: "underline",
};

export default AdminNewQuestionEmail; 